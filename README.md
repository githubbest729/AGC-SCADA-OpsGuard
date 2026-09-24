<div align="center">
  <picture>
    <img src="https://capsule-render.vercel.app/api?type=waving&color=f59e0b&height=150&section=header&text=AGC%20SCADA%20OpsGuard&fontSize=40&fontAlignY=35&animation=twinkling&fontColor=111827" alt="AGC SCADA OpsGuard Animated Banner" width="100%"/>
  </picture>
</div>

<div align="center">

![Vanilla JS](https://img.shields.io/badge/Vanilla-JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![IndexedDB](https://img.shields.io/badge/IndexedDB-Local_First-f59e0b?style=for-the-badge&logo=databricks&logoColor=black)
![PWA](https://img.shields.io/badge/PWA-Offline_Ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)
![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-4ade80?style=for-the-badge)

**Offline-first PWA for instrumentation & control engineers**  
*Built for Al Gurg Automation & Controls.*

</div>

---

> [!IMPORTANT]
> **Air-Gapped & Offline Ready**
> OpsGuard operates with zero connectivity. Maintenance checklists, audits, and firmware tracking run directly off your device's local IndexedDB. It is designed to work deep inside remote substations or isolated plant buildings.

## 🛠️ Core Capabilities

*   🗓️ **Preventive Maintenance Scheduling:** Persistent, interactive checklists.
*   💾 **Firmware & Software Registry:** Track PLC/HMI/SCADA firmware versions to prevent upgrade mismatches.
*   🔐 **Cybersecurity & Access Audits:** Hardening checklists and default-password audit logs.
*   📜 **License Tracking:** Monitor software support expirations and SSL certificate validity.
*   ✅ **Backup Verification:** Cryptographic hash and success/failure logging for disaster recovery archives.
*   📄 **Compliance PDF Exports:** One-click, branded PDF reports generated entirely client-side using `html2pdf.js`.

---

## 🗄️ Database Schema (IndexedDB)

The local data model utilizes a multi-store approach to keep maintenance logic separated from physical asset tracking. *See `js/db.js` for the exact schema.*

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 'primaryColor': '#111827', 'primaryBorderColor': '#f59e0b'}}}%%
erDiagram
    EQUIPMENT ||--o{ VERSIONS : tracks
    EQUIPMENT ||--o{ LICENSES : holds
    EQUIPMENT ||--o{ BACKUPS : verified_by
    PM_TEMPLATES ||--o{ PM_RUNS : instantiates
    SECURITY_CHECKS ||--o{ SECURITY_RUNS : guides
