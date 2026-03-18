const SUPABASE_URL = "https://xykbbbnqcvviygfqcped.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5a2JiYm5xY3Z2aXlnZnFjcGVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NzY0MjgsImV4cCI6MjA3NDQ1MjQyOH0.CrEUnvWH74NYLcETjIiLyUJtuO999a-MonSetKDKHP0";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember"
];

const dom = {
    heroStats: document.getElementById("hero-stats"),
    liveStatusBadge: document.getElementById("live-status-badge"),
    appStateBanner: document.getElementById("app-state-banner"),
    lastSyncLabel: document.getElementById("last-sync-label"),
    jumpTodayButton: document.getElementById("jump-today"),
    dataView: document.getElementById("data-view"),
    calendarView: document.getElementById("calendar-view"),
    dataMonthYear: document.getElementById("data-month-year"),
    dataResultMeta: document.getElementById("data-result-meta"),
    dataActiveFilters: document.getElementById("data-active-filters"),
    dataSummary: document.getElementById("data-summary"),
    dataList: document.getElementById("data-list"),
    dataSearch: document.getElementById("data-search"),
    dataFilterToggleButton: document.getElementById("toggle-data-filters"),
    dataToolbarControls: document.getElementById("data-toolbar-controls"),
    filterGroup: document.getElementById("filter-group"),
    filterJabatan: document.getElementById("filter-jabatan"),
    filterJenis: document.getElementById("filter-jenis"),
    resetFiltersButton: document.getElementById("reset-filters"),
    calendarMonthYear: document.getElementById("cal-month-year"),
    calendarGrid: document.getElementById("calendar-grid"),
    calendarMonthSummary: document.getElementById("calendar-month-summary"),
    detailTitle: document.getElementById("detail-title"),
    detailMeta: document.getElementById("detail-meta"),
    detailList: document.getElementById("detail-list"),
    detailCountBadge: document.getElementById("detail-count-badge"),
    tabData: document.getElementById("tab-data"),
    tabCalendar: document.getElementById("tab-calendar"),
    modal: document.getElementById("detail-modal"),
    modalBackdrop: document.getElementById("modal-backdrop"),
    modalPanel: document.getElementById("modal-panel"),
    modalContent: document.getElementById("modal-content")
};

const state = {
    allCutiData: [],
    calendarYear: new Date().getFullYear(),
    calendarMonth: new Date().getMonth(),
    dataViewYear: new Date().getFullYear(),
    dataViewMonth: new Date().getMonth(),
    selectedDayElement: null,
    isLoading: false,
    fetchError: "",
    realtimeStatus: "loading",
    lastSyncAt: null
};

let realtimeChannel = null;
let activeToastTimeout = null;

