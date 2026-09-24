/* AGC SCADA OpsGuard — application logic (vanilla JS, hash router) */

const $view = document.getElementById("view");
const $modalRegion = document.getElementById("modal-region");
const $toastRegion = document.getElementById("toast-region");

let APP_SETTINGS = { plantName: "AGC Demo Plant — Unit 1", engineerName: "Christian Tosita Espinosa", engineerRole: "SCADA Engineer" };
let deferredInstallPrompt = null;

/* ------------------------------------------------------------------ */
/* Utilities                                                          */
/* ------------------------------------------------------------------ */
function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function fmtDate(d) {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateTime(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const ms = new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.round(ms / 86400000);
}
function toast(msg, type = "ok") {
  const el = document.createElement("div");
  el.className = "toast" + (type === "fault" ? " fault" : "");
  el.textContent = msg;
  $toastRegion.appendChild(el);
  setTimeout(() => el.remove(), 3800);
}
function closeModal() { $modalRegion.innerHTML = ""; }
function openModal(innerHtml) {
  $modalRegion.innerHTML = `<div class="modal-backdrop" id="modalBackdrop"><div class="modal">${innerHtml}</div></div>`;
  document.getElementById("modalBackdrop").addEventListener("click", (e) => {
    if (e.target.id === "modalBackdrop") closeModal();
  });
}

const FREQ_LABEL = { daily: "Daily / Shift", weekly: "Weekly", monthly: "Monthly", quarterly: "Quarterly" };
const FREQ_WINDOW_DAYS = { daily: 1, weekly: 7, monthly: 30, quarterly: 90 };

/* ------------------------------------------------------------------ */
/* Router                                                             */
/* ------------------------------------------------------------------ */
const routes = {
  dashboard: renderDashboard,
  pm: renderPmList,
  pmrun: renderPmRun,
  pmhistory: renderPmHistory,
  equipment: renderEquipment,
  versions: renderVersions,
  licenses: renderLicenses,
  security: renderSecurity,
  securityrun: renderSecurityRun,
  backups: renderBackups,
  settings: renderSettings
};

function parseHash() {
  const raw = location.hash.replace(/^#\//, "");
  const parts = raw.split("/").filter(Boolean);
  return { name: parts[0] || "dashboard", params: parts.slice(1) };
}

async function router() {
  const { name, params } = parseHash();
  const fn = routes[name] || renderDashboard;
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.route === name));
  document.getElementById("sidenav").classList.remove("open");
  try {
    await fn(...params);
  } catch (err) {
    console.error(err);
    $view.innerHTML = `<div class="panel panel-body">Something went wrong rendering this view. Check the console for details.</div>`;
  }
  await refreshNavBadges();
}

window.addEventListener("hashchange", router);

/* ------------------------------------------------------------------ */
/* Nav badges                                                         */
/* ------------------------------------------------------------------ */
async function refreshNavBadges() {
  const [templates, runs, licenses] = await Promise.all([
    OpsDB.getAll("pmTemplates"),
    OpsDB.getAll("pmRuns"),
    OpsDB.getAll("licenses")
  ]);
  const dueCount = templates.filter((t) => isDue(t, runs)).length;
  const pmBadge = document.getElementById("pmBadge");
  if (dueCount > 0) { pmBadge.style.display = "inline-block"; pmBadge.textContent = dueCount; }
  else pmBadge.style.display = "none";

  const expiring = licenses.filter((l) => { const d = daysUntil(l.expiry); return d !== null && d <= 45; }).length;
  const licBadge = document.getElementById("licBadge");
  if (expiring > 0) { licBadge.style.display = "inline-block"; licBadge.textContent = expiring; }
  else licBadge.style.display = "none";
}

