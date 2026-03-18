function calculateDataSummary(data) {
    const totalPengajuan = data.length;
    const totalHari = data.reduce((sum, item) => sum + getDataViewLeaveDays(item), 0);
    const totalTerkunci = data.filter((item) => item.kunciCuti).length;
    const totalKaryawan = countUnique(data.map((item) => item.userId || item.nama));
    const totalGroup = countUnique(data.map((item) => item.group).filter((group) => group && group !== "-"));

    return {
        totalPengajuan,
        totalHari,
        totalTerkunci,
        totalKaryawan,
        totalGroup,
        rataRata: totalPengajuan > 0 ? totalHari / totalPengajuan : 0
    };
}

function renderDataSummary(data) {
    if (data.length === 0) {
        dom.dataSummary.innerHTML = `
            <div class="grid grid-cols-1 gap-3">
                <div class="month-summary-card">
                    <p class="month-summary-card-label">Ringkasan</p>
                    <p class="month-summary-card-value">0 data</p>
                    <p class="month-summary-card-desc">Tidak ada pengajuan cuti yang sesuai dengan bulan dan filter saat ini.</p>
                </div>
            </div>
        `;
        return;
    }

    const summary = calculateDataSummary(data);
    const averageLabel = Number.isInteger(summary.rataRata)
        ? summary.rataRata.toString()
        : summary.rataRata.toFixed(1);

    dom.dataSummary.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <div class="month-summary-card">
                <p class="month-summary-card-label">Pengajuan</p>
                <p class="month-summary-card-value">${summary.totalPengajuan}</p>
                <p class="month-summary-card-desc">${summary.totalTerkunci} data terkunci dalam daftar saat ini.</p>
            </div>
            <div class="month-summary-card">
                <p class="month-summary-card-label">Hari Cuti</p>
                <p class="month-summary-card-value">${summary.totalHari}</p>
                <p class="month-summary-card-desc">Akumulasi durasi cuti dari pengajuan yang lolos filter.</p>
            </div>
            <div class="month-summary-card">
                <p class="month-summary-card-label">Karyawan</p>
                <p class="month-summary-card-value">${summary.totalKaryawan}</p>
                <p class="month-summary-card-desc">${summary.totalGroup} group ikut terlibat pada bulan fokus ini.</p>
            </div>
            <div class="month-summary-card">
                <p class="month-summary-card-label">Rata-rata</p>
                <p class="month-summary-card-value">${averageLabel} hari</p>
                <p class="month-summary-card-desc">Durasi rata-rata setiap pengajuan di daftar aktif.</p>
            </div>
        </div>
    `;
}

function renderDataListSkeleton() {
    let skeletonCards = "";
    for (let index = 0; index < 6; index += 1) {
        skeletonCards += `
            <div class="glass-card p-4 md:p-5 flex flex-col gap-4 animate-pulse">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-slate-800/70"></div>
                    <div class="flex-1 space-y-2">
                        <div class="h-3 bg-slate-700/70 rounded w-3/4"></div>
                        <div class="h-2.5 bg-slate-800/80 rounded w-1/2"></div>
                    </div>
                </div>
                <div class="bg-[#020617]/80 p-3 rounded-lg border border-slate-800/80 space-y-2">
                    <div class="h-2.5 bg-slate-800/80 rounded w-24"></div>
                    <div class="h-2 bg-slate-800/80 rounded w-full"></div>
                    <div class="h-2 bg-slate-800/80 rounded w-5/6"></div>
                </div>
                <div class="flex items-center justify-between">
                    <div class="h-2.5 bg-slate-800/80 rounded w-1/2"></div>
                    <div class="flex gap-2">
                        <div class="h-6 w-16 bg-slate-800/80 rounded-full"></div>
                        <div class="h-5 w-20 bg-slate-800/80 rounded-full"></div>
                    </div>
                </div>
            </div>
        `;
    }

    dom.dataList.innerHTML = skeletonCards;
}

function renderDataResultMeta(data) {
    const employeeCount = countUnique(data.map((item) => item.userId || item.nama));
    const groupCount = countUnique(data.map((item) => item.group).filter((group) => group && group !== "-"));
    const monthLabel = formatMonthLabel(state.dataViewMonth, state.dataViewYear);

    if (data.length === 0) {
        dom.dataResultMeta.textContent = `Tidak ada pengajuan cuti pada ${monthLabel}.`;
        return;
    }

    dom.dataResultMeta.textContent = `${data.length} pengajuan pada ${monthLabel}. ${employeeCount} karyawan dan ${groupCount} group masuk dalam hasil.`;
}

function renderDataList(data) {
    dom.dataList.innerHTML = "";

    if (data.length === 0) {
        dom.dataList.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-14 text-slate-500">
                <i class="ph-duotone ph-magnifying-glass text-5xl mb-3 opacity-50"></i>
                <p class="text-base text-slate-300 mb-1">Tidak ada data yang cocok.</p>
                <p class="text-sm text-slate-500">Coba ganti bulan pengajuan atau longgarkan filter pencarian.</p>
            </div>
        `;
        return;
    }

    data.forEach((item) => {
        const formattedDates = item.tanggalCutiList
            .map(
                (date) => `
                    <span class="bg-blue-900/20 text-blue-300 border border-blue-500/20 px-1.5 py-0.5 rounded text-[10px]">
                        ${escapeHtml(formatShortDate(date))}
                    </span>
                `
            )
            .join("");

        const lockedBadge = item.kunciCuti
            ? `<span class="absolute right-4 top-4 text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-400/40">Terkunci</span>`
            : "";

        const safeName = escapeHtml(item.nama);
        const safeJabatan = escapeHtml(item.jabatan);
        const safeGroup = escapeHtml(formatGroupLabel(item.group));
        const safeJenis = escapeHtml(item.jenisCuti);
        const safeAlasan = safeMultilineText(item.alasanCuti || "-");

        const card = document.createElement("div");
        card.className = "glass-card p-4 md:p-5 transition-all duration-300 flex flex-col gap-3 relative overflow-hidden cursor-pointer";
        card.tabIndex = 0;

        card.innerHTML = `
            <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-500 opacity-80"></div>
            <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-2xl bg-slate-900/80 border border-slate-700 flex items-center justify-center text-cyan-300 font-bold shrink-0">
                    ${getAvatarLabel(item.nama)}
                </div>
                <div class="overflow-hidden flex-grow">
                    <h4 class="font-bold text-white text-base truncate">${safeName}</h4>
                    <div class="flex items-center gap-2 text-xs text-slate-400">
                        <span class="truncate max-w-[55%]">${safeJabatan}</span>
                        <span class="w-1 h-1 rounded-full bg-slate-600"></span>
                        <span class="truncate max-w-[40%] text-slate-500">${safeGroup}</span>
                    </div>
                </div>
            </div>
            ${lockedBadge}

            <div class="bg-[#07101f]/80 p-3 rounded-xl border border-slate-800/80 space-y-3">
                <div class="flex flex-wrap items-center gap-2">
                    <span class="text-[11px] font-semibold tracking-wide uppercase inline-flex px-2 py-1 rounded-full ${getJenisCutiBadgeClasses(item.jenisCuti)}">
                        ${safeJenis}
                    </span>
                    <span class="text-[10px] font-bold text-cyan-300 bg-cyan-500/10 px-2 py-1 rounded-full border border-cyan-500/20">
                        ${escapeHtml(`${getDataViewLeaveDays(item)} Hari`)}
                    </span>
                    <span class="text-[10px] text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                        ${escapeHtml(typeof item.sisaCuti === "number" ? `Sisa ${item.sisaCuti} Hari` : "Sisa tidak tersedia")}
                    </span>
                </div>
                <div>
                    <p class="text-xs text-slate-500 mb-1">Alasan</p>
                    <p class="text-xs text-slate-200 line-clamp-2">${safeAlasan}</p>
                </div>
            </div>

            <div class="pt-2 border-t border-slate-700/50 flex justify-between items-start gap-4">
                <div class="flex items-center gap-1.5 text-xs text-slate-400">
                    <i class="ph-fill ph-calendar-blank"></i>
                    <span>Diajukan ${escapeHtml(formatLongDate(item.tanggalPengajuan))}</span>
                </div>
                <span class="text-[10px] uppercase tracking-[0.18em] text-slate-500">Klik untuk detail</span>
            </div>

            <div>
                <p class="text-[10px] text-slate-500 mb-2 uppercase tracking-wider font-semibold">Tanggal Cuti</p>
                <div class="flex flex-wrap gap-1.5">
                    ${formattedDates || '<span class="text-xs text-slate-600 italic">Data tanggal belum tersedia</span>'}
                </div>
            </div>
        `;

        card.addEventListener("click", () => openModal(item));
        card.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openModal(item);
            }
        });

        dom.dataList.appendChild(card);
    });
}

