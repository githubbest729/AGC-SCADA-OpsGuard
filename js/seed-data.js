/* AGC SCADA OpsGuard — initial seed data, preloaded on first run only. */

const PM_TEMPLATES = [
  {
    id: "tpl_daily_shift",
    category: "Daily / Shift",
    frequency: "daily",
    title: "Daily Shift SCADA Check",
    steps: [
      "Confirm no unacknowledged critical alarms on primary HMI",
      "Verify primary and standby SCADA servers both show 'active/healthy'",
      "Check redundant fiber ring / DLR status — zero fault flags",
      "Visually confirm PLC battery-fault LEDs are OFF on all racks",
      "Confirm historian is logging (spot-check latest timestamp)",
      "Log any alarms, comms dropouts or operator-reported issues"
    ]
  },
  {
    id: "tpl_weekly_backup",
    category: "Weekly",
    frequency: "weekly",
    title: "Weekly SCADA & Server Health Check",
    content: `# Weekly SCADA & Server Health Check

**Facility / Plant:** \`<Plant Name / Unit>\`
**Date & Time:** \`<DD-MMM-YYYY HH:MM>\`
**Engineer:** Christian Tosita Espinosa, SCADA Engineer

## 1. System & Server Resources
- [ ] Check primary & standby server CPU/RAM utilization (< 70% normal).
- [ ] Verify HMI/SCADA hard drive free space (> 20% available on C: and D: drives).
- [ ] Confirm Historian database size growth and disk allocation.

## 2. Network & Redundancy
- [ ] Verify redundant fiber optic ring status (DLR / STP active, zero fault flags).
- [ ] Check managed Ethernet switch health (Stratix / Scalance error counters).
- [ ] Test SCADA server network failover path.

## 3. Backups & Security
- [ ] Confirm automated nightly Galaxy / Project backups completed successfully.
- [ ] Verify antivirus definition file versions across all operator clients.
- [ ] Inspect physical server room HVAC and rack temperature logs.

## Remarks / Anomalies Found
\`<Enter any alarms, communication dropouts, or maintenance actions taken>\`
`,
    steps: [
      "Check primary & standby server CPU/RAM utilization (< 70% normal)",
      "Verify HMI/SCADA hard drive free space (> 20% available on C: and D: drives)",
      "Confirm Historian database size growth and disk allocation",
      "Verify redundant fiber optic ring status (DLR / STP active, zero fault flags)",
      "Check managed Ethernet switch health (Stratix / Scalance error counters)",
      "Test SCADA server network failover path",
      "Confirm automated nightly Galaxy / Project backups completed successfully",
      "Verify antivirus definition file versions across all operator clients",
      "Inspect physical server room HVAC and rack temperature logs"
    ]
  },
  {
    id: "tpl_monthly_ups",
    category: "Monthly",
    frequency: "monthly",
    title: "Monthly UPS & Battery Test",
    steps: [
      "Run UPS self-test / load transfer test and confirm clean switchover",
      "Record UPS battery runtime remaining vs. rated capacity",
      "Inspect UPS for fault codes, thermal alarms or bulging cells",
      "Verify UPS firmware / management card version",
      "Confirm PLC/RTU rack backup batteries within replacement interval",
      "Log ambient temperature at UPS / battery cabinet"
    ]
  },
  {
    id: "tpl_quarterly_security",
    category: "Quarterly",
    frequency: "quarterly",
    title: "Quarterly SCADA Security Audit",
    steps: [
      "Review firewall rule set against approved baseline — flag unused rules",
      "Confirm all default vendor passwords have been changed",
      "Audit Windows Domain user accounts and privilege levels",
      "Verify unused physical Ethernet/USB ports remain disconnected or disabled",
      "Confirm SSL certificates for web-clients are within validity window",
      "Review remote access / VPN logs for anomalous sessions",
      "Confirm patch levels on SCADA servers against vendor security bulletins",
      "Verify offline/segmented backup copy exists (air-gapped or write-once)"
    ]
  }
];

