# AGC SCADA OpsGuard

Offline-first PWA for instrumentation & control engineers — preventive
maintenance scheduling, PLC/HMI/SCADA firmware version tracking, license &
certificate expiry tracking, cybersecurity hardening/access audits, and
backup verification logging, with one-click branded PDF compliance
reports. Built for Al Gurg Automation & Controls.

## Tech stack
- Vanilla JavaScript, HTML5, CSS3 — no build step, no framework
- IndexedDB for local, offline data (equipment registry, maintenance logs,
  audit records)
- Service Worker with app-shell precache + runtime caching so checklists
  run with zero connectivity in the field
- `html2pdf.js` (loaded from CDN, cached after first use) for branded
  compliance PDF exports — falls back to the browser print dialog if
  fully offline on first use

## Run it locally
Any static file server works — a service worker requires `http://` or
`https://` (not `file://`):

```bash
cd agc-scada-opsguard
python3 -m http.server 8080
# open http://localhost:8080
```

## Deploy it
Upload the folder as-is to any static host (Netlify, GitHub Pages, an
internal IIS/nginx box, etc). No server-side code or database is
required — everything after first load lives in the browser's IndexedDB
on the engineer's device.

## Install on a device
Open the site in Chrome/Edge (desktop or Android) or Safari (iOS/iPadOS)
and use "Install app" / "Add to Home Screen". Once installed, OpsGuard
launches full-screen and works with zero signal at remote substations or
deep inside plant buildings.

## Folder structure
```
agc-scada-opsguard/
├── index.html          # App shell, hash-router mounts views into #view
├── offline.html         # Fallback page served by the service worker
├── manifest.json         # PWA manifest (icons, shortcuts, theme)
├── sw.js                  # Service worker — app-shell + runtime caching
├── css/style.css           # Dark industrial / control-panel design system
├── js/
│   ├── db.js                # IndexedDB wrapper (OpsDB)
│   ├── seed-data.js          # First-run demo dataset
│   ├── pdf-export.js          # Letterhead PDF report builder
│   └── app.js                   # Router + all views + CRUD logic
├── icons/                  # App icons (all manifest sizes) + favicon
└── social/                  # Social sharing / announcement image assets
```

## Data model (IndexedDB stores)
`equipment`, `versions`, `licenses`, `pmTemplates`, `pmRuns`,
`securityChecks`, `securityRuns`, `backups`, `settings`. See
`js/db.js` for the schema and `js/seed-data.js` for the seeded demo
records (including the Weekly SCADA & Server Health Check template).

## Notes
- First run seeds a small demo dataset (sample PLC/HMI/server registry,
  version matrix, licenses, a security checklist baseline, and a couple
  of backup log entries) so the app is immediately useful — reset it any
  time from **Settings → Reset demo data**.
- **Settings → Export all data (JSON)** gives you a full local backup of
  everything in IndexedDB.
- Replace `icons/icon-master.svg` and `social/*.svg` with your own brand
  artwork and re-render the PNGs if you want a different visual identity
  than the demo dark/amber SCADA theme used here.
