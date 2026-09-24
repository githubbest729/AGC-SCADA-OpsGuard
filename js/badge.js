/* ==========================================================================
   AGC SCADA OpsGuard — PWA App Badging Manager
   Updates the native OS icon badge (taskbar/home screen) with active due counts.
   ========================================================================== */

const AppBadge = (() => {

  /**
   * Calculates pending/due items from IndexedDB and updates the PWA app badge.
   */
  async function updateBadgeCount() {
    if (!('setAppBadge' in navigator)) return; // Silently fail if unsupported

    try {
      // 1. Fetch relevant status counts from your database stores
      const pmRuns = (typeof OpsDB !== 'undefined' && OpsDB.getAllPMRuns) 
        ? await OpsDB.getAllPMRuns() 
        : [];
      
      const licenses = (typeof OpsDB !== 'undefined' && OpsDB.getAllLicenses)
        ? await OpsDB.getAllLicenses()
        : [];

      // 2. Count items that require attention (e.g., status === 'DUE' or expiring soon)
      const duePmCount = pmRuns.filter(run => run.status === 'DUE').length;
      
      const now = new Date();
      const expiringLicensesCount = licenses.filter(cert => {
        if (!cert.expiry) return false;
        const expiryDate = new Date(cert.expiry);
        const diffDays = (expiryDate - now) / (1000 * 60 * 60 * 24);
        return diffDays <= 45 && diffDays >= 0; // matching your 45-day threshold
      }).length;

      const totalBadgeCount = duePmCount + expiringLicensesCount;

      // 3. Apply or clear the native badge
      if (totalBadgeCount > 0) {
        await navigator.setAppBadge(totalBadgeCount);
      } else {
        await navigator.clearAppBadge();
      }
    } catch (err) {
      console.warn("[Badge] Failed to update application badge:", err);
    }
  }

  return {
    update: updateBadgeCount
  };

})();
