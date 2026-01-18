// --- KONFIGURASI SUPABASE ---
const SUPABASE_URL = 'https://xykbbbnqcvviygfqcped.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5a2JiYm5xY3Z2aXlnZnFjcGVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NzY0MjgsImV4cCI6MjA3NDQ1MjQyOH0.CrEUnvWH74NYLcETjIiLyUJtuO999a-MonSetKDKHP0';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let allCutiData = [];
let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth();
let selectedDayElement = null; 
let dataViewYear = new Date().getFullYear();
let dataViewMonth = new Date().getMonth();
let isLoading = false;

function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

function getJenisCutiBadgeClasses(jenis) {
    const value = (jenis || '').toString().toUpperCase();
    if (value.includes('TAHUNAN')) {
        return 'text-emerald-300 bg-emerald-500/10 border border-emerald-500/40';
    }
    if (value.includes('ALASAN PENTING')) {
        return 'text-amber-300 bg-amber-500/10 border border-amber-500/40';
    }
    return 'text-slate-300 bg-slate-500/10 border border-slate-500/40';
}

async function fetchCutiData() {
    isLoading = true;
    const dataViewElement = document.getElementById('data-view');
    if (dataViewElement && !dataViewElement.classList.contains('hidden')) {
        renderDataListSkeleton();
    }
    try {
        let { data: cutiData, error } = await supabaseClient
            .from('cuti')
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
            .order('tanggal_pengajuan', { ascending: false });

        if (error) throw error;

        allCutiData = cutiData.map(cuti => {
            const userName = cuti.nama || (cuti.users ? cuti.users.name : 'Nama Tidak Diketahui');
            let tanggalList = [];
            try {
                tanggalList = JSON.parse(cuti.list_tanggal_cuti);
                if (!Array.isArray(tanggalList)) {
                    tanggalList = cuti.list_tanggal_cuti ? cuti.list_tanggal_cuti.split(',').map(t => t.trim()).filter(t => t) : [];
                }
            } catch (e) {
                tanggalList = cuti.list_tanggal_cuti ? cuti.list_tanggal_cuti.split(',').map(t => t.trim()).filter(t => t) : [];
            }

            const jenisCuti = cuti.jenis_cuti || cuti.alasan_cuti || 'Tidak Ditentukan';

            return {
                id: cuti.id,
                nama: userName,
                jenisCuti,
                alasanCuti: cuti.alasan_cuti || '',
                lamaHari: cuti.lama_cuti,
                tanggalPengajuan: cuti.tanggal_pengajuan,
                tanggalCutiList: tanggalList,
                jabatan: cuti.users ? cuti.users.jabatan : 'N/A',
                group: cuti.users && cuti.users.group ? cuti.users.group : '-', 
                sisaCuti: typeof cuti.sisa_cuti === 'number' ? cuti.sisa_cuti : null,
                userId: cuti.users_id,
                kunciCuti: cuti.kunci_cuti === true,
                urlTTD: cuti.url_ttd || null
            };
        });
        populateFilters();
        return allCutiData;
    } catch (error) {
        console.error('Error mengambil data:', error.message);
        return [];
    } finally {
        isLoading = false;
    }
}

// --- FUNGSI REALTIME (AUTO UPDATE) ---
function setupRealtimeListener() {
    console.log("Mengaktifkan Realtime Listener...");
    
    supabaseClient
        .channel('public:cuti') // Nama channel bebas
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cuti' }, async (payload) => {
            console.log('Perubahan Data Terdeteksi:', payload);
            
            // Tampilkan notifikasi kecil
            showToast("Data diperbarui...", "blue");

            // Ambil data terbaru
            await fetchCutiData();

            // Refresh tampilan sesuai tab yang aktif
            const dataView = document.getElementById('data-view');
            const isDataViewActive = !dataView.classList.contains('hidden');

            if (isDataViewActive) {
                updateDataList(); // Refresh list data
            } else {
                // Refresh kalender dengan posisi bulan/tahun yang sedang dilihat user
                renderCalendar(allCutiData, calendarYear, calendarMonth, false);
                
                // Jika user sedang memilih hari, refresh detail hariannya juga
                if (selectedDayElement) {
                   const dateString = selectedDayElement.dataset.date;
                   const cutiOnThisDay = allCutiData.filter(item => item.tanggalCutiList && item.tanggalCutiList.includes(dateString));
                   displayDailyDetail(dateString, cutiOnThisDay);
                }
            }
        })
        .subscribe();
}

