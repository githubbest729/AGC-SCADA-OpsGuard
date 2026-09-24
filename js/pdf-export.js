/* ==========================================================================
   AGC SCADA OpsGuard — Compliance PDF export
   Renders an off-screen letterhead sheet and exports via html2pdf.js
   Uses the Pure String Method with embedded image promises to prevent blank outputs.
   ========================================================================== */

const PdfExport = (() => {
  let libPromise = null;

  function loadLib() {
    if (window.html2pdf) return Promise.resolve(window.html2pdf);
    if (libPromise) return libPromise;
    libPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      script.onload = () => resolve(window.html2pdf);
      script.onerror = () => reject(new Error("html2pdf unavailable (offline)"));
      document.head.appendChild(script);
    });
    return libPromise;
  }

  function esc(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function buildLetterhead({ plantName, reportTitle, reportMeta, bodyHtml, engineerName, engineerRole }) {
    const today = new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
    
    return `
    <div style="background-color: #ffffff; width: 760px; box-sizing: border-box; margin: 0 auto; padding: 0;">
      <div style="font-family: 'IBM Plex Sans', Arial, sans-serif; color:#151515; width:100%; padding:0;">
        <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:3px solid #FF7A18; padding-bottom:14px; margin-bottom:18px;">
          <div>
            <div style="font-family:'Oswald', Arial Narrow, sans-serif; font-size:22px; font-weight:600; letter-spacing:0.03em;">AL GURG AUTOMATION &amp; CONTROLS</div>
            <div style="font-size:11px; letter-spacing:0.08em; color:#666; margin-top:2px;">INSTRUMENTATION &amp; CONTROL — SCADA COMPLIANCE REPORT</div>
          </div>
          <div style="text-align:right; font-size:11px; color:#666;">
            <div>Generated: ${esc(today)}</div>
            <div>System: AGC SCADA OpsGuard</div>
          </div>
        </div>

        <h1 style="font-family:'Oswald', Arial Narrow, sans-serif; font-size:19px; margin:0 0 2px;">${esc(reportTitle)}</h1>
        <div style="font-size:12px; color:#555; margin-bottom:16px;">${esc(reportMeta)}</div>

        <div style="font-size:13px; line-height:1.55;">${bodyHtml}</div>

        <div style="margin-top:34px; display:flex; gap:40px; page-break-inside: avoid; break-inside: avoid;">
          <div style="flex:1; border-top:1px solid #999; padding-top:6px; font-size:11px; color:#555;">
            Engineer Sign-off — ${esc(engineerName || "")}${engineerRole ? ", " + esc(engineerRole) : ""}
          </div>
          <div style="flex:1; border-top:1px solid #999; padding-top:6px; font-size:11px; color:#555;">
            Plant Supervisor Sign-off
          </div>
        </div>
        <div style="margin-top:24px; font-size:10px; color:#999; border-top:1px solid #eee; padding-top:8px; page-break-inside: avoid; break-inside: avoid;">
          Al Gurg Automation &amp; Controls · ${esc(plantName || "")} · Generated offline-first via AGC SCADA OpsGuard PWA
        </div>
      </div>
    </div>`;
  }

  function rowsToTable(headers, rows) {
    const thead = `<tr>${headers.map((h) => `<th style="text-align:left; font-size:10.5px; letter-spacing:0.04em; color:#666; border-bottom:1px solid #ccc; padding:6px 8px;">${esc(h)}</th>`).join("")}</tr>`;
    const tbody = rows
      .map(
        (r) =>
          `<tr>${r
            .map((cell) => `<td style="padding:6px 8px; border-bottom:1px solid #eee; font-size:12px;">${esc(cell)}</td>`)
            .join("")}</tr>`
      )
      .join("");
    return `<table style="width:100%; border-collapse:collapse; margin:10px 0 18px;">${thead}${tbody}</table>`;
  }

  function checklistToHtml(steps, checkedMap) {
    return `<div>${steps
      .map((s, i) => {
        const id = s.id || i;
        const checked = checkedMap ? !!checkedMap[id] : false;
        return `<div style="display:flex; gap:8px; padding:5px 0; border-bottom:1px solid #f0f0f0;">
          <div style="width:14px; height:14px; border:1.5px solid #999; margin-top:1px; flex:none; ${checked ? "background:#FF7A18; border-color:#FF7A18;" : ""}"></div>
          <div style="font-size:12.5px; ${checked ? "" : "color:#333;"}">${esc(s.text || s)}</div>
        </div>`;
      })
      .join("")}</div>`;
  }

  async function exportHtml(html, filename) {
    try {
      const html2pdf = await loadLib();
      
      // Pass the raw HTML string directly into .from() — avoiding DOM attach/detach security issues
      await html2pdf()
        .set({
          margin: 24,
          filename: filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { 
            scale: 2, 
            useCORS: true,
            letterRendering: true,
            windowWidth: 760
          },
          jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ['css', 'legacy'] }
        })
        .from(html)
        .save();
        
    } catch (err) {
      console.warn("PDF export failed, falling back to print dialog:", err);
      const win = window.open("", "_blank");
      win.document.write(`<html><head><title>${esc(filename)}</title></head><body style="background:#fff;">${html}</body></html>`);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 300);
    }
  }

  return { buildLetterhead, rowsToTable, checklistToHtml, exportHtml };
})();
