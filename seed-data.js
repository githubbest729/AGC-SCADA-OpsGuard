const MAINTENANCE_TEMPLATES = [
  {
    category: "Routine Maintenance",
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
`
  }
];
