function handleJumpToToday() {
    const now = new Date();
    state.calendarYear = now.getFullYear();
    state.calendarMonth = now.getMonth();
    state.dataViewYear = now.getFullYear();
    state.dataViewMonth = now.getMonth();
    updateDataViewHeader();

    if (isDataViewActive()) {
        updateDataList();
        showToast(`Daftar digeser ke ${formatMonthLabel(state.dataViewMonth, state.dataViewYear)}.`);
        return;
    }

    renderCalendar(state.allCutiData, state.calendarYear, state.calendarMonth, true);
    renderHeroStats();
    showToast("Kalender difokuskan ke hari ini.");
}

function isMobileViewport() {
    return window.matchMedia("(max-width: 768px)").matches;
}

function updateMobileFilterToggleState() {
    if (!dom.dataFilterToggleButton || !dom.dataToolbarControls) {
        return;
    }

    if (!isMobileViewport()) {
        dom.dataToolbarControls.classList.remove("is-collapsed");
        dom.dataFilterToggleButton.setAttribute("aria-expanded", "true");
        dom.dataFilterToggleButton.innerHTML = `
            <i class="ph-bold ph-sliders-horizontal"></i>
            Filter & Cari
        `;
        return;
    }

    const activeFilterCount = getActiveFilters().length;
    const isCollapsed = dom.dataToolbarControls.classList.contains("is-collapsed");
    dom.dataFilterToggleButton.setAttribute("aria-expanded", String(!isCollapsed));
    dom.dataFilterToggleButton.innerHTML = `
        <i class="ph-bold ${isCollapsed ? "ph-sliders-horizontal" : "ph-x"}"></i>
        Filter & Cari${activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
    `;
}

function toggleMobileFilters(forceOpen = null) {
    if (!dom.dataToolbarControls || !isMobileViewport()) {
        return;
    }

    const shouldOpen = typeof forceOpen === "boolean"
        ? forceOpen
        : dom.dataToolbarControls.classList.contains("is-collapsed");

    dom.dataToolbarControls.classList.toggle("is-collapsed", !shouldOpen);
    updateMobileFilterToggleState();
}

function switchTab(viewId, options = {}) {
    const { autoSelectToday = false, preserveSelectedDate = true } = options;

    document.querySelectorAll(".tab-button").forEach((button) => button.classList.remove("active"));
    document.querySelectorAll(".content-view").forEach((view) => view.classList.add("hidden"));

    if (viewId === "data-view") {
        dom.tabData.classList.add("active");
        dom.dataView.classList.remove("hidden");
        updateDataViewHeader();
        updateDataList();
        updateMobileFilterToggleState();
        return;
    }

    dom.tabCalendar.classList.add("active");
    dom.calendarView.classList.remove("hidden");
    const selectedDate = preserveSelectedDate && state.selectedDayElement
        ? state.selectedDayElement.dataset.date
        : null;
    renderCalendar(state.allCutiData, state.calendarYear, state.calendarMonth, autoSelectToday, selectedDate);
    renderHeroStats();
}

function mapCutiRecord(cuti) {
    const user = cuti.users || {};
    const tanggalCutiList = parseDateList(cuti.list_tanggal_cuti);
    const jenisCuti = normalizeText(cuti.jenis_cuti || cuti.alasan_cuti, "Tidak Ditentukan");
    const tanggalPengajuan = normalizeDateString(cuti.tanggal_pengajuan) || normalizeDateString(cuti.created_at);

    return {
        id: cuti.id,
        nama: normalizeText(cuti.nama || user.name, "Nama Tidak Diketahui"),
        jenisCuti,
        alasanCuti: normalizeText(cuti.alasan_cuti, ""),
        lamaHari: Number(cuti.lama_cuti) || tanggalCutiList.length || 0,
        tanggalPengajuan,
        tanggalCutiList,
        jabatan: normalizeText(user.jabatan, "N/A"),
        group: normalizeText(user.group, "-"),
        sisaCuti: typeof cuti.sisa_cuti === "number" ? cuti.sisa_cuti : null,
        userId: cuti.users_id,
        kunciCuti: cuti.kunci_cuti === true,
        urlTTD: normalizeText(cuti.url_ttd, "")
    };
}

