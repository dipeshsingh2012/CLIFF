// CLIFF Background Service Worker - Session Sync & Periodic Alarms
console.log("[CLIFF Background Worker] Initialized");

const SYNC_ALARM_NAME = "cliff_background_sync_alarm";
const API_BASE = "http://localhost:8000/api";

// Set up periodic alarm on extension installation or startup
chrome.runtime.onInstalled.addListener(() => {
  console.log("[CLIFF] Extension installed. Setting up sync alarm...");
  chrome.alarms.create(SYNC_ALARM_NAME, {
    periodInMinutes: 15
  });
  syncActiveApplications();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SYNC_ALARM_NAME) {
    console.log("[CLIFF] Sync alarm triggered. Running sync routine...");
    syncActiveApplications();
  }
});

// Sync active applications with open browser sessions
async function syncActiveApplications() {
  try {
    // 1. Fetch active application URLs from CLIFF backend
    const res = await fetch(`${API_BASE}/jobs/active-urls`);
    if (!res.ok) {
      console.log("[CLIFF Sync] Backend unreachable at", API_BASE);
      return { success: false, reason: "Backend unreachable" };
    }
    const activeJobs = await res.json();
    console.log(`[CLIFF Sync] Found ${activeJobs.length} active jobs to monitor`);

    if (activeJobs.length === 0) return { success: true, updated: 0 };

    // 2. Query all open tabs to check for matching ATS / Workday tabs
    const tabs = await chrome.tabs.query({});
    let updatedCount = 0;

    for (const job of activeJobs) {
      const matchingTab = tabs.find(tab => 
        tab.url && (
          tab.url.includes(job.url) || 
          (job.company && tab.url.toLowerCase().includes(job.company.toLowerCase().replace(/[^a-z0-9]/g, ""))) ||
          tab.url.includes("myworkdayjobs.com") ||
          tab.url.includes("greenhouse.io") ||
          tab.url.includes("lever.co")
        )
      );

      if (matchingTab && matchingTab.id) {
        try {
          // Ask tab's content script for application status
          const response = await chrome.tabs.sendMessage(matchingTab.id, { action: "get_workday_status" });
          if (response && response.applications && response.applications.length > 0) {
            const detected = response.applications[0];
            if (detected.cliff_status && detected.cliff_status !== job.status) {
              console.log(`[CLIFF Sync] Status change detected for ${job.title}: ${job.status} -> ${detected.cliff_status}`);
              
              // Push status update to FastAPI backend
              await fetch(`${API_BASE}/jobs/${job.id}/status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  status: detected.cliff_status,
                  notes: `Auto-synced via active browser session: ${detected.raw_status || detected.cliff_status}`
                })
              });
              updatedCount++;
            }
          }
        } catch (tabErr) {
          // Content script not ready on this tab, ignore gracefully
        }
      }
    }

    const lastSyncTime = new Date().toISOString();
    await chrome.storage.local.set({ last_sync_time: lastSyncTime, last_updated_count: updatedCount });
    console.log(`[CLIFF Sync] Complete. ${updatedCount} status updates synced.`);
    return { success: true, updated: updatedCount, timestamp: lastSyncTime };
  } catch (err) {
    console.warn("[CLIFF Sync] Routine error:", err);
    return { success: false, error: err.message };
  }
}

// Message Router
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "trigger_sync") {
    syncActiveApplications().then(result => sendResponse(result));
    return true; // Keep message channel open for async response
  }

  if (request.action === "get_sync_status") {
    chrome.storage.local.get(["last_sync_time", "last_updated_count"]).then(data => {
      sendResponse(data);
    });
    return true;
  }
});