// Helper: Tampilkan Toast Notifikasi Sederhana
function showToast(message, color = "blue") {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-5 right-5 bg-${color}-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-semibold z-50 animate-bounce transition-opacity duration-500`;
    toast.innerHTML = `<i class="ph-bold ph-arrows-clockwise mr-2"></i> ${message}`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('opacity-0');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// --- MODAL LOGIC (Calendar View) ---
const modal = document.getElementById('detail-modal');
const modalBackdrop = document.getElementById('modal-backdrop');
const modalPanel = document.getElementById('modal-panel');
const modalContent = document.getElementById('modal-content');

function openModal(item) {
    const formattedDates = item.tanggalCutiList.map(date => {
        const d = new Date(date);
        return `<span class="bg-blue-900/30 text-blue-400 border border-blue-900 px-2 py-0.5 rounded text-xs">${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>`;
    }).join(' ');

    const sisaCutiLabel = typeof item.sisaCuti === 'number'
        ? `${item.sisaCuti} Hari`
        : 'Tidak tersedia';

    modalContent.innerHTML = `
        <div class="flex items-start gap-4 mb-4">
            <div class="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl border border-blue-400/30">
                ${item.nama.charAt(0)}
            </div>
            <div>
                <h4 class="text-xl font-bold text-white">${item.nama}</h4>
                <div class="flex items-center gap-2 text-sm text-slate-400">
                    <span>${item.jabatan}</span>
                    <span class="w-1 h-1 rounded-full bg-slate-600"></span>
                    <span class="text-blue-400 font-medium">Group ${item.group}</span>
                </div>
            </div>
        </div>
        
        <div class="bg-[#0f172a] rounded-lg p-4 border border-border-color space-y-3">
            <div class="flex items-center justify-between">
                <span class="text-sm text-slate-500">Durasi</span>
                <span class="text-sm font-bold text-white">${item.lamaHari} Hari</span>
            </div>
            <div class="flex items-center justify-between">
                <span class="text-sm text-slate-500">Sisa Cuti</span>
                <span class="text-sm font-medium text-slate-200">${sisaCutiLabel}</span>
            </div>
            <div class="flex items-center justify-between">
                <span class="text-sm text-slate-500">Jenis Cuti</span>
                <span class="text-xs font-semibold tracking-wide uppercase px-2 py-1 rounded-full text-right ${getJenisCutiBadgeClasses(item.jenisCuti)}">
                    ${item.jenisCuti}
                </span>
            </div>
            <div>
                <span class="text-sm text-slate-500 block mb-1">Alasan</span>
                <p class="text-sm text-slate-200 bg-slate-900/40 border border-slate-700/60 rounded-md px-3 py-2 max-h-32 overflow-y-auto">
                    ${item.alasanCuti || '-'}
                </p>
            </div>
            <div>
                <span class="text-sm text-slate-500 block mb-2">Tanggal</span>
                <div class="flex flex-wrap gap-2">
                        ${formattedDates || '-'}
                </div>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
    void modal.offsetWidth; 
    modalBackdrop.classList.remove('opacity-0');
    modalPanel.classList.remove('opacity-0', 'scale-95');
    modalPanel.classList.add('opacity-100', 'scale-100');
}

function closeModal() {
    modalBackdrop.classList.add('opacity-0');
    modalPanel.classList.remove('opacity-100', 'scale-100');
    modalPanel.classList.add('opacity-0', 'scale-95');
    setTimeout(() => { modal.classList.add('hidden'); }, 200); 
}
modalBackdrop.addEventListener('click', closeModal);

// --- DATA VIEW LOGIC (FILTERS & SEARCH) ---
const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function updateDataViewHeader() {
    document.getElementById('data-month-year').textContent = `${monthNames[dataViewMonth]} ${dataViewYear}`;
}

function populateFilters() {
    const groups = [...new Set(allCutiData.map(item => item.group))].sort();
    const jabatans = [...new Set(allCutiData.map(item => item.jabatan))].sort();
    const jenisList = [...new Set(allCutiData.map(item => item.jenisCuti).filter(Boolean))].sort();

    const groupSelect = document.getElementById('filter-group');
    const jabatanSelect = document.getElementById('filter-jabatan');
    const jenisSelect = document.getElementById('filter-jenis');

    const currentGroup = groupSelect.value;
    const currentJabatan = jabatanSelect.value;
    const currentJenis = jenisSelect ? jenisSelect.value : 'all';

    groupSelect.innerHTML = '<option value="all">Semua Group</option>';
    jabatanSelect.innerHTML = '<option value="all">Semua Jabatan</option>';
    if (jenisSelect) {
        jenisSelect.innerHTML = '<option value="all">Semua Jenis Cuti</option>';
    }

    groups.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g;
        opt.textContent = g;
        groupSelect.appendChild(opt);
    });

    jabatans.forEach(j => {
        const opt = document.createElement('option');
        opt.value = j;
        opt.textContent = j;
        jabatanSelect.appendChild(opt);
    });

    if (jenisSelect) {
        jenisList.forEach(jenis => {
            const opt = document.createElement('option');
            opt.value = jenis;
            opt.textContent = jenis;
            jenisSelect.appendChild(opt);
        });
    }

    if(groups.includes(currentGroup)) groupSelect.value = currentGroup;
    if(jabatans.includes(currentJabatan)) jabatanSelect.value = currentJabatan;
    if(jenisSelect && jenisList.includes(currentJenis)) jenisSelect.value = currentJenis;
}