const EQUIPMENT = [
  { id: "eq_plc_01", tag: "PLC-101", name: "Unit 1 Process PLC", type: "PLC", vendor: "Allen-Bradley", model: "ControlLogix 5580", location: "MCC Room — Rack A1", status: "online" },
  { id: "eq_plc_02", tag: "PLC-102", name: "Unit 1 Utilities PLC", type: "PLC", vendor: "Siemens", model: "S7-1500", location: "MCC Room — Rack A2", status: "online" },
  { id: "eq_hmi_01", tag: "HMI-201", name: "Control Room Operator Station 1", type: "HMI", vendor: "AVEVA", model: "System Platform / InTouch", location: "Control Room", status: "online" },
  { id: "eq_svr_01", tag: "SVR-301", name: "Primary SCADA Server", type: "Server", vendor: "AVEVA", model: "Galaxy Primary Node", location: "Server Room", status: "online" },
  { id: "eq_svr_02", tag: "SVR-302", name: "Standby SCADA Server", type: "Server", vendor: "AVEVA", model: "Galaxy Standby Node", location: "Server Room", status: "standby" },
  { id: "eq_sw_01", tag: "SW-401", name: "Ring Switch — East", type: "Network", vendor: "Cisco", model: "Stratix 5410", location: "Field Junction Box 3", status: "online" },
  { id: "eq_ups_01", tag: "UPS-501", name: "Control Room UPS", type: "UPS", vendor: "Eaton", model: "9PX 6000VA", location: "Server Room", status: "online" }
];

const VERSIONS = [
  { id: "ver_1", equipmentTag: "PLC-101", software: "RSLogix / Studio 5000", installedVersion: "v34.01", latestVersion: "v35.00", lastVerified: "2026-08-14", compatNote: "Hold at v34 pending HMI driver validation" },
  { id: "ver_2", equipmentTag: "PLC-102", software: "TIA Portal", installedVersion: "V18 Update 3", latestVersion: "V19", lastVerified: "2026-08-14", compatNote: "V19 upgrade scheduled next outage window" },
  { id: "ver_3", equipmentTag: "SVR-301 / SVR-302", software: "AVEVA System Platform", installedVersion: "2023 R2 Patch 02", latestVersion: "2023 R2 Patch 03", lastVerified: "2026-09-01", compatNote: "Patch 03 pending regression test" },
  { id: "ver_4", equipmentTag: "HMI-201", software: "InTouch Runtime", installedVersion: "2023 R2", latestVersion: "2023 R2", lastVerified: "2026-09-01", compatNote: "Current" },
  { id: "ver_5", equipmentTag: "SW-401", software: "Cisco IOS", installedVersion: "15.2(7)E9", latestVersion: "15.2(7)E10", lastVerified: "2026-07-20", compatNote: "Security patch available" }
];

const LICENSES = [
  { id: "lic_1", item: "InTouch Runtime — 500 tag license", type: "Runtime License", expiry: "2027-03-31", status: "active" },
  { id: "lic_2", item: "Historian Client SSL Certificate", type: "SSL Certificate", expiry: "2026-11-15", status: "expiring" },
  { id: "lic_3", item: "AVEVA System Platform Support & Maintenance", type: "Support Contract", expiry: "2027-01-10", status: "active" },
  { id: "lic_4", item: "Studio 5000 Factory Talk Activation", type: "Runtime License", expiry: "2026-10-05", status: "expiring" }
];

const SECURITY_CHECKLIST = [
  { id: "sec_1", category: "Access Hardening", item: "All default vendor passwords changed on PLCs/HMIs/switches" },
  { id: "sec_2", category: "Access Hardening", item: "Unused physical Ethernet and USB ports disconnected or disabled" },
  { id: "sec_3", category: "Access Hardening", item: "Firewall rule set reviewed against approved baseline" },
  { id: "sec_4", category: "Access Hardening", item: "Windows Domain user accounts and privilege levels audited" },
  { id: "sec_5", category: "Access Hardening", item: "Remote access / VPN session logs reviewed for anomalies" },
  { id: "sec_6", category: "Backup Verification", item: "PLC project archive backup completed and hash-verified" },
  { id: "sec_7", category: "Backup Verification", item: "SCADA Galaxy / project backup completed and size-verified" },
  { id: "sec_8", category: "Backup Verification", item: "Network switch / firewall configuration image backed up" },
  { id: "sec_9", category: "Backup Verification", item: "Offline / air-gapped copy of critical backups confirmed" }
];

const SAMPLE_BACKUPS = [
  { id: "bk_1", date: "2026-09-21", item: "PLC-101 Project Archive", method: "SHA-256 hash", verification: "a1b3f9…e02c", result: "pass" },
  { id: "bk_2", date: "2026-09-21", item: "SCADA Galaxy Backup (Primary)", method: "File-size check", verification: "4.82 GB (expected 4.7–4.9 GB)", result: "pass" },
  { id: "bk_3", date: "2026-09-14", item: "SW-401 Running-Config Image", method: "SHA-256 hash", verification: "77e0d1…9b4a", result: "pass" }
];

const SEED = {
  PM_TEMPLATES,
  EQUIPMENT,
  VERSIONS,
  LICENSES,
  SECURITY_CHECKLIST,
  SAMPLE_BACKUPS
};