async function fetchCutiData() {
    state.isLoading = true;
    state.fetchError = "";
    renderAppBanner();

    if (isDataViewActive()) {
        renderDataListSkeleton();
    }

    try {
        const { data, error } = await supabaseClient
            .from("cuti")
            .select(`
                id,
                created_at,
                lama_cuti,
                alasan_cuti,
                jenis_cuti,
                nama,
                list_tanggal_cuti,
                url_ttd,
                sisa_cuti,
                tanggal_pengajuan,
                kunci_cuti,
                users_id,
                users (
                    name,
                    jabatan,
                    nrp,
                    group
                )
            `)
            .order("tanggal_pengajuan", { ascending: false });

        if (error) {
            throw error;
        }

        state.allCutiData = (data || []).map(mapCutiRecord);
        populateFilters();
        setLastSync(new Date());
        return state.allCutiData;
    } catch (error) {
        console.error("Error mengambil data:", error.message);
        state.fetchError = error.message || "Terjadi kesalahan saat mengambil data.";
        showToast("Gagal mengambil data cuti.", "error");
        return [];
    } finally {
        state.isLoading = false;
        renderAppBanner();
    }
}

function refreshVisibleView(options = {}) {
    const { autoSelectToday = false, preserveSelectedDate = false } = options;

    if (isDataViewActive()) {
        updateDataViewHeader();
        updateDataList();
        return;
    }

    const preferredDate = preserveSelectedDate && state.selectedDayElement
        ? state.selectedDayElement.dataset.date
        : null;
    renderCalendar(state.allCutiData, state.calendarYear, state.calendarMonth, autoSelectToday, preferredDate);
    renderHeroStats();
}

function setupRealtimeListener() {
    if (realtimeChannel) {
        supabaseClient.removeChannel(realtimeChannel);
    }

    setRealtimeStatus("loading");

    realtimeChannel = supabaseClient
        .channel("public:cuti-dashboard")
        .on("postgres_changes", { event: "*", schema: "public", table: "cuti" }, async () => {
            showToast("Data cuti diperbarui.");
            await fetchCutiData();
            refreshVisibleView({ preserveSelectedDate: true });
        })
        .subscribe((status) => {
            if (status === "SUBSCRIBED") {
                setRealtimeStatus("online");
                return;
            }

            if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
                setRealtimeStatus("offline");
            }
        });
}

const debouncedUpdateDataList = debounce(() => updateDataList(), 250);

dom.dataSearch.addEventListener("input", debouncedUpdateDataList);
dom.filterGroup.addEventListener("change", () => updateDataList());
dom.filterJabatan.addEventListener("change", () => updateDataList());
dom.filterJenis.addEventListener("change", () => updateDataList());
dom.resetFiltersButton.addEventListener("click", resetDataFilters);
dom.jumpTodayButton.addEventListener("click", handleJumpToToday);
dom.dataFilterToggleButton.addEventListener("click", () => toggleMobileFilters());

dom.tabData.addEventListener("click", () => switchTab("data-view"));
dom.tabCalendar.addEventListener("click", () => switchTab("calendar-view", { preserveSelectedDate: true }));

document.getElementById("cal-prev").addEventListener("click", () => navigateCalendar(-1));
document.getElementById("cal-next").addEventListener("click", () => navigateCalendar(1));
document.getElementById("data-prev").addEventListener("click", () => navigateDataMonth(-1));
document.getElementById("data-next").addEventListener("click", () => navigateDataMonth(1));

dom.modalBackdrop.addEventListener("click", closeModal);
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !dom.modal.classList.contains("hidden")) {
        closeModal();
    }
});

window.closeModal = closeModal;

window.addEventListener("resize", () => {
    if (!dom.dataToolbarControls) {
        return;
    }

    if (isMobileViewport()) {
        dom.dataToolbarControls.classList.add("is-collapsed");
    } else {
        dom.dataToolbarControls.classList.remove("is-collapsed");
    }
    updateMobileFilterToggleState();
});

window.addEventListener("load", async () => {
    if (isMobileViewport() && dom.dataToolbarControls) {
        dom.dataToolbarControls.classList.add("is-collapsed");
    }
    updateLiveStatusBadge();
    updateDataViewHeader();
    renderHeroStatsSkeleton();
    resetDetailPanel();
    await fetchCutiData();
    switchTab("calendar-view", { autoSelectToday: true, preserveSelectedDate: false });
    setupRealtimeListener();
});
