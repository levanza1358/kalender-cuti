function countLeaveDaysForRecordInMonth(item, year, month) {
    const prefix = getMonthPrefix(year, month);
    return item.tanggalCutiList.filter((date) => date.startsWith(prefix)).length;
}

function getCalendarMonthRecords(year, month) {
    const prefix = getMonthPrefix(year, month);
    return state.allCutiData.filter((item) => item.tanggalCutiList.some((date) => date.startsWith(prefix)));
}

function getBusiestDateInfo(year, month) {
    const prefix = getMonthPrefix(year, month);
    const counts = {};

    state.allCutiData.forEach((item) => {
        item.tanggalCutiList.forEach((date) => {
            if (!date.startsWith(prefix)) {
                return;
            }
            counts[date] = (counts[date] || 0) + 1;
        });
    });

    let busiestDate = null;
    let busiestCount = 0;

    Object.keys(counts)
        .sort((a, b) => a.localeCompare(b))
        .forEach((date) => {
            if (counts[date] > busiestCount) {
                busiestDate = date;
                busiestCount = counts[date];
            }
        });

    return { date: busiestDate, count: busiestCount };
}

function getTodayLeaveRecords() {
    const today = getTodayDateString();
    return state.allCutiData.filter((item) => item.tanggalCutiList.includes(today));
}

function getActiveFilters() {
    const filters = [];
    const search = dom.dataSearch.value.trim();
    const group = dom.filterGroup.value;
    const jabatan = dom.filterJabatan.value;
    const jenis = dom.filterJenis.value;

    if (search) {
        filters.push({ icon: "ph-magnifying-glass", label: `Cari: ${search}` });
    }
    if (group !== "all") {
        filters.push({ icon: "ph-users-three", label: formatGroupLabel(group) });
    }
    if (jabatan !== "all") {
        filters.push({ icon: "ph-briefcase", label: jabatan });
    }
    if (jenis !== "all") {
        filters.push({ icon: "ph-notebook", label: jenis });
    }

    return filters;
}