function isDue(template, allRuns) {
  const lastCompleted = allRuns
    .filter((r) => r.templateId === template.id && r.status === "completed")
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))[0];
  if (!lastCompleted) return true;
  const windowDays = FREQ_WINDOW_DAYS[template.frequency] || 30;
  return daysUntil(lastCompleted.completedAt) !== null && -daysUntil(lastCompleted.completedAt) >= windowDays;
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                          */
/* ------------------------------------------------------------------ */
async function renderDashboard() {
  const [templates, runs, equipment, licenses, backups, securityRuns] = await Promise.all([
    OpsDB.getAll("pmTemplates"), OpsDB.getAll("pmRuns"), OpsDB.getAll("equipment"),
    OpsDB.getAll("licenses"), OpsDB.getAll("backups"), OpsDB.getAll("securityRuns")
  ]);
  const dueTemplates = templates.filter((t) => isDue(t, runs));
  const expiringLic = licenses.filter((l) => { const d = daysUntil(l.expiry); return d !== null && d <= 45; });
  const lastBackup = backups.slice().sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const failedBackups = backups.filter((b) => b.result === "fail").length;
  const lastSecurityRun = securityRuns.filter(r => r.status === "completed").sort((a,b)=> new Date(b.completedAt)-new Date(a.completedAt))[0];

  $view.innerHTML = `
    <div class="page-head">
      <div><h1>Plant Dashboard</h1><div class="sub">${esc(APP_SETTINGS.plantName)} · ${fmtDateTime(new Date())}</div></div>
      <div class="flex gap-8"><a class="btn btn--primary" href="#/pm">Run a checklist</a></div>
    </div>

    <div class="grid grid-4 mb-16">
      <div class="stat-card ${dueTemplates.length ? "warn" : "ok"}">
        <div class="label">PM TASKS DUE</div>
        <div class="value">${dueTemplates.length}</div>
        <div class="foot">${dueTemplates.length ? "Checklists overdue for this cycle" : "All checklists up to date"}</div>
      </div>
      <div class="stat-card ${expiringLic.length ? "warn" : "ok"}">
        <div class="label">LICENSES / CERTS ≤ 45D</div>
        <div class="value">${expiringLic.length}</div>
        <div class="foot">${expiringLic.length ? "Renewal action required" : "Nothing expiring soon"}</div>
      </div>
      <div class="stat-card ${failedBackups ? "fault" : "ok"}">
        <div class="label">LAST BACKUP VERIFIED</div>
        <div class="value" style="font-size:20px;">${lastBackup ? fmtDate(lastBackup.date) : "—"}</div>
        <div class="foot">${failedBackups ? failedBackups + " failed verification(s) logged" : "All logged backups passed"}</div>
      </div>
      <div class="stat-card ok">
        <div class="label">EQUIPMENT IN REGISTRY</div>
        <div class="value">${equipment.length}</div>
        <div class="foot">${equipment.filter(e=>e.status==="online").length} reporting online</div>
      </div>
    </div>

    <div class="grid grid-2">
      <div class="panel">
        <div class="panel-head"><h3>Checklists due</h3><a class="btn btn--sm btn--ghost" href="#/pm">Open scheduler</a></div>
        <div class="panel-body">
          ${dueTemplates.length === 0 ? `<div class="muted">Nothing due right now. Field engineer coverage is current.</div>` :
            dueTemplates.map(t => `
              <div class="flex gap-12 mb-16" style="justify-content:space-between;">
                <div class="flex gap-8"><span class="led led--amber"></span><div><div>${esc(t.title)}</div><div class="muted mono" style="font-size:11px;">${esc(FREQ_LABEL[t.frequency])}</div></div></div>
                <button class="btn btn--sm btn--primary" data-start-tpl="${t.id}">Start</button>
              </div>`).join("")}
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><h3>Cybersecurity posture</h3><a class="btn btn--sm btn--ghost" href="#/security">Open audit</a></div>
        <div class="panel-body">
          <div class="flex gap-8 mb-16"><span class="led ${lastSecurityRun ? 'led--teal' : 'led--grey'}"></span>
            <div>Last completed quarterly audit: <strong>${lastSecurityRun ? fmtDate(lastSecurityRun.completedAt) : "Never run"}</strong></div>
          </div>
          <div class="flex gap-8 mb-16"><span class="led ${expiringLic.length ? 'led--amber':'led--teal'}"></span>
            <div>${expiringLic.length} license/certificate item(s) within 45 days of expiry</div>
          </div>
          <div class="flex gap-8"><span class="led ${failedBackups ? 'led--red':'led--teal'}"></span>
            <div>${backups.length} backup verification record(s) on file</div>
          </div>
        </div>
      </div>
    </div>
  `;

  $view.querySelectorAll("[data-start-tpl]").forEach((btn) =>
    btn.addEventListener("click", () => startPmRun(btn.dataset.startTpl))
  );
}

/* ------------------------------------------------------------------ */
/* PM Scheduler                                                       */
/* ------------------------------------------------------------------ */
async function renderPmList() {
  const [templates, runs] = await Promise.all([OpsDB.getAll("pmTemplates"), OpsDB.getAll("pmRuns")]);
  const byFreq = ["daily", "weekly", "monthly", "quarterly"];

  $view.innerHTML = `
    <div class="page-head"><div><h1>Preventive Maintenance Scheduler</h1><div class="sub">Interactive checklists, grouped by frequency</div></div></div>
    ${byFreq.map((freq) => {
      const items = templates.filter((t) => t.frequency === freq);
      if (!items.length) return "";
      return `
      <div class="panel mb-16">
        <div class="panel-head"><h3>${esc(FREQ_LABEL[freq])}</h3></div>
        <div class="panel-body">
          <table>
            <thead><tr><th>Checklist</th><th>Steps</th><th>Status</th><th>Last completed</th><th class="text-right">Actions</th></tr></thead>
            <tbody>
              ${items.map((t) => {
                const inProgress = runs.find((r) => r.templateId === t.id && r.status === "in_progress");
                const lastRun = runs.filter((r) => r.templateId === t.id && r.status === "completed")
                  .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))[0];
                const due = isDue(t, runs);
                return `<tr>
                  <td>${esc(t.title)}</td>
                  <td class="mono">${t.steps.length}</td>
                  <td>${inProgress ? `<span class="tag warn">IN PROGRESS</span>` : due ? `<span class="tag fault">DUE</span>` : `<span class="tag ok">CURRENT</span>`}</td>
                  <td class="mono">${lastRun ? fmtDate(lastRun.completedAt) : "—"}</td>
                  <td class="text-right">
                    ${inProgress
                      ? `<a class="btn btn--sm btn--primary" href="#/pmrun/${inProgress.id}">Resume</a>`
                      : `<button class="btn btn--sm" data-start-tpl="${t.id}">Start</button>`}
                  </td>
                </tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>`;
    }).join("")}
  `;
  $view.querySelectorAll("[data-start-tpl]").forEach((btn) =>
    btn.addEventListener("click", () => startPmRun(btn.dataset.startTpl))
  );
}

async function startPmRun(templateId) {
  const template = await OpsDB.get("pmTemplates", templateId);
  if (!template) return;
  const existing = (await OpsDB.getAll("pmRuns")).find((r) => r.templateId === templateId && r.status === "in_progress");
  if (existing) { location.hash = `#/pmrun/${existing.id}`; return; }
  const run = {
    id: OpsDB.uid("run"),
    templateId,
    templateTitle: template.title,
    frequency: template.frequency,
    startedAt: new Date().toISOString(),
    completedAt: null,
    status: "in_progress",
    checks: {},
    remarks: "",
    engineer: APP_SETTINGS.engineerName
  };
  await OpsDB.put("pmRuns", run);
  location.hash = `#/pmrun/${run.id}`;
}

