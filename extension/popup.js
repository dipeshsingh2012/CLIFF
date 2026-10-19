// CLIFF Extension Popup Controller
document.addEventListener("DOMContentLoaded", async () => {
  const statusDot = document.getElementById("status-dot");
  const statusText = document.getElementById("status-text");
  const detectionPill = document.getElementById("detection-pill");
  const linkedinSection = document.getElementById("linkedin-section");
  const atsSection = document.getElementById("ats-section");
  const genericSection = document.getElementById("generic-section");
  const btnScrape = document.getElementById("btn-scrape");
  const btnAutofill = document.getElementById("btn-autofill");
  const btnScrapeGeneric = document.getElementById("btn-scrape-generic");
  const btnSyncNow = document.getElementById("btn-sync-now");
  const lastSyncLabel = document.getElementById("last-sync-label");
  const jobPreview = document.getElementById("job-preview");
  const previewTitle = document.getElementById("preview-title");
  const previewCompany = document.getElementById("preview-company");

  const API_BASE = "https://cliff-backend-prod-gimnyg4ehq-uc.a.run.app/api";

  // 1. Check Backend Status
  async function checkBackend() {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (res.ok) {
        statusDot.className = "status-dot status-online";
        statusText.innerText = "API Live (Cloud Run)";
        return true;
      }
    } catch (e) {
      // Backend not running
    }
    statusDot.className = "status-dot status-offline";
    statusText.innerText = "API Offline";
    return false;
  }
  await checkBackend();

  // 2. Query Current Tab & Context Detection
  let [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentUrl = activeTab?.url || "";

  if (currentUrl.includes("linkedin.com")) {
    detectionPill.innerText = "LinkedIn Job";
    linkedinSection.style.display = "block";
    atsSection.style.display = "none";
    genericSection.style.display = "none";
  } else if (
    currentUrl.includes("greenhouse.io") ||
    currentUrl.includes("lever.co") ||
    currentUrl.includes("myworkdayjobs.com") ||
    currentUrl.includes("ashbyhq.com") ||
    currentUrl.includes("apply") ||
    currentUrl.includes("application")
  ) {
    detectionPill.innerText = "ATS Form Detected";
    atsSection.style.display = "block";
    linkedinSection.style.display = "none";
    genericSection.style.display = "none";
  } else {
    detectionPill.innerText = "Generic Page";
    genericSection.style.display = "block";
    linkedinSection.style.display = "none";
    atsSection.style.display = "none";
  }

  // 3. Handle Scraping and Ingestion
  async function handleScrape(buttonEl) {
    buttonEl.innerText = "Scraping page...";
    buttonEl.disabled = true;

    try {
      // Message content script
      const response = await chrome.tabs.sendMessage(activeTab.id, { action: "scrape_job" });
      if (!response || !response.job) {
        throw new Error("Could not extract job from page");
      }

      const jobData = response.job;
      buttonEl.innerText = "Analyzing with AI...";

      // Post to CLIFF FastAPI backend
      const res = await fetch(`${API_BASE}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobData),
      });

      if (!res.ok) throw new Error("Backend save failed");
      const savedResult = await res.json();
      const score = savedResult.job?.match_score || savedResult.intelligence?.match_score || 80;

      buttonEl.innerHTML = `<span>✓ Saved (${score}% Match!)</span>`;
      buttonEl.style.background = "#10b981";

      jobPreview.style.display = "block";
      previewTitle.innerText = jobData.title;
      previewCompany.innerText = `${jobData.company} • ${score}% match`;
    } catch (err) {
      console.warn("Scrape error:", err);
      buttonEl.innerText = "Ingest Failed (Check backend)";
      buttonEl.style.background = "#ef4444";
      setTimeout(() => {
        buttonEl.innerText = "⚡ Ingest Job to CLIFF";
        buttonEl.style.background = "";
        buttonEl.disabled = false;
      }, 3000);
    }
  }

  if (btnScrape) {
    btnScrape.addEventListener("click", () => handleScrape(btnScrape));
  }
  if (btnScrapeGeneric) {
    btnScrapeGeneric.addEventListener("click", () => handleScrape(btnScrapeGeneric));
  }

  // 4. Handle Autofill
  if (btnAutofill) {
    btnAutofill.addEventListener("click", async () => {
      btnAutofill.innerText = "Autofilling...";
      btnAutofill.disabled = true;

      try {
        const response = await chrome.tabs.sendMessage(activeTab.id, { action: "autofill_form" });
        const count = response?.count || 0;
        btnAutofill.innerHTML = `<span>✓ Injected ${count} Fields!</span>`;
        btnAutofill.style.background = "#10b981";
      } catch (err) {
        console.warn("Autofill error:", err);
        btnAutofill.innerText = "Fill Failed";
        btnAutofill.style.background = "#ef4444";
      }
      setTimeout(() => {
        btnAutofill.innerText = "⚡ Autofill Form Fields";
        btnAutofill.style.background = "";
        btnAutofill.disabled = false;
      }, 3000);
    });
  }

  // 5. Handle Background Sync
  async function updateSyncStatus() {
    chrome.runtime.sendMessage({ action: "get_sync_status" }, (data) => {
      if (data && data.last_sync_time) {
        const date = new Date(data.last_sync_time);
        lastSyncLabel.innerText = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    });
  }
  updateSyncStatus();

  if (btnSyncNow) {
    btnSyncNow.addEventListener("click", () => {
      btnSyncNow.innerText = "Syncing Active Tabs...";
      btnSyncNow.disabled = true;

      chrome.runtime.sendMessage({ action: "trigger_sync" }, (res) => {
        if (res && res.success) {
          btnSyncNow.innerText = `✓ Synced (${res.updated || 0} updated)`;
        } else {
          btnSyncNow.innerText = "Sync Complete (0 changes)";
        }
        updateSyncStatus();
        setTimeout(() => {
          btnSyncNow.innerText = "🔄 Sync Active Tabs Now";
          btnSyncNow.disabled = false;
        }, 2500);
      });
    });
  }
});