function normalizeFilterValue(value) {
    return normalizeText(value, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function matchesSelectedFilter(itemValue, selectedValue) {
    if (selectedValue === "all") {
        return true;
    }

    return normalizeFilterValue(itemValue) === normalizeFilterValue(selectedValue);
}

function itemMatchesDataViewMonth(item, year = state.dataViewYear, month = state.dataViewMonth) {
    const submittedAt = parseDateValue(item.tanggalPengajuan);
    return !!submittedAt && submittedAt.getFullYear() === year && submittedAt.getMonth() === month;
}

function getDataViewMonthItems() {
    return state.allCutiData.filter((item) => itemMatchesDataViewMonth(item));
}

function getScopedDataViewItems({ excludeField = null, includeSearch = true } = {}) {
    const searchTerm = normalizeFilterValue(dom.dataSearch.value);
    let filtered = getDataViewMonthItems();

    if (excludeField !== "group") {
        filtered = filtered.filter((item) => matchesSelectedFilter(item.group, dom.filterGroup.value));
    }

    if (excludeField !== "jabatan") {
        filtered = filtered.filter((item) => matchesSelectedFilter(item.jabatan, dom.filterJabatan.value));
    }

    if (excludeField !== "jenisCuti") {
        filtered = filtered.filter((item) => matchesSelectedFilter(item.jenisCuti, dom.filterJenis.value));
    }

    if (includeSearch && searchTerm) {
        filtered = filtered.filter((item) => {
            const haystack = normalizeFilterValue([
                item.nama,
                item.jabatan,
                item.group,
                item.jenisCuti,
                item.alasanCuti
            ].join(" "));

            return haystack.includes(searchTerm);
        });
    }

    return filtered;
}

function getUniqueFilterOptions(items, accessor) {
    const optionMap = new Map();

    items.forEach((item) => {
        const rawValue = normalizeText(accessor(item), "");
        const normalizedValue = normalizeFilterValue(rawValue);

        if (!normalizedValue || optionMap.has(normalizedValue)) {
            return;
        }

        optionMap.set(normalizedValue, rawValue);
    });

    return [...optionMap.values()].sort((a, b) => a.localeCompare(b, "id-ID", { sensitivity: "base" }));
}

function setFilterSelectOptions(selectElement, defaultLabel, options, currentValue) {
    selectElement.innerHTML = `<option value="all">${defaultLabel}</option>`;

    options.forEach((optionValue) => {
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = optionValue;
        selectElement.appendChild(option);
    });

    if (currentValue === "all") {
        selectElement.value = "all";
        return "all";
    }

    const resolvedValue = options.find(
        (optionValue) => normalizeFilterValue(optionValue) === normalizeFilterValue(currentValue)
    );

    selectElement.value = resolvedValue || "all";
    return selectElement.value;
}

function getDataViewLeaveDays(item) {
    return Number(item.lamaHari) || item.tanggalCutiList.length;
}

function renderActiveFilters(filters) {
    if (filters.length === 0) {
        dom.dataActiveFilters.innerHTML = `
            <span class="data-filter-chip is-muted">
                <i class="ph ph-funnel-simple"></i>
                Tanpa filter tambahan
            </span>
        `;
        dom.resetFiltersButton.classList.add("hidden");
        return;
    }

    dom.dataActiveFilters.innerHTML = filters
        .map(
            (filter) => `
                <span class="data-filter-chip">
                    <i class="ph ${escapeHtml(filter.icon)}"></i>
                    ${escapeHtml(filter.label)}
                </span>
            `
        )
        .join("");

    dom.resetFiltersButton.classList.remove("hidden");
}

function getDataViewFilteredItems() {
    return getScopedDataViewItems({ includeSearch: true });
}

function getFocusMetrics() {
    const todayRecords = getTodayLeaveRecords();
    const focusMonthLabel = isDataViewActive()
        ? formatMonthLabel(state.dataViewMonth, state.dataViewYear)
        : formatMonthLabel(state.calendarMonth, state.calendarYear);

    if (isDataViewActive()) {
        const filtered = getDataViewFilteredItems();
        const totalHari = filtered.reduce((sum, item) => sum + getDataViewLeaveDays(item), 0);
        const uniqueEmployees = countUnique(filtered.map((item) => item.userId || item.nama));
        const groupCount = countUnique(filtered.map((item) => item.group).filter((group) => group && group !== "-"));

        return {
            cards: [
                {
                    icon: "ph-duotone ph-files",
                    label: "Pengajuan Fokus",
                    value: filtered.length,
                    desc: `Pengajuan yang dibuat pada ${focusMonthLabel} setelah filter aktif.`
                },
                {
                    icon: "ph-duotone ph-sun-dim",
                    label: "Hari Cuti",
                    value: totalHari,
                    desc: "Akumulasi durasi dari pengajuan yang masuk di bulan aktif."
                },
                {
                    icon: "ph-duotone ph-users-three",
                    label: "Karyawan Terdampak",
                    value: uniqueEmployees,
                    desc: `${groupCount} group muncul dalam hasil saat ini.`
                },
                {
                    icon: "ph-duotone ph-calendar-check",
                    label: "Sedang Cuti Hari Ini",
                    value: todayRecords.length,
                    desc: todayRecords.length > 0
                        ? `${todayRecords.slice(0, 2).map((item) => item.nama).join(", ")}${todayRecords.length > 2 ? ` +${todayRecords.length - 2} lagi` : ""}`
                        : "Tidak ada cuti pada hari ini."
                }
            ]
        };
    }

    const monthRecords = getCalendarMonthRecords(state.calendarYear, state.calendarMonth);
    const totalHari = monthRecords.reduce(
        (sum, item) => sum + countLeaveDaysForRecordInMonth(item, state.calendarYear, state.calendarMonth),
        0
    );
    const uniqueEmployees = countUnique(monthRecords.map((item) => item.userId || item.nama));
    const groupCount = countUnique(monthRecords.map((item) => item.group).filter((group) => group && group !== "-"));
    const busiest = getBusiestDateInfo(state.calendarYear, state.calendarMonth);

    return {
        cards: [
            {
                icon: "ph-duotone ph-calendar-dots",
                label: "Orang Cuti",
                value: uniqueEmployees,
                desc: `${focusMonthLabel} memiliki ${monthRecords.length} pengajuan yang menyentuh kalender.`
            },
            {
                icon: "ph-duotone ph-sparkle",
                label: "Slot Hari Cuti",
                value: totalHari,
                desc: "Jumlah tanggal cuti yang terjadwal di bulan aktif."
            },
            {
                icon: "ph-duotone ph-buildings",
                label: "Group Terdampak",
                value: groupCount,
                desc: "Memudahkan cek persebaran tim yang terpengaruh."
            },
            {
                icon: "ph-duotone ph-timer",
                label: "Puncak Aktivitas",
                value: busiest.count || 0,
                desc: busiest.date
                    ? `${formatLongDate(busiest.date)} menjadi titik terpadat bulan ini.`
                    : "Belum ada cuti yang terjadwal di bulan aktif."
            }
        ]
    };
}

function renderHeroStats() {
    const metrics = getFocusMetrics();
    dom.heroStats.innerHTML = metrics.cards
        .map(
            (card) => `
                <div class="hero-stat-card">
                    <div class="hero-stat-icon">
                        <i class="${escapeHtml(card.icon)}"></i>
                    </div>
                    <div>
                        <p class="hero-stat-label">${escapeHtml(card.label)}</p>
                        <p class="hero-stat-value">${escapeHtml(card.value)}</p>
                    </div>
                    <p class="hero-stat-desc">${escapeHtml(card.desc)}</p>
                </div>
            `
        )
        .join("");
}

function renderCalendarMonthSummary(year, month) {
    const monthRecords = getCalendarMonthRecords(year, month);
    const leaveDays = monthRecords.reduce(
        (sum, item) => sum + countLeaveDaysForRecordInMonth(item, year, month),
        0
    );
    const uniqueEmployees = countUnique(monthRecords.map((item) => item.userId || item.nama));
    const busiest = getBusiestDateInfo(year, month);

    dom.calendarMonthSummary.innerHTML = `
        <div class="calendar-month-summary-grid">
            <div class="month-summary-card">
                <p class="month-summary-card-label">Orang Cuti</p>
                <p class="month-summary-card-value">${uniqueEmployees}</p>
                <p class="month-summary-card-desc">Jumlah karyawan unik yang muncul pada kalender bulan ini.</p>
            </div>
            <div class="month-summary-card">
                <p class="month-summary-card-label">Slot Hari</p>
                <p class="month-summary-card-value">${leaveDays}</p>
                <p class="month-summary-card-desc">Akumulasi tanggal cuti yang jatuh di bulan aktif.</p>
            </div>
            <div class="month-summary-card">
                <p class="month-summary-card-label">Puncak</p>
                <p class="month-summary-card-value">${busiest.count || 0} orang</p>
                <p class="month-summary-card-desc">${
                    busiest.date ? escapeHtml(formatLongDate(busiest.date)) : "Belum ada tanggal dengan cuti terjadwal."
                }</p>
            </div>
        </div>
    `;
}