async function renderPmRun(runId) {
  const run = await OpsDB.get("pmRuns", runId);
  if (!run) { $view.innerHTML = `<div class="panel panel-body">Checklist run not found.</div>`; return; }
  const template = await OpsDB.get("pmTemplates", run.templateId);
  const total = template.steps.length;
  const done = Object.values(run.checks).filter(Boolean).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  $view.innerHTML = `
    <div class="page-head">
      <div><h1>${esc(template.title)}</h1><div class="sub mono">${esc(FREQ_LABEL[template.frequency])} · started ${fmtDateTime(run.startedAt)} · ${esc(run.engineer)}</div></div>
      <div class="flex gap-8"><a class="btn btn--ghost" href="#/pm">Back to scheduler</a></div>
    </div>

    <div class="panel mb-16">
      <div class="panel-body">
        <div class="flex gap-12 mb-16"><div class="progress-track" style="flex:1;"><div class="progress-fill" style="width:${pct}%"></div></div><div class="mono" style="font-size:12px;">${done}/${total}</div></div>
        <div id="checklistItems">
          ${template.steps.map((s, i) => `
            <label class="checklist-item ${run.checks[i] ? "done" : ""}" data-idx="${i}">
              <input type="checkbox" ${run.checks[i] ? "checked" : ""} data-check-idx="${i}" />
              <span class="txt">${esc(s)}</span>
            </label>`).join("")}
        </div>
      </div>
    </div>

    <div class="panel mb-16">
      <div class="panel-head"><h3>Remarks / anomalies found</h3></div>
      <div class="panel-body">
        <textarea id="runRemarks" placeholder="Enter any alarms, communication dropouts, or maintenance actions taken">${esc(run.remarks)}</textarea>
      </div>
    </div>

    <div class="flex gap-8" style="justify-content:flex-end;">
      <button class="btn btn--danger" id="btnDiscardRun">Discard run</button>
      <button class="btn" id="btnSaveRun">Save progress</button>
      <button class="btn btn--primary" id="btnCompleteRun">Mark complete &amp; export PDF</button>
    </div>
  `;

  $view.querySelectorAll("[data-check-idx]").forEach((cb) =>
    cb.addEventListener("change", (e) => {
      const idx = e.target.dataset.checkIdx;
      run.checks[idx] = e.target.checked;
      e.target.closest(".checklist-item").classList.toggle("done", e.target.checked);
      const doneNow = Object.values(run.checks).filter(Boolean).length;
      $view.querySelector(".progress-fill").style.width = `${Math.round((doneNow / total) * 100)}%`;
      $view.querySelector(".mono[style*='font-size:12px']").textContent = `${doneNow}/${total}`;
    })
  );

  document.getElementById("btnSaveRun").addEventListener("click", async () => {
    run.remarks = document.getElementById("runRemarks").value;
    await OpsDB.put("pmRuns", run);
    toast("Progress saved locally.");
  });

  document.getElementById("btnDiscardRun").addEventListener("click", async () => {
    if (!confirm("Discard this in-progress checklist run? This can't be undone.")) return;
    await OpsDB.delete("pmRuns", run.id);
    location.hash = "#/pm";
  });

  document.getElementById("btnCompleteRun").addEventListener("click", async () => {
    run.remarks = document.getElementById("runRemarks").value;
    run.completedAt = new Date().toISOString();
    run.status = "completed";
    await OpsDB.put("pmRuns", run);
    toast("Checklist marked complete.");
    await exportPmRunPdf(run, template);
    location.hash = "#/pmhistory";
  });
}

async function exportPmRunPdf(run, template) {
  const stepsHtml = PdfExport.checklistToHtml(template.steps.map((s, i) => ({ id: i, text: s })), run.checks);
  const body = `
    ${stepsHtml}
    <div style="margin-top:16px;"><strong>Remarks / anomalies:</strong><div style="margin-top:4px; white-space:pre-wrap;">${esc(run.remarks) || "None recorded."}</div></div>
  `;
  const html = PdfExport.buildLetterhead({
    plantName: APP_SETTINGS.plantName,
    reportTitle: template.title,
    reportMeta: `${FREQ_LABEL[template.frequency]} maintenance sign-off · Completed ${fmtDateTime(run.completedAt)} · ${esc(run.engineer)}`,
    bodyHtml: body,
    engineerName: APP_SETTINGS.engineerName,
    engineerRole: APP_SETTINGS.engineerRole
  });
  await PdfExport.exportHtml(html, `OpsGuard_${template.title.replace(/\s+/g, "_")}_${run.completedAt.slice(0, 10)}.pdf`);
}