function debounce(fn, delay) {
    let timer = null;
    return function debounced(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

function escapeHtml(value) {
    return (value ?? "")
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function safeMultilineText(value) {
    const escaped = escapeHtml(value || "-");
    return escaped.replace(/\n/g, "<br>");
}

function normalizeText(value, fallback = "-") {
    const cleaned = (value ?? "").toString().trim();
    return cleaned || fallback;
}

function normalizeDateString(value) {
    const cleaned = (value ?? "").toString().trim().replace(/^"+|"+$/g, "");
    if (!cleaned) {
        return "";
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
        return cleaned;
    }
    const parsed = new Date(cleaned);
    if (Number.isNaN(parsed.getTime())) {
        return "";
    }
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function parseDateList(rawValue) {
    let values = [];

    if (Array.isArray(rawValue)) {
        values = rawValue;
    } else if (typeof rawValue === "string") {
        try {
            const parsed = JSON.parse(rawValue);
            values = Array.isArray(parsed) ? parsed : rawValue.split(",");
        } catch (error) {
            values = rawValue.split(",");
        }
    }

    return values
        .map((entry) => normalizeDateString(entry))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
}

function parseDateValue(value) {
    const cleaned = normalizeText(value, "");
    if (!cleaned) {
        return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
        const [year, month, day] = cleaned.split("-").map(Number);
        return new Date(year, month - 1, day);
    }

    const parsed = new Date(cleaned);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(dateString, options) {
    const parsed = parseDateValue(dateString);
    if (!parsed) {
        return normalizeText(dateString);
    }
    return parsed.toLocaleDateString("id-ID", options);
}

function formatShortDate(dateString) {
    return formatDate(dateString, { day: "numeric", month: "short" });
}

function formatLongDate(dateString) {
    return formatDate(dateString, { day: "numeric", month: "long", year: "numeric" });
}

function formatMonthLabel(month, year) {
    return `${monthNames[month]} ${year}`;
}

function getMonthPrefix(year, month) {
    return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatSyncTimestamp(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return "Belum ada";
    }
    return date.toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function getAvatarLabel(name) {
    const cleaned = normalizeText(name, "");
    if (!cleaned) {
        return "?";
    }

    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
        return escapeHtml(parts[0].slice(0, 1).toUpperCase());
    }

    return escapeHtml(`${parts[0][0]}${parts[1][0]}`.toUpperCase());
}

function formatGroupLabel(group) {
    const cleaned = normalizeText(group);
    if (cleaned === "-") {
        return "-";
    }

    if (/^group\b/i.test(cleaned)) {
        return cleaned;
    }

    return `Group ${cleaned}`;
}

function countUnique(values) {
    return new Set(values.filter(Boolean)).size;
}

function getJenisCutiBadgeClasses(jenis) {
    const value = normalizeText(jenis, "").toUpperCase();
    if (value.includes("TAHUNAN")) {
        return "text-emerald-300 bg-emerald-500/10 border border-emerald-500/40";
    }
    if (value.includes("ALASAN PENTING")) {
        return "text-amber-300 bg-amber-500/10 border border-amber-500/40";
    }
    if (value.includes("SAKIT")) {
        return "text-rose-300 bg-rose-500/10 border border-rose-500/40";
    }
    return "text-slate-300 bg-slate-500/10 border border-slate-500/40";
}

function toSafeUrl(url) {
    const cleaned = normalizeText(url, "");
    if (!cleaned) {
        return null;
    }

    try {
        const parsed = new URL(cleaned);
        return /^https?:$/i.test(parsed.protocol) ? parsed.toString() : null;
    } catch (error) {
        return null;
    }
}

function isDataViewActive() {
    return !dom.dataView.classList.contains("hidden");
}

function setLastSync(date = new Date()) {
    state.lastSyncAt = date;
    dom.lastSyncLabel.textContent = formatSyncTimestamp(date);
}

function setRealtimeStatus(status) {
    state.realtimeStatus = status;
    updateLiveStatusBadge();
    renderAppBanner();
}

function updateLiveStatusBadge() {
    const badge = dom.liveStatusBadge;
    badge.className = "status-pill";

    let label = "Sinkron realtime aktif";
    if (state.realtimeStatus === "loading") {
        badge.classList.add("is-loading");
        label = "Menyambungkan realtime";
    } else if (state.realtimeStatus === "offline") {
        badge.classList.add("is-offline");
        label = "Realtime belum stabil";
    }

    badge.innerHTML = `
        <span class="status-dot"></span>
        ${escapeHtml(label)}
    `;
}

function renderAppBanner() {
    const banner = dom.appStateBanner;

    if (state.fetchError) {
        banner.className = "app-banner app-banner--error";
        banner.innerHTML = `
            <div class="flex items-start gap-3">
                <i class="ph-bold ph-warning text-lg mt-0.5"></i>
                <div>
                    <p class="font-bold">Data cuti gagal dimuat.</p>
                    <p class="text-sm opacity-90">${escapeHtml(state.fetchError)}</p>
                </div>
            </div>
            <span class="text-xs uppercase tracking-[0.2em] opacity-75">Perlu refresh data</span>
        `;
        return;
    }

    if (state.isLoading && state.allCutiData.length === 0) {
        banner.className = "app-banner app-banner--loading";
        banner.innerHTML = `
            <div class="flex items-start gap-3">
                <i class="ph-bold ph-spinner-gap animate-spin text-lg mt-0.5"></i>
                <div>
                    <p class="font-bold">Mengambil data cuti terbaru...</p>
                    <p class="text-sm opacity-90">Dashboard akan terisi otomatis setelah data masuk dari Supabase.</p>
                </div>
            </div>
            <span class="text-xs uppercase tracking-[0.2em] opacity-75">Loading</span>
        `;
        return;
    }

    if (state.realtimeStatus === "offline" && state.allCutiData.length > 0) {
        banner.className = "app-banner app-banner--neutral";
        banner.innerHTML = `
            <div class="flex items-start gap-3">
                <i class="ph-bold ph-plugs-connected text-lg mt-0.5"></i>
                <div>
                    <p class="font-bold">Data terakhir tetap tersedia.</p>
                    <p class="text-sm opacity-90">Listener realtime belum stabil. Dashboard masih menampilkan hasil sinkron terakhir.</p>
                </div>
            </div>
            <span class="text-xs uppercase tracking-[0.2em] opacity-75">Fallback mode</span>
        `;
        return;
    }

    banner.className = "hidden";
    banner.innerHTML = "";
}

function showToast(message, tone = "info") {
    const existingToast = document.getElementById("app-toast");
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement("div");
    toast.id = "app-toast";
    toast.className = "fixed bottom-5 right-5 z-50 max-w-sm rounded-2xl border px-4 py-3 text-sm font-semibold shadow-2xl backdrop-blur";

    let iconClass = "ph-bold ph-info";
    let borderColor = "rgba(103, 232, 249, 0.3)";
    let background = "linear-gradient(135deg, rgba(8, 145, 178, 0.88), rgba(14, 165, 233, 0.8))";
    let color = "#f0f9ff";

    if (tone === "error") {
        iconClass = "ph-bold ph-warning";
        borderColor = "rgba(251, 113, 133, 0.3)";
        background = "linear-gradient(135deg, rgba(190, 24, 93, 0.88), rgba(244, 63, 94, 0.8))";
        color = "#fff1f2";
    }

    toast.style.borderColor = borderColor;
    toast.style.background = background;
    toast.style.color = color;
    toast.innerHTML = `
        <div class="flex items-center gap-3">
            <i class="${iconClass} text-base"></i>
            <span>${escapeHtml(message)}</span>
        </div>
    `;

    document.body.appendChild(toast);

    if (activeToastTimeout) {
        clearTimeout(activeToastTimeout);
    }

    activeToastTimeout = setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(8px)";
        toast.style.transition = "opacity 180ms ease, transform 180ms ease";
        setTimeout(() => toast.remove(), 200);
    }, 2600);
}

function renderHeroStatsSkeleton() {
    dom.heroStats.innerHTML = `
        <div class="hero-stat-skeleton"></div>
        <div class="hero-stat-skeleton"></div>
        <div class="hero-stat-skeleton"></div>
        <div class="hero-stat-skeleton"></div>
    `;
}