function navigateDataMonth(dir) {
    dataViewMonth += dir;
    if (dataViewMonth > 11) {
        dataViewMonth = 0;
        dataViewYear++;
    } else if (dataViewMonth < 0) {
        dataViewMonth = 11;
        dataViewYear--;
    }
    updateDataViewHeader();
    updateDataList();
}

const jenisFilterElement = document.getElementById('filter-jenis');
const debouncedUpdateDataList = debounce(() => updateDataList(), 250);
document.getElementById('data-search').addEventListener('input', debouncedUpdateDataList);
document.getElementById('filter-group').addEventListener('change', () => updateDataList());
document.getElementById('filter-jabatan').addEventListener('change', () => updateDataList());
if (jenisFilterElement) {
    jenisFilterElement.addEventListener('change', () => updateDataList());
}

function calculateDataSummary(data) {
    let totalPengajuan = data.length;
    let totalHari = 0;
    let totalTerkunci = 0;

    data.forEach(item => {
        const durasi = Number(item.lamaHari) || 0;
        totalHari += durasi;
        if (item.kunciCuti) totalTerkunci += 1;
    });

    const rataRata = totalPengajuan > 0 ? totalHari / totalPengajuan : 0;

    return {
        totalPengajuan,
        totalHari,
        rataRata,
        totalTerkunci
    };
}