async function renderPmHistory() {
  const runs = (await OpsDB.getAll("pmRuns")).filter((r) => r.status === "completed").sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  $view.innerHTML = `
    <div class="page-head"><div><h1>Checklist History</h1><div class="sub">Completed PM sign-offs, stored locally</div></div></div>
    <div class="panel"><div class="panel-body scroll-x">
      <table>
        <thead><tr><th>Checklist</th><th>Frequency</th><th>Completed</th><th>Engineer</th><th>Remarks</th><th class="text-right">Actions</th></tr></thead>
        <tbody>
          ${runs.length === 0 ? `<tr class="empty-row"><td colspan="6">No completed checklists yet. Run one from the PM Scheduler.</td></tr>` :
            runs.map((r) => `
            <tr>
              <td>${esc(r.templateTitle)}</td>
              <td><span class="tag">${esc(FREQ_LABEL[r.frequency] || r.frequency)}</span></td>
              <td class="mono">${fmtDateTime(r.completedAt)}</td>
              <td>${esc(r.engineer)}</td>
              <td>${r.remarks ? `<span class="tag warn">Noted</span>` : `<span class="tag ok">Clean</span>`}</td>
              <td class="text-right"><button class="btn btn--sm" data-reexport="${r.id}">Export PDF</button></td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div></div>
  `;
  $view.querySelectorAll("[data-reexport]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const run = await OpsDB.get("pmRuns", btn.dataset.reexport);
      const template = await OpsDB.get("pmTemplates", run.templateId);
      exportPmRunPdf(run, template);
    })
  );
}

/* ------------------------------------------------------------------ */
/* Equipment Registry                                                 */
/* ------------------------------------------------------------------ */
async function renderEquipment() {
  const equipment = (await OpsDB.getAll("equipment")).sort((a,b)=> a.tag.localeCompare(b.tag));
  $view.innerHTML = `
    <div class="page-head">
      <div><h1>Equipment Registry</h1><div class="sub">PLCs, HMIs, servers, network and power equipment on this site</div></div>
      <button class="btn btn--primary" id="btnAddEq">+ Add equipment</button>
    </div>
    <div class="panel"><div class="panel-body scroll-x">
      <table>
        <thead><tr><th>Tag</th><th>Name</th><th>Type</th><th>Vendor / Model</th><th>Location</th><th>Status</th><th class="text-right">Actions</th></tr></thead>
        <tbody>
          ${equipment.length === 0 ? `<tr class="empty-row"><td colspan="7">No equipment registered yet.</td></tr>` :
            equipment.map((e) => `
            <tr>
              <td class="mono">${esc(e.tag)}</td>
              <td>${esc(e.name)}</td>
              <td>${esc(e.type)}</td>
              <td>${esc(e.vendor)} <span class="muted">${esc(e.model)}</span></td>
              <td>${esc(e.location)}</td>
              <td>${statusTag(e.status)}</td>
              <td class="text-right"><button class="btn btn--sm" data-edit-eq="${e.id}">Edit</button> <button class="btn btn--sm btn--danger" data-del-eq="${e.id}">Delete</button></td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div></div>
  `;
  document.getElementById("btnAddEq").addEventListener("click", () => openEquipmentModal());
  $view.querySelectorAll("[data-edit-eq]").forEach((btn) => btn.addEventListener("click", async () => openEquipmentModal(await OpsDB.get("equipment", btn.dataset.editEq))));
  $view.querySelectorAll("[data-del-eq]").forEach((btn) => btn.addEventListener("click", async () => {
    if (!confirm("Remove this equipment record?")) return;
    await OpsDB.delete("equipment", btn.dataset.delEq);
    renderEquipment();
  }));
}

function statusTag(status) {
  const map = { online: "ok", standby: "warn", offline: "fault" };
  return `<span class="tag ${map[status] || ""}"><span class="led led--${status === "online" ? "teal" : status === "standby" ? "amber" : "red"}"></span>${esc((status||"unknown").toUpperCase())}</span>`;
}

function openEquipmentModal(existing) {
  const e = existing || { id: OpsDB.uid("eq"), tag: "", name: "", type: "PLC", vendor: "", model: "", location: "", status: "online" };
  openModal(`
    <div class="modal-head"><h3>${existing ? "Edit" : "Add"} equipment</h3><button class="icon-btn" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="field-row"><div class="field"><label>Tag</label><input id="fTag" value="${esc(e.tag)}" /></div>
      <div class="field"><label>Type</label><select id="fType">${["PLC","HMI","Server","Network","UPS","RTU","Other"].map(t=>`<option ${e.type===t?"selected":""}>${t}</option>`).join("")}</select></div></div>
      <div class="field"><label>Name</label><input id="fName" value="${esc(e.name)}" /></div>
      <div class="field-row"><div class="field"><label>Vendor</label><input id="fVendor" value="${esc(e.vendor)}" /></div>
      <div class="field"><label>Model</label><input id="fModel" value="${esc(e.model)}" /></div></div>
      <div class="field-row"><div class="field"><label>Location</label><input id="fLocation" value="${esc(e.location)}" /></div>
      <div class="field"><label>Status</label><select id="fStatus">${["online","standby","offline"].map(s=>`<option ${e.status===s?"selected":""}>${s}</option>`).join("")}</select></div></div>
    </div>
    <div class="modal-foot"><button class="btn" id="mCancel">Cancel</button><button class="btn btn--primary" id="mSave">Save</button></div>
  `);
  document.getElementById("mClose").addEventListener("click", closeModal);
  document.getElementById("mCancel").addEventListener("click", closeModal);
  document.getElementById("mSave").addEventListener("click", async () => {
    e.tag = document.getElementById("fTag").value.trim();
    e.type = document.getElementById("fType").value;
    e.name = document.getElementById("fName").value.trim();
    e.vendor = document.getElementById("fVendor").value.trim();
    e.model = document.getElementById("fModel").value.trim();
    e.location = document.getElementById("fLocation").value.trim();
    e.status = document.getElementById("fStatus").value;
    if (!e.tag || !e.name) { toast("Tag and name are required.", "fault"); return; }
    await OpsDB.put("equipment", e);
    closeModal();
    toast("Equipment saved.");
    renderEquipment();
  });
}

/* ------------------------------------------------------------------ */
/* Firmware / Version matrix                                          */
/* ------------------------------------------------------------------ */
async function renderVersions() {
  const versions = await OpsDB.getAll("versions");
  $view.innerHTML = `
    <div class="page-head">
      <div><h1>Firmware &amp; Software Version Matrix</h1><div class="sub">Installed vs. latest — prevents compatibility surprises during updates</div></div>
      <button class="btn btn--primary" id="btnAddVer">+ Add entry</button>
    </div>
    <div class="panel"><div class="panel-body scroll-x">
      <table>
        <thead><tr><th>Equipment</th><th>Software</th><th>Installed</th><th>Latest</th><th>Verified</th><th>Note</th><th class="text-right">Actions</th></tr></thead>
        <tbody>
          ${versions.length === 0 ? `<tr class="empty-row"><td colspan="7">No version records yet.</td></tr>` :
            versions.map((v) => `
            <tr>
              <td class="mono">${esc(v.equipmentTag)}</td>
              <td>${esc(v.software)}</td>
              <td class="mono">${esc(v.installedVersion)}</td>
              <td class="mono">${esc(v.latestVersion)}</td>
              <td class="mono">${fmtDate(v.lastVerified)}</td>
              <td class="muted">${esc(v.compatNote || "")}</td>
              <td class="text-right"><button class="btn btn--sm" data-edit-ver="${v.id}">Edit</button> <button class="btn btn--sm btn--danger" data-del-ver="${v.id}">Delete</button></td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div></div>
  `;
  document.getElementById("btnAddVer").addEventListener("click", () => openVersionModal());
  $view.querySelectorAll("[data-edit-ver]").forEach((btn) => btn.addEventListener("click", async () => openVersionModal(await OpsDB.get("versions", btn.dataset.editVer))));
  $view.querySelectorAll("[data-del-ver]").forEach((btn) => btn.addEventListener("click", async () => {
    if (!confirm("Delete this version record?")) return;
    await OpsDB.delete("versions", btn.dataset.delVer);
    renderVersions();
  }));
}

function openVersionModal(existing) {
  const v = existing || { id: OpsDB.uid("ver"), equipmentTag: "", software: "", installedVersion: "", latestVersion: "", lastVerified: new Date().toISOString().slice(0,10), compatNote: "" };
  openModal(`
    <div class="modal-head"><h3>${existing ? "Edit" : "Add"} version record</h3><button class="icon-btn" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="field"><label>Equipment tag(s)</label><input id="fEqTag" value="${esc(v.equipmentTag)}" placeholder="e.g. PLC-101" /></div>
      <div class="field"><label>Software</label><input id="fSoftware" value="${esc(v.software)}" placeholder="e.g. TIA Portal" /></div>
      <div class="field-row"><div class="field"><label>Installed version</label><input id="fInstalled" value="${esc(v.installedVersion)}" /></div>
      <div class="field"><label>Latest available</label><input id="fLatest" value="${esc(v.latestVersion)}" /></div></div>
      <div class="field"><label>Last verified</label><input type="date" id="fVerified" value="${esc(v.lastVerified)}" /></div>
      <div class="field"><label>Compatibility note</label><textarea id="fNote">${esc(v.compatNote)}</textarea></div>
    </div>
    <div class="modal-foot"><button class="btn" id="mCancel">Cancel</button><button class="btn btn--primary" id="mSave">Save</button></div>
  `);
  document.getElementById("mClose").addEventListener("click", closeModal);
  document.getElementById("mCancel").addEventListener("click", closeModal);
  document.getElementById("mSave").addEventListener("click", async () => {
    v.equipmentTag = document.getElementById("fEqTag").value.trim();
    v.software = document.getElementById("fSoftware").value.trim();
    v.installedVersion = document.getElementById("fInstalled").value.trim();
    v.latestVersion = document.getElementById("fLatest").value.trim();
    v.lastVerified = document.getElementById("fVerified").value;
    v.compatNote = document.getElementById("fNote").value.trim();
    if (!v.equipmentTag || !v.software) { toast("Equipment tag and software are required.", "fault"); return; }
    await OpsDB.put("versions", v);
    closeModal(); toast("Version record saved."); renderVersions();
  });
}

/* ------------------------------------------------------------------ */
/* Licenses & Certificates                                            */
/* ------------------------------------------------------------------ */
async function renderLicenses() {
  const licenses = (await OpsDB.getAll("licenses")).sort((a,b)=> new Date(a.expiry) - new Date(b.expiry));
  $view.innerHTML = `
    <div class="page-head">
      <div><h1>Licenses &amp; Certificates</h1><div class="sub">Runtime licenses, SSL certificates and support contract expiries</div></div>
      <button class="btn btn--primary" id="btnAddLic">+ Add item</button>
    </div>
    <div class="panel"><div class="panel-body scroll-x">
      <table>
        <thead><tr><th>Item</th><th>Type</th><th>Expiry</th><th>Status</th><th class="text-right">Actions</th></tr></thead>
        <tbody>
          ${licenses.length === 0 ? `<tr class="empty-row"><td colspan="5">No licenses or certificates tracked yet.</td></tr>` :
            licenses.map((l) => {
              const d = daysUntil(l.expiry);
              const expired = d !== null && d < 0;
              const soon = d !== null && d >= 0 && d <= 45;
              return `<tr>
                <td>${esc(l.item)}</td>
                <td>${esc(l.type)}</td>
                <td class="mono">${fmtDate(l.expiry)}</td>
                <td>${expired ? `<span class="tag fault">EXPIRED</span>` : soon ? `<span class="tag warn">${d}D LEFT</span>` : `<span class="tag ok">ACTIVE</span>`}</td>
                <td class="text-right"><button class="btn btn--sm" data-edit-lic="${l.id}">Edit</button> <button class="btn btn--sm btn--danger" data-del-lic="${l.id}">Delete</button></td>
              </tr>`;
            }).join("")}
        </tbody>
      </table>
    </div></div>
  `;
  document.getElementById("btnAddLic").addEventListener("click", () => openLicenseModal());
  $view.querySelectorAll("[data-edit-lic]").forEach((btn) => btn.addEventListener("click", async () => openLicenseModal(await OpsDB.get("licenses", btn.dataset.editLic))));
  $view.querySelectorAll("[data-del-lic]").forEach((btn) => btn.addEventListener("click", async () => {
    if (!confirm("Delete this license/certificate record?")) return;
    await OpsDB.delete("licenses", btn.dataset.delLic);
    renderLicenses();
  }));
}

function openLicenseModal(existing) {
  const l = existing || { id: OpsDB.uid("lic"), item: "", type: "Runtime License", expiry: new Date().toISOString().slice(0,10) };
  openModal(`
    <div class="modal-head"><h3>${existing ? "Edit" : "Add"} license / certificate</h3><button class="icon-btn" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="field"><label>Item description</label><input id="fItem" value="${esc(l.item)}" /></div>
      <div class="field-row"><div class="field"><label>Type</label><select id="fType">${["Runtime License","SSL Certificate","Support Contract","Other"].map(t=>`<option ${l.type===t?"selected":""}>${t}</option>`).join("")}</select></div>
      <div class="field"><label>Expiry date</label><input type="date" id="fExpiry" value="${esc(l.expiry)}" /></div></div>
    </div>
    <div class="modal-foot"><button class="btn" id="mCancel">Cancel</button><button class="btn btn--primary" id="mSave">Save</button></div>
  `);
  document.getElementById("mClose").addEventListener("click", closeModal);
  document.getElementById("mCancel").addEventListener("click", closeModal);
  document.getElementById("mSave").addEventListener("click", async () => {
    l.item = document.getElementById("fItem").value.trim();
    l.type = document.getElementById("fType").value;
    l.expiry = document.getElementById("fExpiry").value;
    if (!l.item || !l.expiry) { toast("Item and expiry date are required.", "fault"); return; }
    await OpsDB.put("licenses", l);
    closeModal(); toast("Saved."); renderLicenses();
  });
}

/* ------------------------------------------------------------------ */
/* Cybersecurity Audit                                                 */
/* ------------------------------------------------------------------ */
async function renderSecurity() {
  const [checks, runs] = await Promise.all([OpsDB.getAll("securityChecks"), OpsDB.getAll("securityRuns")]);
  const inProgress = runs.find((r) => r.status === "in_progress");
  const completed = runs.filter((r) => r.status === "completed").sort((a,b)=> new Date(b.completedAt) - new Date(a.completedAt));
  const categories = [...new Set(checks.map((c) => c.category))];

  $view.innerHTML = `
    <div class="page-head">
      <div><h1>Cybersecurity &amp; Access Audit</h1><div class="sub">Hardening checklist, sourced from your quarterly SCADA security baseline</div></div>
      ${inProgress ? `<a class="btn btn--primary" href="#/securityrun/${inProgress.id}">Resume audit run</a>` : `<button class="btn btn--primary" id="btnStartAudit">Start new audit run</button>`}
    </div>

    <div class="panel mb-16">
      <div class="panel-head"><h3>Checklist baseline</h3></div>
      <div class="panel-body">
        ${categories.map((cat) => `
          <h4 style="font-size:13px; color:var(--text-mid); text-transform:uppercase; letter-spacing:0.06em; margin:14px 0 6px;">${esc(cat)}</h4>
          ${checks.filter(c=>c.category===cat).map((c) => `<div class="checklist-item"><span class="led led--grey" style="margin-top:5px;"></span><span class="txt">${esc(c.item)}</span></div>`).join("")}
        `).join("")}
      </div>
    </div>

    <div class="panel">
      <div class="panel-head"><h3>Audit run history</h3></div>
      <div class="panel-body scroll-x">
        <table>
          <thead><tr><th>Completed</th><th>Engineer</th><th>Result</th><th class="text-right">Actions</th></tr></thead>
          <tbody>
            ${completed.length === 0 ? `<tr class="empty-row"><td colspan="4">No completed audits yet.</td></tr>` :
              completed.map((r) => {
                const total = Object.keys(r.checks || {}).length || checks.length;
                const done = Object.values(r.checks || {}).filter(Boolean).length;
                return `<tr><td class="mono">${fmtDateTime(r.completedAt)}</td><td>${esc(r.engineer)}</td>
                  <td>${done === total ? `<span class="tag ok">${done}/${total} PASS</span>` : `<span class="tag warn">${done}/${total} PARTIAL</span>`}</td>
                  <td class="text-right"><button class="btn btn--sm" data-reexport-sec="${r.id}">Export PDF</button></td></tr>`;
              }).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  const startBtn = document.getElementById("btnStartAudit");
  if (startBtn) startBtn.addEventListener("click", startSecurityRun);
  $view.querySelectorAll("[data-reexport-sec]").forEach((btn) => btn.addEventListener("click", async () => {
    const run = await OpsDB.get("securityRuns", btn.dataset.reexportSec);
    exportSecurityRunPdf(run, checks);
  }));
}

async function startSecurityRun() {
  const checks = await OpsDB.getAll("securityChecks");
  const run = {
    id: OpsDB.uid("secrun"),
    startedAt: new Date().toISOString(),
    completedAt: null,
    status: "in_progress",
    checks: {},
    notes: "",
    engineer: APP_SETTINGS.engineerName
  };
  await OpsDB.put("securityRuns", run);
  location.hash = `#/securityrun/${run.id}`;
}

async function renderSecurityRun(runId) {
  const run = await OpsDB.get("securityRuns", runId);
  if (!run) { $view.innerHTML = `<div class="panel panel-body">Audit run not found.</div>`; return; }
  const checks = await OpsDB.getAll("securityChecks");
  const total = checks.length;
  const done = Object.values(run.checks).filter(Boolean).length;
  const pct = total ? Math.round((done/total)*100) : 0;
  const categories = [...new Set(checks.map((c) => c.category))];

  $view.innerHTML = `
    <div class="page-head">
      <div><h1>Quarterly SCADA Security Audit</h1><div class="sub mono">started ${fmtDateTime(run.startedAt)} · ${esc(run.engineer)}</div></div>
      <a class="btn btn--ghost" href="#/security">Back to security</a>
    </div>
    <div class="panel mb-16"><div class="panel-body">
      <div class="flex gap-12 mb-16"><div class="progress-track" style="flex:1;"><div class="progress-fill" style="width:${pct}%"></div></div><div class="mono" style="font-size:12px;">${done}/${total}</div></div>
      ${categories.map((cat) => `
        <h4 style="font-size:13px; color:var(--text-mid); text-transform:uppercase; letter-spacing:0.06em; margin:14px 0 2px;">${esc(cat)}</h4>
        ${checks.filter(c=>c.category===cat).map((c) => `
          <label class="checklist-item ${run.checks[c.id] ? "done" : ""}">
            <input type="checkbox" ${run.checks[c.id] ? "checked" : ""} data-sec-idx="${c.id}" />
            <span class="txt">${esc(c.item)}</span>
          </label>`).join("")}
      `).join("")}
    </div></div>

    <div class="panel mb-16"><div class="panel-head"><h3>Findings / remediation notes</h3></div>
      <div class="panel-body"><textarea id="secNotes" placeholder="Document any findings and remediation actions">${esc(run.notes)}</textarea></div>
    </div>

    <div class="flex gap-8" style="justify-content:flex-end;">
      <button class="btn btn--danger" id="btnDiscardSec">Discard run</button>
      <button class="btn" id="btnSaveSec">Save progress</button>
      <button class="btn btn--primary" id="btnCompleteSec">Mark complete &amp; export PDF</button>
    </div>
  `;

  $view.querySelectorAll("[data-sec-idx]").forEach((cb) => cb.addEventListener("change", (e) => {
    run.checks[e.target.dataset.secIdx] = e.target.checked;
    e.target.closest(".checklist-item").classList.toggle("done", e.target.checked);
    const doneNow = Object.values(run.checks).filter(Boolean).length;
    $view.querySelector(".progress-fill").style.width = `${Math.round((doneNow/total)*100)}%`;
    $view.querySelector(".mono[style*='font-size:12px']").textContent = `${doneNow}/${total}`;
  }));

  document.getElementById("btnSaveSec").addEventListener("click", async () => {
    run.notes = document.getElementById("secNotes").value;
    await OpsDB.put("securityRuns", run);
    toast("Progress saved locally.");
  });
  document.getElementById("btnDiscardSec").addEventListener("click", async () => {
    if (!confirm("Discard this in-progress audit run?")) return;
    await OpsDB.delete("securityRuns", run.id);
    location.hash = "#/security";
  });
  document.getElementById("btnCompleteSec").addEventListener("click", async () => {
    run.notes = document.getElementById("secNotes").value;
    run.completedAt = new Date().toISOString();
    run.status = "completed";
    await OpsDB.put("securityRuns", run);
    toast("Audit marked complete.");
    await exportSecurityRunPdf(run, checks);
    location.hash = "#/security";
  });
}

async function exportSecurityRunPdf(run, checks) {
  const items = checks.map((c) => ({ id: c.id, text: `[${c.category}] ${c.item}` }));
  const body = `
    ${PdfExport.checklistToHtml(items, run.checks)}
    <div style="margin-top:16px;"><strong>Findings / remediation notes:</strong><div style="margin-top:4px; white-space:pre-wrap;">${esc(run.notes) || "None recorded."}</div></div>
  `;
  const html = PdfExport.buildLetterhead({
    plantName: APP_SETTINGS.plantName,
    reportTitle: "Quarterly SCADA Security Audit",
    reportMeta: `Cybersecurity hardening & access audit · Completed ${fmtDateTime(run.completedAt)} · ${esc(run.engineer)}`,
    bodyHtml: body,
    engineerName: APP_SETTINGS.engineerName,
    engineerRole: APP_SETTINGS.engineerRole
  });
  await PdfExport.exportHtml(html, `OpsGuard_Security_Audit_${(run.completedAt||run.startedAt).slice(0,10)}.pdf`);
}

/* ------------------------------------------------------------------ */
/* Backup verification log                                            */
/* ------------------------------------------------------------------ */
async function renderBackups() {
  const backups = (await OpsDB.getAll("backups")).sort((a,b)=> new Date(b.date) - new Date(a.date));
  $view.innerHTML = `
    <div class="page-head">
      <div><h1>Backup Verification Log</h1><div class="sub">PLC project archives, SCADA Galaxy backups and configuration images</div></div>
      <div class="flex gap-8"><button class="btn" id="btnExportLog">Export log PDF</button><button class="btn btn--primary" id="btnAddBackup">+ Log entry</button></div>
    </div>
    <div class="panel"><div class="panel-body scroll-x">
      <table>
        <thead><tr><th>Date</th><th>Item</th><th>Verification method</th><th>Value</th><th>Result</th><th class="text-right">Actions</th></tr></thead>
        <tbody>
          ${backups.length === 0 ? `<tr class="empty-row"><td colspan="6">No backup verification records yet.</td></tr>` :
            backups.map((b) => `
            <tr>
              <td class="mono">${fmtDate(b.date)}</td>
              <td>${esc(b.item)}</td>
              <td>${esc(b.method)}</td>
              <td class="mono">${esc(b.verification)}</td>
              <td>${b.result === "pass" ? `<span class="tag ok">PASS</span>` : `<span class="tag fault">FAIL</span>`}</td>
              <td class="text-right"><button class="btn btn--sm" data-edit-bk="${b.id}">Edit</button> <button class="btn btn--sm btn--danger" data-del-bk="${b.id}">Delete</button></td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div></div>
  `;
  document.getElementById("btnAddBackup").addEventListener("click", () => openBackupModal());
  document.getElementById("btnExportLog").addEventListener("click", () => exportBackupLogPdf(backups));
  $view.querySelectorAll("[data-edit-bk]").forEach((btn) => btn.addEventListener("click", async () => openBackupModal(await OpsDB.get("backups", btn.dataset.editBk))));
  $view.querySelectorAll("[data-del-bk]").forEach((btn) => btn.addEventListener("click", async () => {
    if (!confirm("Delete this backup record?")) return;
    await OpsDB.delete("backups", btn.dataset.delBk);
    renderBackups();
  }));
}

function openBackupModal(existing) {
  const b = existing || { id: OpsDB.uid("bk"), date: new Date().toISOString().slice(0,10), item: "", method: "SHA-256 hash", verification: "", result: "pass" };
  openModal(`
    <div class="modal-head"><h3>${existing ? "Edit" : "Log"} backup verification</h3><button class="icon-btn" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="field-row"><div class="field"><label>Date</label><input type="date" id="fDate" value="${esc(b.date)}" /></div>
      <div class="field"><label>Result</label><select id="fResult">${["pass","fail"].map(r=>`<option ${b.result===r?"selected":""}>${r}</option>`).join("")}</select></div></div>
      <div class="field"><label>Item backed up</label><input id="fItem" value="${esc(b.item)}" placeholder="e.g. PLC-101 Project Archive" /></div>
      <div class="field-row"><div class="field"><label>Verification method</label><select id="fMethod">${["SHA-256 hash","MD5 hash","File-size check","Restore test"].map(m=>`<option ${b.method===m?"selected":""}>${m}</option>`).join("")}</select></div>
      <div class="field"><label>Hash / value</label><input id="fVerification" value="${esc(b.verification)}" /></div></div>
    </div>
    <div class="modal-foot"><button class="btn" id="mCancel">Cancel</button><button class="btn btn--primary" id="mSave">Save</button></div>
  `);
  document.getElementById("mClose").addEventListener("click", closeModal);
  document.getElementById("mCancel").addEventListener("click", closeModal);
  document.getElementById("mSave").addEventListener("click", async () => {
    b.date = document.getElementById("fDate").value;
    b.result = document.getElementById("fResult").value;
    b.item = document.getElementById("fItem").value.trim();
    b.method = document.getElementById("fMethod").value;
    b.verification = document.getElementById("fVerification").value.trim();
    if (!b.item || !b.date) { toast("Date and item are required.", "fault"); return; }
    await OpsDB.put("backups", b);
    closeModal(); toast("Backup record saved."); renderBackups();
  });
}

async function exportBackupLogPdf(backups) {
  const rows = backups.map((b) => [fmtDate(b.date), b.item, b.method, b.verification, b.result.toUpperCase()]);
  const body = PdfExport.rowsToTable(["Date","Item","Method","Value","Result"], rows);
  const html = PdfExport.buildLetterhead({
    plantName: APP_SETTINGS.plantName,
    reportTitle: "Backup Verification Log",
    reportMeta: `Disaster-recovery backup verification records · Exported ${fmtDateTime(new Date())}`,
    bodyHtml: body,
    engineerName: APP_SETTINGS.engineerName,
    engineerRole: APP_SETTINGS.engineerRole
  });
  await PdfExport.exportHtml(html, `OpsGuard_Backup_Log_${new Date().toISOString().slice(0,10)}.pdf`);
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */
async function renderSettings() {
  const counts = await Promise.all(["equipment","versions","licenses","pmRuns","securityRuns","backups"].map(s => OpsDB.count(s)));
  $view.innerHTML = `
    <div class="page-head"><div><h1>Settings</h1><div class="sub">Plant identity, local data management and app install</div></div></div>

    <div class="grid grid-2">
      <div class="panel">
        <div class="panel-head"><h3>Plant &amp; sign-off identity</h3></div>
        <div class="panel-body">
          <div class="field"><label>Plant / facility name</label><input id="sPlant" value="${esc(APP_SETTINGS.plantName)}" /></div>
          <div class="field-row"><div class="field"><label>Engineer name</label><input id="sEngineer" value="${esc(APP_SETTINGS.engineerName)}" /></div>
          <div class="field"><label>Role</label><input id="sRole" value="${esc(APP_SETTINGS.engineerRole)}" /></div></div>
          <button class="btn btn--primary" id="btnSaveSettings">Save</button>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><h3>Local data</h3></div>
        <div class="panel-body">
          <table style="margin-bottom:14px;">
            <tbody>
              <tr><td>Equipment records</td><td class="mono text-right">${counts[0]}</td></tr>
              <tr><td>Version records</td><td class="mono text-right">${counts[1]}</td></tr>
              <tr><td>Licenses / certs</td><td class="mono text-right">${counts[2]}</td></tr>
              <tr><td>PM checklist runs</td><td class="mono text-right">${counts[3]}</td></tr>
              <tr><td>Security audit runs</td><td class="mono text-right">${counts[4]}</td></tr>
              <tr><td>Backup log entries</td><td class="mono text-right">${counts[5]}</td></tr>
            </tbody>
          </table>
          <div class="flex gap-8">
            <button class="btn" id="btnExportData">Export all data (JSON)</button>
            <button class="btn btn--danger" id="btnResetData">Reset demo data</button>
          </div>
        </div>
      </div>
    </div>

    <div class="panel mt-16" id="installPanel" style="display:none;">
      <div class="panel-head"><h3>Install on this device</h3></div>
      <div class="panel-body flex gap-12" style="justify-content:space-between;">
        <div class="muted">Install OpsGuard as an app for one-tap, full-offline access on the plant floor.</div>
        <button class="btn btn--primary" id="btnInstall">Install app</button>
      </div>
    </div>
  `;

  document.getElementById("btnSaveSettings").addEventListener("click", async () => {
    APP_SETTINGS.plantName = document.getElementById("sPlant").value.trim();
    APP_SETTINGS.engineerName = document.getElementById("sEngineer").value.trim();
    APP_SETTINGS.engineerRole = document.getElementById("sRole").value.trim();
    await OpsDB.put("settings", { key: "app", seeded: true, ...APP_SETTINGS });
    toast("Settings saved.");
  });

  document.getElementById("btnExportData").addEventListener("click", async () => {
    const stores = ["equipment","versions","licenses","pmTemplates","pmRuns","securityChecks","securityRuns","backups","settings"];
    const data = {};
    for (const s of stores) data[s] = await OpsDB.getAll(s);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `opsguard-export-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    toast("Data exported.");
  });

  document.getElementById("btnResetData").addEventListener("click", async () => {
    if (!confirm("This wipes all local data and reloads the demo dataset. Continue?")) return;
    await OpsDB.clearAll();
    await OpsDB.seedIfEmpty(SEED);
    toast("Demo data reset.");
    location.hash = "#/dashboard";
  });

  if (deferredInstallPrompt) {
    document.getElementById("installPanel").style.display = "block";
    document.getElementById("btnInstall").addEventListener("click", async () => {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      document.getElementById("installPanel").style.display = "none";
    });
  }
}

/* ------------------------------------------------------------------ */
/* Bootstrapping                                                       */
/* ------------------------------------------------------------------ */
function updateConnStatus() {
  const led = document.getElementById("connLed");
  const label = document.getElementById("connLabel");
  if (navigator.onLine) { led.className = "led led--teal"; label.textContent = "ONLINE"; }
  else { led.className = "led led--amber"; label.textContent = "OFFLINE — LOCAL DATA ACTIVE"; }
}

async function init() {
  await OpsDB.seedIfEmpty(SEED);
  const s = await OpsDB.get("settings", "app");
  if (s) APP_SETTINGS = { plantName: s.plantName, engineerName: s.engineerName, engineerRole: s.engineerRole };

  if (!location.hash) location.hash = "#/dashboard";
  await router();
  updateConnStatus();

  window.addEventListener("online", updateConnStatus);
  window.addEventListener("offline", updateConnStatus);

  document.getElementById("menuToggle").addEventListener("click", () => document.getElementById("sidenav").classList.toggle("open"));
  document.querySelectorAll(".nav-item").forEach((n) => n.addEventListener("click", () => document.getElementById("sidenav").classList.remove("open")));

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (parseHash().name === "settings") renderSettings();
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch((err) => console.warn("SW registration failed", err));
  }
}

document.addEventListener("DOMContentLoaded", init);
