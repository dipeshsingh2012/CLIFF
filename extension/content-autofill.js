// CLIFF Content Autofill - ATS Form Ingestion & AI Question Drafter
(function () {
  console.log("[CLIFF] ATS Autofill initialized on", window.location.href);

  let cachedProfile = null;

  async function fetchProfile() {
    if (cachedProfile) return cachedProfile;
    try {
      const res = await fetch("http://localhost:8000/api/profile");
      if (res.ok) {
        cachedProfile = await res.json();
        return cachedProfile;
      }
    } catch (e) {
      console.warn("[CLIFF] Failed to fetch master profile from backend:", e);
    }
    return null;
  }

  // Set input value cleanly with input & change event dispatch for modern frameworks
  function setInputValue(input, value) {
    if (!input || value === undefined || value === null) return;
    input.focus();
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new Event("blur", { bubbles: true }));
  }

  // Detect form field semantics and fill matching master profile values
  async function performAutofill() {
    const profile = await fetchProfile();
    if (!profile) {
      alert("CLIFF: Could not connect to backend at http://localhost:8000. Please ensure the CLIFF backend is running.");
      return;
    }

    const nameParts = (profile.full_name || "").split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";
    const std = profile.standard_answers || {};

    const inputs = Array.from(document.querySelectorAll("input, textarea, select"));
    let filledCount = 0;

    inputs.forEach((el) => {
      if (el.type === "hidden" || el.type === "submit" || el.type === "button") return;

      const descriptor = (
        (el.name || "") + " " +
        (el.id || "") + " " +
        (el.placeholder || "") + " " +
        (el.getAttribute("aria-label") || "") + " " +
        (el.closest("label") ? el.closest("label").innerText : "") + " " +
        (el.parentElement ? el.parentElement.innerText : "")
      ).toLowerCase();

      // First Name
      if (descriptor.includes("first name") || descriptor.includes("given name") || el.name === "first_name" || el.name === "firstName") {
        setInputValue(el, firstName);
        filledCount++;
      }
      // Last Name
      else if (descriptor.includes("last name") || descriptor.includes("family name") || el.name === "last_name" || el.name === "lastName") {
        setInputValue(el, lastName);
        filledCount++;
      }
      // Full Name
      else if (descriptor.includes("full name") || descriptor.includes("your name") || el.name === "name") {
        setInputValue(el, profile.full_name);
        filledCount++;
      }
      // Email
      else if (el.type === "email" || descriptor.includes("email") || el.name === "email") {
        setInputValue(el, profile.email);
        filledCount++;
      }
      // Phone
      else if (el.type === "tel" || descriptor.includes("phone") || descriptor.includes("mobile") || el.name === "phone") {
        setInputValue(el, profile.phone);
        filledCount++;
      }
      // LinkedIn
      else if (descriptor.includes("linkedin") || descriptor.includes("linked_in")) {
        setInputValue(el, profile.linkedin_url);
        filledCount++;
      }
      // GitHub
      else if (descriptor.includes("github") || descriptor.includes("git_hub")) {
        setInputValue(el, profile.github_url);
        filledCount++;
      }
      // Portfolio / Website
      else if (descriptor.includes("website") || descriptor.includes("portfolio") || descriptor.includes("personal url")) {
        setInputValue(el, profile.portfolio_url || profile.github_url);
        filledCount++;
      }
      // Location / Address / City
      else if (descriptor.includes("location") || descriptor.includes("city") || descriptor.includes("address")) {
        setInputValue(el, profile.location);
        filledCount++;
      }
      // Work Authorization
      else if (descriptor.includes("authorized") || descriptor.includes("authorization") || descriptor.includes("legal right")) {
        if (el.tagName === "SELECT") {
          for (const opt of el.options) {
            if (opt.text.toLowerCase().includes("yes") || opt.value.toLowerCase().includes("yes")) {
              el.value = opt.value;
              el.dispatchEvent(new Event("change", { bubbles: true }));
              filledCount++;
              break;
            }
          }
        } else {
          setInputValue(el, std.work_authorization || "Yes, authorized to work in the US");
          filledCount++;
        }
      }
      // Sponsorship
      else if (descriptor.includes("sponsor") || descriptor.includes("visa")) {
        if (el.tagName === "SELECT") {
          for (const opt of el.options) {
            if (opt.text.toLowerCase().includes("no") || opt.value.toLowerCase().includes("no")) {
              el.value = opt.value;
              el.dispatchEvent(new Event("change", { bubbles: true }));
              filledCount++;
              break;
            }
          }
        } else {
          setInputValue(el, std.requires_sponsorship || "No");
          filledCount++;
        }
      }
      // Compensation / Salary
      else if (descriptor.includes("salary") || descriptor.includes("compensation") || descriptor.includes("expected pay")) {
        setInputValue(el, std.expected_salary || "$180,000");
        filledCount++;
      }
      // Notice Period
      else if (descriptor.includes("notice period") || descriptor.includes("availability") || descriptor.includes("start date")) {
        setInputValue(el, std.notice_period || "2 weeks");
        filledCount++;
      }
    });

    return filledCount;
  }

  // Inject AI Assistant button next to all textareas (open-ended questions)
  function injectAiTextareaDrafters() {
    const textareas = document.querySelectorAll("textarea");

    textareas.forEach((textarea) => {
      if (textarea.dataset.cliffInjected) return;
      textarea.dataset.cliffInjected = "true";

      // Detect question text from preceding label or heading
      let questionLabel = "Custom question";
      const parent = textarea.closest(".field, .form-group, div, label") || textarea.parentElement;
      if (parent) {
        const labelEl = parent.querySelector("label, .label, h3, h4, span");
        if (labelEl && labelEl.innerText.trim()) {
          questionLabel = labelEl.innerText.trim();
        }
      }

      // Create AI helper button
      const aiBtn = document.createElement("button");
      aiBtn.type = "button";
      aiBtn.className = "cliff-ai-draft-btn";
      aiBtn.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: #0f172a;
        color: #2dd4bf;
        border: 1px solid #14b8a6;
        border-radius: 8px;
        padding: 4px 10px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        margin: 6px 0;
        transition: all 0.2s;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      `;
      aiBtn.innerHTML = `<span>⚡</span><span>Draft Answer with CLIFF AI</span>`;

      aiBtn.onmouseenter = () => {
        aiBtn.style.background = "#14b8a6";
        aiBtn.style.color = "#042f2e";
      };
      aiBtn.onmouseleave = () => {
        aiBtn.style.background = "#0f172a";
        aiBtn.style.color = "#2dd4bf";
      };

      aiBtn.onclick = async () => {
        aiBtn.innerHTML = `<span>⏳</span><span>CLIFF Drafting Answer...</span>`;
        try {
          const res = await fetch("http://localhost:8000/api/ai/draft-answer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              question: questionLabel,
              job_context: document.title + " " + window.location.href
            })
          });

          if (res.ok) {
            const data = await res.json();
            setInputValue(textarea, data.answer);
            aiBtn.innerHTML = `<span>✓</span><span>Answer Injected!</span>`;
            setTimeout(() => {
              aiBtn.innerHTML = `<span>⚡</span><span>Re-Draft with CLIFF</span>`;
            }, 2500);
          } else {
            throw new Error("AI draft endpoint error");
          }
        } catch (err) {
          console.warn("[CLIFF] Draft error:", err);
          aiBtn.innerHTML = `<span>⚠️</span><span>Draft Failed (Check backend)</span>`;
          setTimeout(() => {
            aiBtn.innerHTML = `<span>⚡</span><span>Draft Answer with CLIFF AI</span>`;
          }, 3000);
        }
      };

      textarea.parentNode.insertBefore(aiBtn, textarea.nextSibling);
    });
  }

  // Inject a top-right floating "Autofill Application" bar on ATS forms
  function injectTopAutofillBar() {
    if (document.getElementById("cliff-floating-autofill-bar")) return;

    const bar = document.createElement("div");
    bar.id = "cliff-floating-autofill-bar";
    bar.style.cssText = `
      position: fixed;
      top: 18px;
      right: 18px;
      z-index: 999999;
      background: #0f172a;
      border: 1px solid #14b8a6;
      border-radius: 12px;
      padding: 8px 14px;
      box-shadow: 0 10px 25px -5px rgba(20, 184, 166, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    bar.innerHTML = `
      <div style="font-size: 12px; font-weight: bold; color: #ffffff; display: flex; align-items: center; gap: 6px;">
        <span style="color: #2dd4bf;">CLIFF</span>
        <span style="font-size: 10px; color: #94a3b8; font-weight: normal;">ATS Form Detected</span>
      </div>
      <button id="cliff-autofill-trigger-btn" style="
        background: #14b8a6;
        color: #042f2e;
        border: none;
        border-radius: 8px;
        padding: 5px 12px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
      ">
        <span>⚡ Autofill Application</span>
      </button>
    `;

    document.body.appendChild(bar);

    document.getElementById("cliff-autofill-trigger-btn").onclick = async () => {
      const btn = document.getElementById("cliff-autofill-trigger-btn");
      btn.innerText = "Filling...";
      const count = await performAutofill();
      btn.innerText = `✓ Filled ${count} fields`;
      setTimeout(() => {
        btn.innerText = "⚡ Autofill Application";
      }, 3000);
    };
  }

  // Initialization
  function init() {
    injectTopAutofillBar();
    injectAiTextareaDrafters();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Observe dynamically loaded ATS forms
  new MutationObserver(() => {
    injectAiTextareaDrafters();
  }).observe(document.body, { childList: true, subtree: true });

  // Handle messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "autofill_form") {
      performAutofill().then((count) => {
        sendResponse({ success: true, count });
      });
      return true;
    }
  });
})();

