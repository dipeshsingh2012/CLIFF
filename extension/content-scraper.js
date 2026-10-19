// CLIFF Content Scraper - LinkedIn & ATS Job Ingestion
(function () {
  console.log("[CLIFF] Content Scraper initialized on", window.location.href);

  const API_BASE = "https://cliff-backend-prod-gimnyg4ehq-uc.a.run.app/api";

  function extractJobDetails() {
    let title = "";
    let company = "";
    let location = "";
    let rawDescription = "";
    let salaryRange = "";
    let workplaceType = "";
    let employmentType = "";
    let seniorityLevel = "";
    let isEasyApply = false;
    let applicantCount = "";
    let postedDate = "";
    let companyLogo = "";
    let companyUrl = "";
    let companySize = "";
    let companyIndustry = "";
    let hiringManager = null;

    // 0. Scope to active job detail container (crucial for LinkedIn /jobs/search/ two-column layouts)
    const detailPane = 
      document.querySelector(".jobs-search__job-details--container") ||
      document.querySelector(".scaffold-layout__detail") ||
      document.querySelector(".jobs-details__main-content") ||
      document.querySelector(".job-details-jobs-unified-top-card__container") ||
      document;

    // A. Parse Schema.org JSON-LD if available on the page
    try {
      const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of ldScripts) {
        const json = JSON.parse(script.innerText);
        const data = json["@type"] === "JobPosting" ? json : (json["@graph"] ? json["@graph"].find(i => i["@type"] === "JobPosting") : null);
        if (data) {
          if (data.title && !/^\d+\s+jobs?\b/i.test(data.title)) title = data.title;
          if (data.hiringOrganization?.name) company = data.hiringOrganization.name;
          if (data.hiringOrganization?.sameAs) companyUrl = data.hiringOrganization.sameAs;
          if (data.hiringOrganization?.logo) companyLogo = data.hiringOrganization.logo;
          if (data.employmentType) employmentType = data.employmentType.replace(/_/g, " ").toLowerCase();
          if (data.datePosted) postedDate = data.datePosted;
          if (data.jobLocation?.address?.addressLocality) {
            location = data.jobLocation.address.addressLocality;
            if (data.jobLocation.address.addressCountry) location += `, ${data.jobLocation.address.addressCountry}`;
          }
          if (data.baseSalary?.value) {
            const v = data.baseSalary.value;
            salaryRange = `${data.baseSalary.currency || "$"} ${v.minValue || ""} - ${v.maxValue || ""} ${v.unitText || ""}`.trim();
          }
          break;
        }
      }
    } catch (e) {
      // JSON-LD parsing optional fallback
    }

    // B. Title Selectors (scoped to detailPane first to avoid capturing search results count like "2 jobs in India")
    if (!title) {
      const titleSelectors = [
        ".job-details-jobs-unified-top-card__job-title h1",
        ".job-details-jobs-unified-top-card__job-title h2",
        ".job-details-jobs-unified-top-card__job-title a",
        ".job-details-jobs-unified-top-card__job-title",
        ".jobs-unified-top-card__job-title",
        "h1.topcard__title",
        "h1.jobs-details-top-card__job-title",
        ".jobs-details__main-content h1",
        ".jobs-details__main-content h2",
        ".jobs-search__job-details--container h1",
        ".jobs-search__job-details--container h2",
        "h1.t-24"
      ];

      for (const sel of titleSelectors) {
        const el = detailPane.querySelector(sel) || document.querySelector(sel);
        if (el && el.innerText.trim()) {
          const text = el.innerText.trim();
          // Ignore search results counter headings like "2 jobs in India" or "10 results"
          if (!/^\d+\s+jobs?\b/i.test(text) && !/^\d+\s+results?\b/i.test(text)) {
            title = text;
            break;
          }
        }
      }
    }

    // C. Company Selectors
    if (!company) {
      const companySelectors = [
        ".job-details-jobs-unified-top-card__company-name a",
        ".job-details-jobs-unified-top-card__company-name",
        ".jobs-unified-top-card__company-name a",
        ".jobs-unified-top-card__company-name",
        ".jobs-unified-top-card__subtitle-primary-grouping a",
        "a.topcard__org-name-link",
        ".topcard__flavor--black-link",
        ".jobs-details-top-card__company-url",
        ".company-name"
      ];
      for (const sel of companySelectors) {
        const el = detailPane.querySelector(sel) || document.querySelector(sel);
        if (el && el.innerText.trim()) {
          company = el.innerText.trim();
          if (el.tagName === "A" && el.href) companyUrl = el.href;
          break;
        }
      }
    }

    // D. Location Selectors
    if (!location) {
      const locationSelectors = [
        ".job-details-jobs-unified-top-card__primary-description-container span.tvm__text",
        ".jobs-unified-top-card__bullet",
        ".topcard__flavor--bullet",
        ".job-details-jobs-unified-top-card__workplace-type",
        ".jobs-details-top-card__bullet"
      ];
      for (const sel of locationSelectors) {
        const el = detailPane.querySelector(sel) || document.querySelector(sel);
        if (el && el.innerText.trim()) {
          location = el.innerText.trim();
          break;
        }
      }
    }

    // E. Mode of Work / Workplace Type (Remote / Hybrid / On-site)
    const workplaceSelectors = [
      ".job-details-jobs-unified-top-card__workplace-type",
      ".jobs-unified-top-card__workplace-type",
      ".ui-label--workplace-type",
      ".jobs-description-details__item--workplace-type",
      ".job-details-jobs-unified-top-card__bullet"
    ];
    for (const sel of workplaceSelectors) {
      const el = detailPane.querySelector(sel);
      if (el && el.innerText.trim()) {
        const text = el.innerText.trim();
        if (/remote|hybrid|on-site|onsite/i.test(text)) {
          workplaceType = text;
          break;
        }
      }
    }

    if (!workplaceType) {
      const searchTarget = (location + " " + title + " " + (detailPane.innerText || "")).slice(0, 2500);
      if (/\b(remote|wfh|work from home|telecommute)\b/i.test(searchTarget)) {
        workplaceType = "Remote";
      } else if (/\b(hybrid)\b/i.test(searchTarget)) {
        workplaceType = "Hybrid";
      } else if (/\b(on-site|onsite|in-office)\b/i.test(searchTarget)) {
        workplaceType = "On-site";
      }
    }

    // Clean and normalize (e.g. "(Hybrid)" -> "Hybrid", "Onsite" -> "On-site")
    if (/remote/i.test(workplaceType)) workplaceType = "Remote";
    else if (/hybrid/i.test(workplaceType)) workplaceType = "Hybrid";
    else if (/on-?site|office/i.test(workplaceType)) workplaceType = "On-site";

    // F. Insight Pills: Employment Type, Seniority, Company Size & Industry
    const insightItems = detailPane.querySelectorAll(".job-details-jobs-unified-top-card__job-insight, .jobs-unified-top-card__job-insight, .jobs-box__group");
    insightItems.forEach(item => {
      const text = item.innerText.trim();
      if (!employmentType && /\b(Full-time|Part-time|Contract|Temporary|Internship)\b/i.test(text)) {
        const match = text.match(/\b(Full-time|Part-time|Contract|Temporary|Internship)\b/i);
        if (match) employmentType = match[1];
      }
      if (!seniorityLevel && /\b(Entry level|Associate|Mid-Senior level|Director|Executive|Internship)\b/i.test(text)) {
        const match = text.match(/\b(Entry level|Associate|Mid-Senior level|Director|Executive|Internship)\b/i);
        if (match) seniorityLevel = match[1];
      }
      if (!companySize && /\b\d+[\d,]*\s*-\s*\d+[\d,]*\s+employees\b|\b\d+[\d,]*\+\s+employees\b/i.test(text)) {
        const match = text.match(/\b\d+[\d,]*\s*-\s*\d+[\d,]*\s+employees\b|\b\d+[\d,]*\+\s+employees\b/i);
        if (match) companySize = match[0];
      }
      if (!salaryRange && /(\$\d{2,3}(?:,\d{3})*(?:\s*-\s*\$\d{2,3}(?:,\d{3})*)?(?:\s*(?:k|usd|per year|\/yr|\/hr))?|₹\s*\d+(?:,\d+)*(?:\s*-\s*₹?\s*\d+(?:,\d+)*)?(?:\s*(?:lakhs?|lpa|\/yr))?)/i.test(text)) {
        const match = text.match(/(\$\d{2,3}(?:,\d{3})*(?:\s*-\s*\$\d{2,3}(?:,\d{3})*)?(?:\s*(?:k|usd|per year|\/yr|\/hr))?|₹\s*\d+(?:,\d+)*(?:\s*-\s*₹?\s*\d+(?:,\d+)*)?(?:\s*(?:lakhs?|lpa|\/yr))?)/i);
        if (match) salaryRange = match[0];
      }
    });

    // G. Easy Apply Detection
    const applyButtons = detailPane.querySelectorAll("button.jobs-apply-button, .jobs-apply-button--top-card, button[aria-label*='Apply']");
    for (const btn of applyButtons) {
      const label = (btn.innerText + " " + (btn.getAttribute("aria-label") || "")).toLowerCase();
      if (label.includes("easy apply")) {
        isEasyApply = true;
        break;
      }
    }

    // H. Applicant Count & Velocity
    const applicantEl = detailPane.querySelector(".jobs-unified-top-card__applicant-count");
    if (applicantEl && applicantEl.innerText.trim()) {
      applicantCount = applicantEl.innerText.trim();
    } else {
      const descSpans = detailPane.querySelectorAll(".job-details-jobs-unified-top-card__primary-description-container span, .jobs-unified-top-card__primary-description span, span.tvm__text");
      for (const s of descSpans) {
        if (/applicant/i.test(s.innerText)) {
          applicantCount = s.innerText.trim();
          break;
        }
      }
    }


    // I. Posted Date / Freshness
    const postedEl = detailPane.querySelector(".posted-time-ago__text, time");
    if (postedEl && postedEl.innerText.trim()) {
      postedDate = postedEl.innerText.trim();
    } else {
      const descSpans = detailPane.querySelectorAll(".job-details-jobs-unified-top-card__primary-description-container span, .jobs-unified-top-card__primary-description span");
      for (const s of descSpans) {
        if (/ago|posted|reposted/i.test(s.innerText)) {
          postedDate = s.innerText.trim();
          break;
        }
      }
    }

    // J. Company Logo
    const logoEl = detailPane.querySelector(".job-details-jobs-unified-top-card__company-logo img, .jobs-unified-top-card__company-logo img, img.evi-image");
    if (logoEl && logoEl.src) {
      companyLogo = logoEl.src;
    }

    // K. Hiring Team / Recruiter Card Extraction
    const hirerSection = detailPane.querySelector(".hirer-card, .hirer-card__hirer-information, .jobs-poster");
    if (hirerSection) {
      const nameEl = hirerSection.querySelector(".jobs-poster__name, strong, .app-aware-link");
      const titleEl = hirerSection.querySelector(".jobs-poster__headline, .text-body-small, .hirer-card__hirer-headline");
      const linkEl = hirerSection.querySelector("a[href*='/in/']");

      if (nameEl && nameEl.innerText.trim()) {
        hiringManager = {
          name: nameEl.innerText.trim(),
          title: titleEl ? titleEl.innerText.trim() : "Talent Acquisition / Recruiter",
          profile_url: linkEl ? linkEl.href : ""
        };
      }
    }

    // L. Try expanding "Show more" button if collapsed
    const showMoreBtn = detailPane.querySelector('button[aria-label*="Show more"], .jobs-description__footer-button, button.show-more-less-html__button');
    if (showMoreBtn) {
      try { showMoreBtn.click(); } catch (e) {}
    }

    // M. Description Selectors
    const descSelectors = [
      "#job-details",
      ".jobs-description__content",
      ".jobs-box__html-content",
      ".description__text",
      ".show-more-less-html__markup",
      ".jobs-description-content__text"
    ];
    for (const sel of descSelectors) {
      const el = detailPane.querySelector(sel) || document.querySelector(sel);
      if (el && el.innerText.trim().length > 50) {
        rawDescription = el.innerText.trim();
        break;
      }
    }

    // Clean up trailing button artifacts from description
    if (rawDescription) {
      rawDescription = rawDescription.replace(/Show\s+(more|less)\s*$/i, "").trim();
    }

    // N. Fallbacks
    if (!title) {
      const docTitle = document.title.split("|")[0].split("-")[0].trim();
      if (!/^\d+\s+jobs?\b/i.test(docTitle)) {
        title = docTitle;
      } else {
        title = "Job Opportunity";
      }
    }
    if (!company) company = "Unknown Company";
    if (!location) location = "Remote / Unspecified";
    if (!rawDescription) {
      const bodyText = document.body.innerText;
      rawDescription = bodyText.slice(0, 3000);
    }

    // O. Canonical URL construction
    // Handles /jobs/search/?currentJobId=4472305884 as well as /jobs/view/4472305884
    let jobUrl = window.location.href.split("?")[0];
    try {
      const urlObj = new URL(window.location.href);
      const currentJobId = urlObj.searchParams.get("currentJobId");
      if (currentJobId) {
        jobUrl = `https://www.linkedin.com/jobs/view/${currentJobId}/`;
      } else {
        const viewMatch = window.location.pathname.match(/\/jobs\/view\/(\d+)/);
        if (viewMatch) {
          jobUrl = `https://www.linkedin.com/jobs/view/${viewMatch[1]}/`;
        }
      }
    } catch (e) {
      // Keep split("?")[0] fallback
    }

    return {
      title,
      company,
      location,
      url: jobUrl,
      raw_description: rawDescription,
      salary_range: salaryRange,
      workplace_type: workplaceType,
      employment_type: employmentType,
      seniority_level: seniorityLevel,
      is_easy_apply: isEasyApply,
      applicant_count: applicantCount,
      posted_date: postedDate,
      company_logo: companyLogo,
      company_url: companyUrl,
      company_size: companySize,
      company_industry: companyIndustry,
      hiring_manager: hiringManager,
      source: "LinkedIn"
    };
  }

  // Inject a floating "⚡ Save to CLIFF" badge button on LinkedIn job pages
  function injectFloatingCliffBadge() {
    if (document.getElementById("cliff-floating-ingest-badge")) return;

    const badge = document.createElement("div");
    badge.id = "cliff-floating-ingest-badge";
    badge.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      background: #0f172a;
      color: #f8fafc;
      border: 1px solid #14b8a6;
      border-radius: 14px;
      padding: 10px 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 10px 25px -5px rgba(20, 184, 166, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
    `;

    badge.innerHTML = `
      <div style="width: 24px; height: 24px; border-radius: 6px; background: #14b8a6; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; color: #022c22;">
        ⚡
      </div>
      <div>
        <div style="font-size: 12px; font-weight: 700; color: #ffffff; line-height: 1.2;">Save to CLIFF</div>
        <div style="font-size: 10px; color: #94a3b8;">Local AI Match & Pipeline</div>
      </div>
    `;

    badge.onmouseenter = () => {
      badge.style.transform = "translateY(-2px) scale(1.02)";
      badge.style.borderColor = "#2dd4bf";
    };
    badge.onmouseleave = () => {
      badge.style.transform = "none";
      badge.style.borderColor = "#14b8a6";
    };

    badge.onclick = async () => {
      const jobData = extractJobDetails();
      badge.innerHTML = `
        <div style="font-size: 12px; font-weight: 600; color: #2dd4bf;">Analyzing & Ingesting...</div>
      `;

      try {
        const response = await fetch(`${API_BASE}/jobs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(jobData)
        });

        if (response.ok) {
          const result = await response.json();
          const score = result.job?.match_score || result.intelligence?.match_score || 80;
          badge.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: #34d399; font-weight: bold;">✓ Ingested (${score}% Match!)</span>
              <a href="http://localhost:5173" target="_blank" style="color: #38bdf8; text-decoration: underline; font-size: 11px;">Open Dashboard</a>
            </div>
          `;
          badge.style.borderColor = "#34d399";
        } else {
          throw new Error("Backend response error: " + response.status);
        }
      } catch (err) {
        console.warn("[CLIFF] Ingest failed:", err);
        badge.innerHTML = `
          <div style="color: #f87171; font-size: 11px;">CLIFF Backend Offline (Cloud Run)</div>
        `;
        setTimeout(() => {
          injectFloatingCliffBadge();
        }, 3000);
      }
    };

    document.body.appendChild(badge);
  }

  // Run on page load and observe DOM changes (for LinkedIn single page navigation)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(injectFloatingCliffBadge, 1500);
    });
  } else {
    setTimeout(injectFloatingCliffBadge, 1500);
  }

  // Re-check periodically when URL changes in single-page apps
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      setTimeout(injectFloatingCliffBadge, 1500);
    }
  }).observe(document, { subtree: true, childList: true });

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scrape_job") {
      const details = extractJobDetails();
      sendResponse({ success: true, job: details });
    }
    return true;
  });
})();