function updateDataViewHeader() {
    dom.dataMonthYear.textContent = formatMonthLabel(state.dataViewMonth, state.dataViewYear);
}

function populateFilters() {
    const currentGroup = dom.filterGroup.value;
    const currentJabatan = dom.filterJabatan.value;
    const currentJenis = dom.filterJenis.value;

    const groups = getUniqueFilterOptions(
        getScopedDataViewItems({ excludeField: "group", includeSearch: false }),
        (item) => item.group
    );
    setFilterSelectOptions(dom.filterGroup, "Semua Group", groups, currentGroup);

    const jabatans = getUniqueFilterOptions(
        getScopedDataViewItems({ excludeField: "jabatan", includeSearch: false }),
        (item) => item.jabatan
    );
    setFilterSelectOptions(dom.filterJabatan, "Semua Jabatan", jabatans, currentJabatan);

    const jenisList = getUniqueFilterOptions(
        getScopedDataViewItems({ excludeField: "jenisCuti", includeSearch: false }),
        (item) => item.jenisCuti
    );
    setFilterSelectOptions(dom.filterJenis, "Semua Jenis Cuti", jenisList, currentJenis);
}

function updateDataList() {
    populateFilters();
    const filtered = getDataViewFilteredItems();
    renderDataResultMeta(filtered);
    renderActiveFilters(getActiveFilters());
    renderDataSummary(filtered);
    renderDataList(filtered);

    if (isDataViewActive()) {
        renderHeroStats();
    }
}

function navigateDataMonth(direction) {
    state.dataViewMonth += direction;
    if (state.dataViewMonth > 11) {
        state.dataViewMonth = 0;
        state.dataViewYear += 1;
    } else if (state.dataViewMonth < 0) {
        state.dataViewMonth = 11;
        state.dataViewYear -= 1;
    }

    updateDataViewHeader();
    updateDataList();
}

function resetDataFilters() {
    dom.dataSearch.value = "";
    dom.filterGroup.value = "all";
    dom.filterJabatan.value = "all";
    dom.filterJenis.value = "all";
    updateDataList();
}
