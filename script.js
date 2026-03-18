const appScripts = [
    "scripts/app-shell.js",
    "scripts/core.js",
    "scripts/metrics.js",
    "scripts/data-view.js",
    "scripts/calendar-view.js",
    "scripts/app.js"
];

function loadScriptSequentially(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.async = false;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Gagal memuat ${src}`));
        document.body.appendChild(script);
    });
}

(async function bootstrapApp() {
    try {
        for (const src of appScripts) {
            await loadScriptSequentially(src);
        }
    } catch (error) {
        console.error(error);
        const appRoot = document.getElementById("app-root");
        if (!appRoot) {
            return;
        }

        appRoot.innerHTML = `
            <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#040814;color:#f8fafc;font-family:'Plus Jakarta Sans',sans-serif;">
                <div style="max-width:520px;border:1px solid rgba(251,113,133,0.3);background:rgba(127,29,29,0.18);border-radius:18px;padding:20px 22px;">
                    <p style="margin:0 0 8px;font-size:18px;font-weight:700;">Aplikasi gagal dimuat.</p>
                    <p style="margin:0;color:rgba(248,250,252,0.82);line-height:1.6;">${error.message}</p>
                </div>
            </div>
        `;
    }
})();
