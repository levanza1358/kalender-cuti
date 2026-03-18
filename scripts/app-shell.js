(function renderAppShell() {
    const appRoot = document.getElementById("app-root");
    if (!appRoot) {
        return;
    }

    appRoot.innerHTML = `
        <div class="ambient-orb ambient-orb-one"></div>
        <div class="ambient-orb ambient-orb-two"></div>

        <main class="min-h-screen flex flex-col relative z-10">
            <header class="relative z-20">
                <div class="glass-header hero-shell hero-shell--compact app-header-shell px-4 md:px-8 py-4">
                    <div class="flex items-center justify-between gap-4">
                        <div class="min-w-0 flex items-center gap-3">
                            <div class="app-logo-wrap">
                                <img
                                    src="assets/MTI Transparent.png"
                                    alt="Pelindo Solusi Logistik MTI Multi SCM"
                                    class="app-logo"
                                    decoding="async"
                                >
                            </div>
                            <h1 class="hero-title app-header-title text-white tracking-tight">Semua Data Cuti</h1>
                            <span id="live-status-badge" class="status-pill header-status">
                                <span class="status-dot"></span>
                                Sinkron realtime aktif
                            </span>
                        </div>

                        <div class="flex items-center gap-3">
                            <button id="jump-today" class="action-button header-today-button">
                                <i class="ph-bold ph-crosshair-simple"></i>
                                Hari Ini
                            </button>
                            <div class="app-tabs bg-white/10 p-1 rounded-xl flex space-x-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                                <button id="tab-calendar" class="tab-button active px-4 py-2 text-sm">Kalender</button>
                                <button id="tab-data" class="tab-button px-4 py-2 text-sm">Data</button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div class="px-4 md:px-8 pt-4">
                <div id="app-state-banner" class="hidden"></div>
            </div>

            <div class="app-content-shell pt-3 md:pt-4 px-4 md:px-8 pb-4 md:pb-5 flex-1 min-h-0 w-full flex flex-col">
                <div id="data-view" class="content-view hidden flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                    <div class="glass-panel p-4 md:p-5 mb-4 md:mb-5">
                        <div class="flex flex-col xl:flex-row gap-4 items-center justify-between">
                            <div class="flex items-center gap-3 bg-[#020617]/80 px-3 py-1.5 rounded-full border border-border-color w-full xl:w-auto justify-between xl:justify-start">
                                <button id="data-prev" class="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-md transition"><i class="ph-bold ph-caret-left"></i></button>
                                <h2 id="data-month-year" class="text-base font-bold text-white min-w-[150px] text-center select-none">Desember 2025</h2>
                                <button id="data-next" class="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-md transition"><i class="ph-bold ph-caret-right"></i></button>
                            </div>

                            <div class="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
                                <div class="relative w-full md:w-48">
                                    <i class="ph ph-users-three absolute left-3 top-2.5 text-slate-500"></i>
                                    <select id="filter-group" class="bg-[#0f172a] border border-border-color text-text-main pl-9 pr-8 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500 w-full appearance-none cursor-pointer">
                                        <option value="all">Semua Group</option>
                                    </select>
                                    <i class="ph ph-caret-down absolute right-3 top-2.5 text-slate-500 pointer-events-none"></i>
                                </div>

                                <div class="relative w-full md:w-48">
                                    <i class="ph ph-briefcase absolute left-3 top-2.5 text-slate-500"></i>
                                    <select id="filter-jabatan" class="bg-[#0f172a] border border-border-color text-text-main pl-9 pr-8 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500 w-full appearance-none cursor-pointer">
                                        <option value="all">Semua Jabatan</option>
                                    </select>
                                    <i class="ph ph-caret-down absolute right-3 top-2.5 text-slate-500 pointer-events-none"></i>
                                </div>

                                <div class="relative w-full md:w-56">
                                    <i class="ph ph-notebook absolute left-3 top-2.5 text-slate-500"></i>
                                    <select id="filter-jenis" class="bg-[#0f172a] border border-border-color text-text-main pl-9 pr-8 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500 w-full appearance-none cursor-pointer">
                                        <option value="all">Semua Jenis Cuti</option>
                                    </select>
                                    <i class="ph ph-caret-down absolute right-3 top-2.5 text-slate-500 pointer-events-none"></i>
                                </div>

                                <div class="relative w-full md:w-64">
                                    <i class="ph ph-magnifying-glass absolute left-3 top-2.5 text-slate-500"></i>
                                    <input id="data-search" type="text" placeholder="Cari nama karyawan..." class="bg-[#0f172a] border border-border-color text-text-main pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500 w-full">
                                </div>
                            </div>
                        </div>

                        <div class="mt-4 pt-4 border-t border-white/10 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
                            <div class="space-y-2">
                                <p id="data-result-meta" class="text-sm text-slate-300">Memuat ringkasan data...</p>
                                <div id="data-active-filters" class="flex flex-wrap gap-2"></div>
                            </div>
                            <button id="reset-filters" class="secondary-button self-start lg:self-auto">
                                <i class="ph-bold ph-arrow-counter-clockwise"></i>
                                Reset Filter
                            </button>
                        </div>
                    </div>

                    <div id="data-summary" class="mb-4 md:mb-6"></div>

                    <div id="data-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 pb-10"></div>
                </div>

                <div id="calendar-view" class="content-view calendar-view-shell flex-1 min-h-0 flex flex-col">
                    <div class="calendar-stage grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 flex-grow min-h-0">
                        <div id="calendar-container" class="lg:col-span-8 h-full min-h-0 flex flex-col glass-panel overflow-hidden">
                            <div class="calendar-panel-head border-b border-border-color bg-[#1e293b]/90">
                                <div class="flex justify-between items-center p-3">
                                    <button id="cal-prev" class="text-slate-400 hover:text-white p-2"><i class="ph-bold ph-caret-left"></i></button>
                                    <div class="text-center">
                                        <p class="calendar-kicker text-[11px] uppercase tracking-[0.24em] text-slate-500 mb-1">Peta Bulanan</p>
                                        <h2 id="cal-month-year" class="text-lg font-bold text-white">Desember 2025</h2>
                                    </div>
                                    <div class="flex items-center gap-3">
                                        <button id="cal-next" class="text-slate-400 hover:text-white p-2"><i class="ph-bold ph-caret-right"></i></button>
                                        <div class="calendar-view-chip text-[11px] uppercase tracking-[0.18em] text-blue-200 bg-blue-500/10 border border-blue-400/20 px-3 py-1.5 rounded-full font-semibold">Month View</div>
                                    </div>
                                </div>
                            </div>

                            <div class="calendar-body flex-grow custom-scrollbar">
                                <div class="calendar-weekdays grid grid-cols-7 border-b border-border-color">
                                    <div class="day-header">Sen</div>
                                    <div class="day-header">Sel</div>
                                    <div class="day-header">Rab</div>
                                    <div class="day-header">Kam</div>
                                    <div class="day-header">Jum</div>
                                    <div class="day-header">Sab</div>
                                    <div class="day-header">Min</div>
                                </div>

                                <div id="calendar-grid" class="calendar-grid bg-[#0f172a]"></div>
                            </div>
                        </div>

                        <div id="daily-cuti-detail-wrapper" class="lg:col-span-4 h-full min-h-0">
                            <div id="daily-cuti-detail" class="glass-panel h-full flex flex-col overflow-hidden">
                                <div class="p-4 border-b border-border-color">
                                    <div class="flex items-center justify-between gap-3">
                                        <div class="flex items-center gap-2">
                                            <i class="ph-fill ph-calendar-check text-blue-500 text-lg"></i>
                                            <h3 id="detail-title" class="text-base font-bold text-white">Cuti pada Tanggal ...</h3>
                                        </div>
                                        <span id="detail-count-badge" class="text-[11px] uppercase tracking-[0.18em] text-slate-300 bg-slate-900/60 border border-slate-700/60 px-2.5 py-1 rounded-full">
                                            0 cuti
                                        </span>
                                    </div>
                                    <div id="detail-meta" class="mt-3 flex flex-wrap gap-2"></div>
                                </div>

                                <div class="flex-grow overflow-y-auto p-4 min-h-0 custom-scrollbar bg-[#0f172a]/50">
                                    <div id="detail-list" class="space-y-3">
                                        <div class="flex flex-col items-center justify-center h-40 text-slate-500">
                                            <p>Pilih tanggal pada kalender</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <footer class="mt-auto px-4 md:px-8 py-3 text-xs text-slate-500 border-t border-slate-800 bg-[#020617]/80 backdrop-blur">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <span>Monitor Data Cuti Karyawan</span>
                    <span>Sinkron terakhir: <span id="last-sync-label">Belum ada</span></span>
                </div>
            </footer>

            <div class="hidden" aria-hidden="true">
                <div id="calendar-month-summary"></div>
                <div id="hero-stats"></div>
            </div>
        </main>

        <div id="detail-modal" class="fixed inset-0 z-50 hidden" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div class="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity opacity-0" id="modal-backdrop"></div>

            <div class="fixed inset-0 z-10 overflow-y-auto">
                <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                    <div class="relative transform overflow-hidden rounded-xl bg-[#1e293b] border border-border-color text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md opacity-0 scale-95" id="modal-panel">
                        <div class="px-6 py-5 border-b border-border-color flex justify-between items-center">
                            <h3 class="text-lg font-bold text-white">Detail Cuti</h3>
                            <button onclick="closeModal()" class="text-slate-400 hover:text-white"><i class="ph-bold ph-x"></i></button>
                        </div>

                        <div class="px-6 py-6" id="modal-content"></div>

                        <div class="px-6 py-4 bg-[#0f172a] border-t border-border-color flex justify-end">
                            <button onclick="closeModal()" class="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-600">Tutup</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
})();
