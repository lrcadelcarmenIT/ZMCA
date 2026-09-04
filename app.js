(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const meter = $("#scrollMeter");
  const updateScrollMeter = () => {
    if (!meter) return;
    const available = document.documentElement.scrollHeight - window.innerHeight;
    const progress = available > 0 ? Math.min(1, window.scrollY / available) : 0;
    meter.style.width = `${progress * 100}%`;
  };
  window.addEventListener("scroll", updateScrollMeter, { passive: true });
  updateScrollMeter();

  const menuToggle = $("#menuToggle");
  const navLinks = $("#navLinks");
  const closeMenu = () => {
    if (!menuToggle || !navLinks) return;
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
    navLinks.classList.remove("open");
  };
  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
      const willOpen = menuToggle.getAttribute("aria-expanded") !== "true";
      menuToggle.setAttribute("aria-expanded", String(willOpen));
      menuToggle.setAttribute("aria-label", willOpen ? "Close navigation" : "Open navigation");
      navLinks.classList.toggle("open", willOpen);
    });
    $$("a", navLinks).forEach((link) => link.addEventListener("click", closeMenu));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  }

  const reveals = $$(".reveal");
  if ("IntersectionObserver" in window && !reducedMotion) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -45px" });
    reveals.forEach((element, index) => {
      element.style.transitionDelay = `${Math.min(index % 4, 3) * 65}ms`;
      observer.observe(element);
    });
  } else {
    reveals.forEach((element) => element.classList.add("visible"));
  }

  const machineSpace = $("#machineSpace");
  if (machineSpace && !reducedMotion && window.matchMedia("(pointer: fine)").matches) {
    const layers = $$(".layer", machineSpace);
    let frame = null;
    machineSpace.addEventListener("pointermove", (event) => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = machineSpace.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        layers.forEach((layer) => {
          const depth = Number(layer.dataset.depth || 0.2);
          const moveX = x * depth * 62;
          const moveY = y * depth * 48;
          if (layer.classList.contains("space-panel")) {
            layer.style.transform = `translate3d(${moveX}px, ${moveY}px, ${depth * 40}px) rotateY(${(-7 + x * 4).toFixed(2)}deg) rotateX(${(3 - y * 4).toFixed(2)}deg)`;
          } else {
            layer.style.transform = `translate3d(${moveX}px, ${moveY}px, ${depth * 70}px)`;
          }
        });
      });
    });
    machineSpace.addEventListener("pointerleave", () => {
      layers.forEach((layer) => { layer.style.transform = ""; });
    });
  }

  const filterButtons = $$(".filter-button");
  const equipmentCards = $$(".equipment-card");
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      filterButtons.forEach((item) => {
        const selected = item === button;
        item.classList.toggle("active", selected);
        item.setAttribute("aria-pressed", String(selected));
      });
      equipmentCards.forEach((card) => {
        card.hidden = filter !== "all" && card.dataset.category !== filter;
      });
    });
  });

  $$('[data-interest]').forEach((link) => {
    link.addEventListener("click", () => {
      const interest = link.dataset.interest || "";
      const interestField = $("#contactInterest");
      const messageField = $("#contactMessage");
      if (!interestField || !messageField) return;
      const lower = interest.toLowerCase();
      if (lower.includes("pack")) interestField.value = "Packaging equipment";
      else if (lower.includes("line")) interestField.value = "Complete production line";
      else if (lower.includes("parts") || lower.includes("support") || lower.includes("install")) interestField.value = "Parts or after-sales support";
      else interestField.value = "Food processing machinery";
      if (!messageField.value) messageField.value = `I would like to discuss ${interest.toLowerCase()}.`;
    });
  });

  const finderForm = $("#finderForm");
  const finderResult = $("#finderResult");
  const resultTitle = $("#resultTitle");
  const resultSummary = $("#resultSummary");
  const recommendationList = $("#recommendationList");
  const finderReset = $("#finderReset");
  const useRecommendation = $("#useRecommendation");

  const setButtonLoading = (button, loading, label) => {
    if (!button) return;
    if (loading) {
      button.dataset.originalLabel = button.textContent;
      button.textContent = label;
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
    } else {
      button.textContent = button.dataset.originalLabel || button.textContent;
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }
  };

  const renderRecommendation = (data) => {
    resultTitle.textContent = data.title;
    resultSummary.textContent = data.summary;
    recommendationList.replaceChildren();
    data.recommendations.forEach((item, index) => {
      const card = document.createElement("div");
      card.className = "recommendation-item";
      const number = document.createElement("span");
      number.textContent = String(index + 1).padStart(2, "0");
      const copy = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = item.name;
      const reason = document.createElement("p");
      reason.textContent = item.reason;
      copy.append(title, reason);
      card.append(number, copy);
      recommendationList.append(card);
    });
    finderForm.hidden = true;
    finderResult.hidden = false;
  };

  if (finderForm && finderResult) {
    finderForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submit = $("button[type='submit']", finderForm);
      const payload = Object.fromEntries(new FormData(finderForm).entries());
      setButtonLoading(submit, true, "Building your plan…");
      try {
        const response = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.error || "Recommendation unavailable");
        renderRecommendation(data);

        const productLabel = finderForm.elements.product.selectedOptions[0]?.textContent || "";
        const interest = payload.need === "packaging" ? "Packaging equipment" : payload.need === "full-line" ? "Complete production line" : payload.need === "unsure" ? "Not sure yet" : "Food processing machinery";
        $("#contactProduct").value = productLabel;
        $("#contactInterest").value = interest;
        $("#contactOutput").value = payload.output || "";
        $("#contactMessage").value = `I used the machine finder and received: ${data.recommendations.map((item) => item.name).join(", ")}. I would like help confirming the right setup.`;
      } catch (error) {
        resultTitle.textContent = "We need a few more details";
        resultSummary.textContent = "The matching service is temporarily unavailable. Send the same production details through the quote form and ZMCA can review them directly.";
        recommendationList.replaceChildren();
        finderForm.hidden = true;
        finderResult.hidden = false;
      } finally {
        setButtonLoading(submit, false);
      }
    });

    finderReset?.addEventListener("click", () => {
      finderForm.reset();
      finderForm.hidden = false;
      finderResult.hidden = true;
      recommendationList.replaceChildren();
    });

    useRecommendation?.addEventListener("click", () => {
      setTimeout(() => $("#contactProduct")?.focus(), 500);
    });
  }

  const contactForm = $("#contactForm");
  const contactStatus = $("#contactStatus");
  const showContactStatus = (kind, message, link) => {
    contactStatus.className = `form-status show ${kind}`;
    contactStatus.replaceChildren();
    const copy = document.createElement("span");
    copy.textContent = message;
    contactStatus.append(copy);
    if (link) {
      const anchor = document.createElement("a");
      anchor.href = link;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = "Continue in Messenger ↗";
      contactStatus.append(document.createElement("br"), anchor);
    }
  };

  if (contactForm && contactStatus) {
    contactForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!contactForm.reportValidity()) return;
      const submit = $("button[type='submit']", contactForm);
      const payload = Object.fromEntries(new FormData(contactForm).entries());
      payload.consent = Boolean(contactForm.elements.consent.checked);
      setButtonLoading(submit, true, "Preparing inquiry…");
      showContactStatus("", "Validating your equipment inquiry…");
      try {
        const response = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.error || "Unable to prepare inquiry");
        const deliveryMessage = data.notification === "sent"
          ? `Inquiry ${data.reference} was submitted. You can also continue directly in Messenger.`
          : `Inquiry ${data.reference} is ready. Continue in Messenger to send it directly to ZMCA.`;
        showContactStatus("success", deliveryMessage, data.messengerUrl);
        contactForm.reset();
      } catch (error) {
        showContactStatus("error", error.message || "The form could not be submitted. Please message ZMCA directly on Facebook.", "https://m.me/zmcatrading");
      } finally {
        setButtonLoading(submit, false);
      }
    });
  }

  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
