function resetDetailPanel() {
    dom.detailTitle.textContent = "Pilih Tanggal";
    dom.detailCountBadge.textContent = "0 cuti";
    dom.detailMeta.innerHTML = `
        <span class="detail-meta-chip">
            <i class="ph ph-cursor-click"></i>
            Pilih tanggal pada kalender
        </span>
    `;
    dom.detailList.innerHTML = `
        <div class="flex flex-col items-center justify-center h-44 text-slate-500">
            <i class="ph-duotone ph-calendar-plus text-4xl mb-3 text-slate-700"></i>
            <p class="text-sm text-slate-300">Pilih tanggal untuk melihat siapa yang cuti.</p>
        </div>
    `;
}

function displayDailyDetail(dateString, dailyData) {
    const dateLabel = formatLongDate(dateString);
    const groupsCount = countUnique(dailyData.map((item) => item.group).filter((group) => group && group !== "-"));
    const lockedCount = dailyData.filter((item) => item.kunciCuti).length;

    dom.detailTitle.textContent = `Cuti pada ${dateLabel}`;
    dom.detailCountBadge.textContent = `${dailyData.length} cuti`;
    dom.detailMeta.innerHTML = `
        <span class="detail-meta-chip">
            <i class="ph ph-users-three"></i>
            ${dailyData.length} orang
        </span>
        <span class="detail-meta-chip">
            <i class="ph ph-buildings"></i>
            ${groupsCount} group
        </span>
        <span class="detail-meta-chip">
            <i class="ph ph-lock-key"></i>
            ${lockedCount} terkunci
        </span>
    `;

    if (dailyData.length === 0) {
        dom.detailList.innerHTML = `
            <div class="flex flex-col items-center justify-center h-44 text-slate-500">
                <i class="ph-duotone ph-check-circle text-4xl mb-3 text-slate-700"></i>
                <p class="text-sm text-slate-300">Tidak ada yang cuti pada tanggal ini.</p>
            </div>
        `;
        return;
    }

    dom.detailList.innerHTML = "";

    dailyData
        .slice()
        .sort((a, b) => {
            const groupCompare = normalizeText(a.group, "").localeCompare(normalizeText(b.group, ""));
            if (groupCompare !== 0) {
                return groupCompare;
            }
            return normalizeText(a.nama, "").localeCompare(normalizeText(b.nama, ""));
        })
        .forEach((item) => {
            const card = document.createElement("div");
            card.className = "glass-card-sm p-3 transition cursor-pointer group";
            card.tabIndex = 0;

            card.innerHTML = `
                <div class="flex items-start gap-3">
                    <div class="w-10 h-10 rounded-2xl bg-slate-900/80 border border-slate-700 flex items-center justify-center text-cyan-300 font-bold shrink-0">
                        ${getAvatarLabel(item.nama)}
                    </div>
                    <div class="flex-grow min-w-0">
                        <div class="flex items-start justify-between gap-2">
                            <div class="min-w-0">
                                <h4 class="text-sm font-bold text-white truncate group-hover:text-cyan-300 transition-colors">${escapeHtml(item.nama)}</h4>
                                <p class="text-[11px] text-slate-400 truncate">${escapeHtml(item.jabatan)} &bull; ${escapeHtml(formatGroupLabel(item.group))}</p>
                            </div>
                            ${item.kunciCuti ? '<span class="text-[10px] uppercase tracking-[0.16em] px-2 py-1 rounded-full bg-rose-500/10 border border-rose-400/30 text-rose-300">Lock</span>' : ""}
                        </div>
                        <div class="flex flex-wrap items-center gap-2 mt-2">
                            <span class="text-[10px] font-semibold tracking-wide uppercase inline-flex px-2 py-1 rounded-full ${getJenisCutiBadgeClasses(item.jenisCuti)}">
                                ${escapeHtml(item.jenisCuti)}
                            </span>
                            <span class="text-[10px] bg-blue-900/30 text-blue-300 border border-blue-900/50 px-1.5 py-0.5 rounded">
                                ${escapeHtml(`${Number(item.lamaHari) || item.tanggalCutiList.length} Hari`)}
                            </span>
                        </div>
                        <p class="text-[11px] text-slate-300 mt-2 line-clamp-2">
                            ${safeMultilineText(item.alasanCuti || "-")}
                        </p>
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

            dom.detailList.appendChild(card);
        });
}

function selectDayHandler(dayDiv, numberElement, dateString, dailyData) {
    if (state.selectedDayElement) {
        const previousNumber = state.selectedDayElement.querySelector(".calendar-day-date");
        state.selectedDayElement.classList.remove("calendar-day--selected");
        if (previousNumber) {
            previousNumber.classList.remove("is-selected");
            if (state.selectedDayElement.dataset.today === "true") {
                previousNumber.classList.add("is-today");
            }
        }
    }

    dayDiv.classList.add("calendar-day--selected");
    numberElement.classList.add("is-selected");
    numberElement.classList.remove("is-today");

    state.selectedDayElement = dayDiv;
    displayDailyDetail(dateString, dailyData);
}

function renderCalendar(data, year, month, autoSelectToday = false, preferredDate = null) {
    const todayString = getTodayDateString();
    const selectedDate = preferredDate && preferredDate.startsWith(getMonthPrefix(year, month))
        ? preferredDate
        : null;

    state.selectedDayElement = null;
    dom.calendarGrid.innerHTML = "";
    dom.calendarMonthYear.textContent = formatMonthLabel(month, year);

    renderCalendarMonthSummary(year, month);

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;

    let selectionTarget = null;
    let todayTarget = null;

    for (let index = 0; index < firstDayIndex; index += 1) {
        const emptyDiv = document.createElement("div");
        emptyDiv.className = "calendar-day is-empty";
        dom.calendarGrid.appendChild(emptyDiv);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
        const currentDateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const dailyData = data.filter((item) => item.tanggalCutiList.includes(currentDateString));
        const nativeDayIndex = new Date(year, month, day).getDay();
        const isWeekend = nativeDayIndex === 0 || nativeDayIndex === 6;
        const isToday = currentDateString === todayString;

        const dayDiv = document.createElement("div");
        dayDiv.className = "calendar-day";
        dayDiv.dataset.date = currentDateString;
        dayDiv.dataset.today = isToday ? "true" : "false";
        dayDiv.tabIndex = 0;
        dayDiv.setAttribute("role", "button");
        dayDiv.setAttribute("aria-label", `${formatLongDate(currentDateString)}: ${dailyData.length} cuti`);

        if (isWeekend) {
            dayDiv.classList.add("calendar-day--weekend");
        }
        if (dailyData.length > 0) {
            dayDiv.classList.add("calendar-day--busy");
        }

        const dayNumber = document.createElement("div");
        dayNumber.className = "calendar-day-date";
        dayNumber.textContent = String(day);
        if (isToday) {
            dayNumber.classList.add("is-today");
        }

        dayDiv.appendChild(dayNumber);

        if (dailyData.length > 0) {
            const countPill = document.createElement("div");
            countPill.className = "calendar-day-count";
            countPill.innerHTML = `
                <i class="ph-bold ph-users-three"></i>
                ${escapeHtml(`${dailyData.length} orang`)}
            `;
            dayDiv.appendChild(countPill);
        }

        dayDiv.addEventListener("click", () => selectDayHandler(dayDiv, dayNumber, currentDateString, dailyData));
        dayDiv.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                selectDayHandler(dayDiv, dayNumber, currentDateString, dailyData);
            }
        });

        if (selectedDate && currentDateString === selectedDate) {
            selectionTarget = { dayDiv, dayNumber, currentDateString, dailyData };
        }

        if (isToday && autoSelectToday) {
            todayTarget = { dayDiv, dayNumber, currentDateString, dailyData };
        }

        dom.calendarGrid.appendChild(dayDiv);
    }

    const totalCells = firstDayIndex + daysInMonth;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let index = 0; index < remaining; index += 1) {
        const emptyDiv = document.createElement("div");
        emptyDiv.className = "calendar-day is-empty";
        dom.calendarGrid.appendChild(emptyDiv);
    }

    if (selectionTarget) {
        selectDayHandler(
            selectionTarget.dayDiv,
            selectionTarget.dayNumber,
            selectionTarget.currentDateString,
            selectionTarget.dailyData
        );
        return;
    }

    if (todayTarget) {
        selectDayHandler(todayTarget.dayDiv, todayTarget.dayNumber, todayTarget.currentDateString, todayTarget.dailyData);
        return;
    }

    resetDetailPanel();
}

function openModal(item) {
    const formattedDates = item.tanggalCutiList
        .map(
            (date) => `
                <span class="bg-blue-900/30 text-blue-300 border border-blue-900/60 px-2 py-0.5 rounded text-xs">
                    ${escapeHtml(formatShortDate(date))}
                </span>
            `
        )
        .join("");

    const sisaCutiLabel = typeof item.sisaCuti === "number"
        ? `${item.sisaCuti} Hari`
        : "Tidak tersedia";

    const safeSignatureUrl = toSafeUrl(item.urlTTD);

    dom.modalContent.innerHTML = `
        <div class="flex items-start gap-4 mb-5">
            <div class="w-12 h-12 rounded-2xl bg-slate-900/80 border border-slate-700 flex items-center justify-center text-cyan-300 font-bold text-sm">
                ${getAvatarLabel(item.nama)}
            </div>
            <div class="min-w-0">
                <h4 class="text-xl font-bold text-white">${escapeHtml(item.nama)}</h4>
                <div class="flex items-center gap-2 text-sm text-slate-400 mt-1 flex-wrap">
                    <span>${escapeHtml(item.jabatan)}</span>
                    <span class="w-1 h-1 rounded-full bg-slate-600"></span>
                    <span class="text-cyan-300 font-medium">${escapeHtml(formatGroupLabel(item.group))}</span>
                </div>
            </div>
        </div>

        <div class="bg-[#0f172a] rounded-xl p-4 border border-border-color space-y-3">
            <div class="flex items-center justify-between gap-3">
                <span class="text-sm text-slate-500">Jenis Cuti</span>
                <span class="text-xs font-semibold tracking-wide uppercase px-2 py-1 rounded-full ${getJenisCutiBadgeClasses(item.jenisCuti)}">
                    ${escapeHtml(item.jenisCuti)}
                </span>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div class="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                    <p class="text-xs uppercase tracking-[0.16em] text-slate-500">Durasi</p>
                    <p class="text-base font-bold text-white mt-1">${escapeHtml(`${Number(item.lamaHari) || item.tanggalCutiList.length} Hari`)}</p>
                </div>
                <div class="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                    <p class="text-xs uppercase tracking-[0.16em] text-slate-500">Sisa Cuti</p>
                    <p class="text-base font-bold text-white mt-1">${escapeHtml(sisaCutiLabel)}</p>
                </div>
            </div>
            <div class="flex items-center justify-between gap-3">
                <span class="text-sm text-slate-500">Tanggal Pengajuan</span>
                <span class="text-sm font-medium text-slate-200">${escapeHtml(formatLongDate(item.tanggalPengajuan))}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
                <span class="text-sm text-slate-500">Status</span>
                <span class="text-sm font-medium ${item.kunciCuti ? "text-rose-300" : "text-emerald-300"}">
                    ${item.kunciCuti ? "Terkunci" : "Aktif"}
                </span>
            </div>
            <div>
                <span class="text-sm text-slate-500 block mb-2">Alasan</span>
                <p class="text-sm text-slate-200 bg-slate-900/40 border border-slate-700/60 rounded-lg px-3 py-2 max-h-32 overflow-y-auto">
                    ${safeMultilineText(item.alasanCuti || "-")}
                </p>
            </div>
            <div>
                <span class="text-sm text-slate-500 block mb-2">Tanggal Cuti</span>
                <div class="flex flex-wrap gap-2">
                    ${formattedDates || '<span class="text-xs text-slate-500">Belum ada tanggal.</span>'}
                </div>
            </div>
            <div class="pt-2 border-t border-slate-800">
                ${
                    safeSignatureUrl
                        ? `<a href="${escapeHtml(safeSignatureUrl)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200">
                                <i class="ph-bold ph-signature"></i>
                                Lihat TTD
                           </a>`
                        : `<span class="text-sm text-slate-500">TTD belum tersedia.</span>`
                }
            </div>
        </div>
    `;

    dom.modal.classList.remove("hidden");
    void dom.modal.offsetWidth;
    dom.modalBackdrop.classList.remove("opacity-0");
    dom.modalPanel.classList.remove("opacity-0", "scale-95");
    dom.modalPanel.classList.add("opacity-100", "scale-100");
}

function closeModal() {
    dom.modalBackdrop.classList.add("opacity-0");
    dom.modalPanel.classList.remove("opacity-100", "scale-100");
    dom.modalPanel.classList.add("opacity-0", "scale-95");
    setTimeout(() => dom.modal.classList.add("hidden"), 200);
}

function navigateCalendar(direction) {
    state.calendarMonth += direction;
    if (state.calendarMonth > 11) {
        state.calendarMonth = 0;
        state.calendarYear += 1;
    } else if (state.calendarMonth < 0) {
        state.calendarMonth = 11;
        state.calendarYear -= 1;
    }

    renderCalendar(state.allCutiData, state.calendarYear, state.calendarMonth, false);
    renderHeroStats();
}
