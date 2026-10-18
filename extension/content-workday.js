// CLIFF Workday Application Status Monitor
(function () {
  console.log("[CLIFF] Workday Status Monitor initialized on", window.location.href);

  function mapWorkdayStatusToCliff(statusText) {
    const s = (statusText || "").toLowerCase();
    if (s.includes("offer")) return "Offer";
    if (s.includes("interview") || s.includes("phone screen") || s.includes("assessment")) return "Interviewing";
    if (s.includes("review") || s.includes("consideration") || s.includes("submitted") || s.includes("in progress")) return "Applied";
    if (s.includes("declined") || s.includes("not selected") || s.includes("unsuccessful") || s.includes("closed") || s.includes("archive")) return "Rejected";
    return "Applied";
  }

  function parseWorkdayApplications() {
    const applications = [];

    // Workday candidate home / application table selectors
    const appRows = document.querySelectorAll(
      '[data-automation-id="compositeHeader"], [data-automation-id="applicationRow"], .workday-application-card, [data-automation-id="myApplication"]'
    );

    if (appRows.length > 0) {
      appRows.forEach((row) => {
        const titleEl = row.querySelector('[data-automation-id="jobTitle"], h3, a');
        const statusEl = row.querySelector('[data-automation-id="applicationStatus"], .css-1n97z65, [data-automation-id="status"]');

        if (titleEl && statusEl) {
          applications.push({
            title: titleEl.innerText.trim(),
            raw_status: statusEl.innerText.trim(),
            cliff_status: mapWorkdayStatusToCliff(statusEl.innerText.trim()),
            url: window.location.href
          });
        }
      });
    } else {
      // General status detection on individual application page
      const statusElement = document.querySelector(
        '[data-automation-id="applicationStatus"], [data-automation-id="currentStatus"], .status-badge'
      );
      if (statusElement) {
        applications.push({
          title: document.title,
          raw_status: statusElement.innerText.trim(),
          cliff_status: mapWorkdayStatusToCliff(statusElement.innerText.trim()),
          url: window.location.href
        });
      }
    }

    return applications;
  }

  // Inject small status pill
  function injectWorkdaySyncBadge() {
    if (document.getElementById("cliff-workday-sync-badge")) return;
    const badge = document.createElement("div");
    badge.id = "cliff-workday-sync-badge";
    badge.style.cssText = `
      position: fixed;
      bottom: 16px;
      left: 16px;
      z-index: 999999;
      background: #0f172a;
      border: 1px solid #14b8a6;
      border-radius: 10px;
      padding: 6px 12px;
      font-size: 11px;
      font-weight: 600;
      color: #2dd4bf;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;
    badge.innerHTML = `
      <span style="width: 7px; height: 7px; background: #34d399; border-radius: 50%; display: inline-block;"></span>
      <span>CLIFF Session Sync Active</span>
    `;
    document.body.appendChild(badge);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      injectWorkdaySyncBadge();
    });
  } else {
    injectWorkdaySyncBadge();
  }

  // Handle messages from background worker
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "get_workday_status") {
      const apps = parseWorkdayApplications();
      sendResponse({ success: true, applications: apps });
    }
    return true;
  });
})();