function renderDataSummary(data) {
    const summaryElement = document.getElementById('data-summary');
    if (!summaryElement) return;

    if (!data || data.length === 0) {
        summaryElement.innerHTML = `
            <div class="glass-panel p-3 md:p-4 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-slate-900/80 flex items-center justify-center text-slate-400">
                        <i class="ph-duotone ph-briefcase"></i>
                    </div>
                    <div>
                        <p class="text-[11px] uppercase tracking-wide text-slate-400">Ringkasan</p>
                        <p class="text-sm text-slate-300">Tidak ada pengajuan cuti pada bulan ini.</p>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    const summary = calculateDataSummary(data);
    const rataRataLabel = summary.rataRata % 1 === 0 ? summary.rataRata.toString() : summary.rataRata.toFixed(1);

    summaryElement.innerHTML = `
        <div class="glass-panel p-3 md:p-4 flex flex-col md:flex-row items-stretch gap-3 md:gap-4">
            <div class="flex-1 flex items-center gap-3">
                <div class="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                    <i class="ph-duotone ph-files"></i>
                </div>
                <div>
                    <p class="text-[11px] uppercase tracking-wide text-slate-400">Total Pengajuan</p>
                    <p class="text-lg font-bold text-white">${summary.totalPengajuan}</p>
                    <p class="text-[11px] text-slate-500 mt-0.5">${summary.totalTerkunci} terkunci</p>
                </div>
            </div>
            <div class="flex-1 flex items-center gap-3">
                <div class="w-9 h-9 rounded-full bg-sky-500/15 border border-sky-400/40 flex items-center justify-center text-sky-300">
                    <i class="ph-duotone ph-sun-dim"></i>
                </div>
                <div>
                    <p class="text-[11px] uppercase tracking-wide text-slate-400">Total Hari Cuti</p>
                    <p class="text-lg font-bold text-white">${summary.totalHari}</p>
                </div>
            </div>
            <div class="flex-1 flex items-center gap-3">
                <div class="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-300">
                    <i class="ph-duotone ph-activity"></i>
                </div>
                <div>
                    <p class="text-[11px] uppercase tracking-wide text-slate-400">Rata-rata Hari/Pengajuan</p>
                    <p class="text-lg font-bold text-white">${rataRataLabel}</p>
                </div>
            </div>
        </div>
    `;
}

function renderDataListSkeleton() {
    const dataList = document.getElementById('data-list');
    if (!dataList) return;

    let skeletonCards = '';
    for (let i = 0; i < 6; i++) {
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

    dataList.innerHTML = skeletonCards;
}

function updateDataList() {
    const searchTerm = document.getElementById('data-search').value.toLowerCase();
    const filterGroup = document.getElementById('filter-group').value;
    const filterJabatan = document.getElementById('filter-jabatan').value;
    const filterJenis = jenisFilterElement ? jenisFilterElement.value : 'all';

    let filtered = allCutiData.filter(item => {
        if (!item.tanggalPengajuan) return false;
        const date = new Date(item.tanggalPengajuan);
        return date.getFullYear() === dataViewYear && date.getMonth() === dataViewMonth;
    });
    
    if (filterGroup !== 'all') {
        filtered = filtered.filter(item => item.group === filterGroup);
    }

    if (filterJabatan !== 'all') {
        filtered = filtered.filter(item => item.jabatan === filterJabatan);
    }

    if (filterJenis !== 'all') {
        filtered = filtered.filter(item => (item.jenisCuti || '').toString() === filterJenis);
    }

    if (searchTerm) {
        filtered = filtered.filter(item => 
            item.nama.toLowerCase().includes(searchTerm) || 
            item.jabatan.toLowerCase().includes(searchTerm) ||
            item.group.toLowerCase().includes(searchTerm)
        );
    }
    
    renderDataList(filtered);
    renderDataSummary(filtered);
}

function renderDataList(data) {
    const dataList = document.getElementById('data-list');
    dataList.innerHTML = ''; 

    if (data.length === 0) {
        dataList.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-10 text-slate-500">
                <i class="ph-duotone ph-magnifying-glass text-4xl mb-2 opacity-50"></i>
                <p>Tidak ada data cuti yang sesuai filter.</p>
            </div>`;
        return;
    }
    
    data.forEach(item => {
        const formattedDates = item.tanggalCutiList.map(date => {
            const d = new Date(date);
            return `<span class="bg-blue-900/20 text-blue-300 border border-blue-500/20 px-1.5 py-0.5 rounded text-[10px]">${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>`;
        }).join('');
        const lockedBadge = item.kunciCuti
            ? `<span class="absolute right-4 top-4 text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-400/40">Terkunci</span>`
            : '';

        const card = document.createElement('div');
        card.className = 'glass-card p-4 md:p-5 transition-all duration-300 flex flex-col gap-3 relative overflow-hidden';
        
        card.onclick = () => openModal(item);

        card.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-slate-700/50 border border-slate-600 flex items-center justify-center text-blue-400 font-bold shrink-0">
                    ${item.nama.charAt(0)}
                </div>
                <div class="overflow-hidden flex-grow">
                    <h4 class="font-bold text-white text-base truncate">${item.nama}</h4>
                    <div class="flex items-center gap-2 text-xs text-slate-400">
                        <span class="truncate max-w-[50%]">${item.jabatan}</span>
                        <span class="w-1 h-1 rounded-full bg-slate-600"></span>
                        <span class="truncate max-w-[40%] text-slate-500">${item.group}</span>
                    </div>
                </div>
            </div>
            ${lockedBadge}
            
            <div class="bg-[#0f172a]/50 p-3 rounded-lg border border-slate-700/50 space-y-2">
                <div>
                    <p class="text-xs text-slate-500 mb-1">Jenis Cuti</p>
                    <p class="text-[11px] font-semibold tracking-wide uppercase inline-flex px-2 py-1 rounded-full ${getJenisCutiBadgeClasses(item.jenisCuti)}">
                        ${item.jenisCuti}
                    </p>
                </div>
                <div>
                    <p class="text-xs text-slate-500 mb-1">Alasan</p>
                    <p class="text-xs text-slate-200 line-clamp-2">
                        ${item.alasanCuti || '-'}
                    </p>
                </div>
            </div>

            <div class="pt-2 border-t border-slate-700/50 flex justify-between items-center">
                    <div class="flex items-center gap-1.5 text-xs text-slate-400">
                        <i class="ph-fill ph-calendar-blank"></i>
                        <span>Diajukan: ${new Date(item.tanggalPengajuan).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}</span>
                    </div>
                    <div class="flex flex-col items-end gap-1">
                        <span class="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">${item.lamaHari} Hari</span>
                        <span class="text-[10px] text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                            Sisa: ${typeof item.sisaCuti === 'number' ? item.sisaCuti + ' Hari' : 'Tidak tersedia'}
                        </span>
                    </div>
            </div>

            <div class="mt-1">
                <p class="text-[10px] text-slate-500 mb-2 uppercase tracking-wider font-semibold">Tanggal Cuti:</p>
                <div class="flex flex-wrap gap-1.5">
                    ${formattedDates.length > 0 ? formattedDates : '<span class="text-xs text-slate-600 italic">Data tanggal error</span>'}
                </div>
            </div>
        `;
        dataList.appendChild(card);
    });
}

// --- HELPER DATE ---
function getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// --- CALENDER RENDER ---
function renderCalendar(data, year, month, autoSelectToday = false) {
    const calendarGrid = document.getElementById('calendar-grid');
    calendarGrid.innerHTML = '';
    
    document.getElementById('cal-month-year').textContent = `${monthNames[month]} ${year}`;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; 
    
    let dayCounter = 1;
    let todayElement = null;

    for (let i = 0; i < firstDayIndex; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'calendar-day opacity-20'; 
        calendarGrid.appendChild(emptyDiv);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const currentDateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const cutiOnThisDay = data.filter(item => item.tanggalCutiList && item.tanggalCutiList.includes(currentDateString));
        const isToday = currentDateString === getTodayDateString();

        const dayDiv = document.createElement('div');
        dayDiv.className = `calendar-day group`; 
        dayDiv.dataset.date = currentDateString;

        const dayNumber = document.createElement('div');
        dayNumber.className = `text-sm font-medium mb-2 text-slate-300 w-8 h-8 flex items-center justify-center rounded-full transition-all`;
        
        if (isToday) {
            dayNumber.classList.add('border', 'border-blue-500', 'text-blue-400'); 
        }

        dayNumber.textContent = day;
        dayDiv.appendChild(dayNumber);

        if (cutiOnThisDay.length > 0) {
            const indicator = document.createElement('div');
            indicator.className = 'mt-1 text-[10px] font-medium text-slate-400 group-hover:text-blue-300 transition-colors bg-slate-800/50 px-2 py-0.5 rounded-full border border-slate-700/50 group-hover:border-blue-500/30';
            indicator.textContent = `${cutiOnThisDay.length} Orang`;
            dayDiv.appendChild(indicator);
        }
        
        if (isToday && autoSelectToday) todayElement = dayDiv;
        
        dayDiv.addEventListener('click', () => selectDayHandler(dayDiv, dayNumber, currentDateString, cutiOnThisDay));
        calendarGrid.appendChild(dayDiv);
        dayCounter++;
    }
    
    const totalCells = firstDayIndex + daysInMonth;
    const remaining = 7 - (totalCells % 7);
    if (remaining < 7) {
        for(let i=0; i<remaining; i++){
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'calendar-day opacity-20';
            calendarGrid.appendChild(emptyDiv);
        }
    }
    
    if (todayElement) {
        const todayDateString = getTodayDateString();
        const cutiOnToday = data.filter(item => item.tanggalCutiList && item.tanggalCutiList.includes(todayDateString));
        todayElement.click();
    } else {
        document.getElementById('detail-title').textContent = `Pilih Tanggal`;
        document.getElementById('detail-list').innerHTML = `<div class="flex flex-col items-center justify-center h-40 text-slate-500"><p>Pilih tanggal pada kalender</p></div>`;
    }
}

function selectDayHandler(dayDiv, numberElement, dateString, dailyData) {
    if (selectedDayElement) {
        const oldNumber = selectedDayElement.querySelector('.w-8'); 
        if(oldNumber) {
            oldNumber.classList.remove('bg-blue-600', 'text-white', 'font-bold');
            oldNumber.classList.add('text-slate-300');
            if(selectedDayElement.dataset.date === getTodayDateString()) {
                    oldNumber.classList.add('border', 'border-blue-500', 'text-blue-400');
                    oldNumber.classList.remove('text-slate-300');
            }
        }
    }
    
    numberElement.classList.remove('text-slate-300', 'border', 'border-blue-500', 'text-blue-400');
    numberElement.classList.add('bg-blue-600', 'text-white', 'font-bold'); 
    
    selectedDayElement = dayDiv;
    displayDailyDetail(dateString, dailyData);
}

function displayDailyDetail(dateString, dailyData) {
    const detailList = document.getElementById('detail-list');
    const detailTitle = document.getElementById('detail-title');
    
    const d = new Date(dateString);
    const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    
    detailTitle.textContent = `Cuti pada ${dateStr}`;
    detailList.innerHTML = '';
    
    if (dailyData.length === 0) {
        detailList.innerHTML = `
            <div class="flex flex-col items-center justify-center h-40 text-slate-500">
                <i class="ph-duotone ph-check-circle text-3xl mb-2 text-slate-600"></i>
                <p class="text-sm">Tidak ada yang cuti</p>
            </div>`;
        return;
    }

    // --- SORTING LOGIC ADDED HERE ---
    // Sort dailyData by Group (Alphabetical)
    dailyData.sort((a, b) => {
        const groupA = (a.group || '').toString().toLowerCase();
        const groupB = (b.group || '').toString().toLowerCase();
        if (groupA < groupB) return -1;
        if (groupA > groupB) return 1;
        return 0;
    });
    
    dailyData.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'glass-card-sm p-3 hover:border-blue-500/60 transition cursor-pointer group';

        card.onclick = () => openModal(item);

        card.innerHTML = `
            <div class="flex items-start gap-3">
                <div class="mt-1">
                        <div class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 text-xs">
                            <i class="ph-fill ph-user"></i>
                        </div>
                </div>
                <div class="flex-grow">
                    <div class="flex justify-between items-start">
                        <h4 class="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">${item.nama}</h4>
                    </div>
                    <p class="text-[11px] font-semibold tracking-wide uppercase inline-flex px-2 py-1 rounded-full mb-1 ${getJenisCutiBadgeClasses(item.jenisCuti)}">
                        ${item.jenisCuti}
                    </p>
                    <p class="text-[11px] text-slate-300 mb-1 line-clamp-2">
                        ${item.alasanCuti || '-'}
                    </p>
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-[10px] bg-blue-900/30 text-blue-300 border border-blue-900/50 px-1.5 py-0.5 rounded">
                            ${item.lamaHari} Hari
                        </span>
                        <span class="text-[10px] text-slate-500 border border-slate-700 px-1.5 py-0.5 rounded">
                            ${item.jabatan}
                        </span>
                        <span class="text-[10px] text-emerald-400 border border-emerald-900/30 bg-emerald-900/10 px-1.5 py-0.5 rounded">
                            Group ${item.group}
                        </span>
                    </div>
                </div>
            </div>
        `;
        detailList.appendChild(card);
    });
}

// Navigation Logic
function navigateCalendar(dir) {
    calendarMonth += dir;
    if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; } 
    else if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
    if (selectedDayElement) selectedDayElement = null;
    renderCalendar(allCutiData, calendarYear, calendarMonth, false);
}

const tabData = document.getElementById('tab-data');
const tabCalendar = document.getElementById('tab-calendar');
const dataView = document.getElementById('data-view');
const calendarView = document.getElementById('calendar-view');

function switchTab(viewId) {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.content-view').forEach(v => v.classList.add('hidden'));

    if (viewId === 'data-view') {
        tabData.classList.add('active');
        dataView.classList.remove('hidden');
        updateDataViewHeader();
        updateDataList();
    } else { 
        tabCalendar.classList.add('active');
        calendarView.classList.remove('hidden');
        setTimeout(() => { if(allCutiData.length > 0) renderCalendar(allCutiData, calendarYear, calendarMonth, true); }, 50);
    }
}

tabData.addEventListener('click', () => switchTab('data-view'));
tabCalendar.addEventListener('click', () => switchTab('calendar-view'));

// Calendar Nav Listeners
document.getElementById('cal-prev').addEventListener('click', () => navigateCalendar(-1));
document.getElementById('cal-next').addEventListener('click', () => navigateCalendar(1));

// Data View Nav Listeners
document.getElementById('data-prev').addEventListener('click', () => navigateDataMonth(-1));
document.getElementById('data-next').addEventListener('click', () => navigateDataMonth(1));

window.onload = async function() {
    await fetchCutiData();
    switchTab('calendar-view'); 
    setupRealtimeListener(); // Start listening
};
