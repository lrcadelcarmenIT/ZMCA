(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  if (!reducedMotion) document.documentElement.classList.add("js-motion");

  const meter = $("#scrollMeter");
  const updateScroll = () => {
    const available = document.documentElement.scrollHeight - window.innerHeight;
    if (meter) meter.style.width = `${available > 0 ? Math.min(100, (window.scrollY / available) * 100) : 0}%`;
    document.documentElement.style.setProperty("--scroll-y", `${window.scrollY}px`);
  };
  let scrollFrame = 0;
  window.addEventListener("scroll", () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => { updateScroll(); scrollFrame = 0; });
  }, { passive: true });
  window.addEventListener("resize", updateScroll, { passive: true });
  updateScroll();

  const aura = $("#cursorAura");
  if (aura && finePointer && !reducedMotion) {
    let auraFrame = 0;
    window.addEventListener("pointermove", (event) => {
      if (auraFrame) cancelAnimationFrame(auraFrame);
      auraFrame = requestAnimationFrame(() => {
        aura.style.left = `${event.clientX}px`;
        aura.style.top = `${event.clientY}px`;
        aura.style.opacity = "1";
      });
    });
    $$("a, button, .tilt-card").forEach((item) => {
      item.addEventListener("pointerenter", () => aura.classList.add("active"));
      item.addEventListener("pointerleave", () => aura.classList.remove("active"));
    });
  }

  const menuToggle = $("#menuToggle");
  const navLinks = $("#navLinks");
  const closeMenu = () => {
    if (!menuToggle || !navLinks) return;
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
    navLinks.classList.remove("open");
  };
  menuToggle?.addEventListener("click", () => {
    const open = menuToggle.getAttribute("aria-expanded") !== "true";
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    navLinks?.classList.toggle("open", open);
  });
  $$("a", navLinks || document.createElement("div")).forEach((link) => link.addEventListener("click", closeMenu));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuToggle?.getAttribute("aria-expanded") === "true") {
      closeMenu();
      menuToggle.focus();
    }
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".nav")) closeMenu();
  });

  const reveals = $$(".reveal");
  if ("IntersectionObserver" in window && !reducedMotion) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -45px" });
    reveals.forEach((element, index) => {
      element.style.transitionDelay = `${Math.min(index % 3, 2) * 70}ms`;
      revealObserver.observe(element);
    });
  } else {
    reveals.forEach((element) => element.classList.add("visible"));
  }

  if (finePointer && !reducedMotion) {
    $$(".tilt-card").forEach((card) => {
      let tiltFrame = 0;
      card.addEventListener("pointermove", (event) => {
        if (tiltFrame) cancelAnimationFrame(tiltFrame);
        tiltFrame = requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width - 0.5;
          const y = (event.clientY - rect.top) / rect.height - 0.5;
          card.style.transform = `perspective(1000px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 7).toFixed(2)}deg) translateZ(8px)`;
        });
      });
      card.addEventListener("pointerleave", () => { cancelAnimationFrame(tiltFrame); card.style.transform = ""; });
    });
  }

  const showcaseVideo = $("#showcaseVideo");
  const comparisonVideo = $("#comparisonVideo");
  const videoControl = $("#videoControl");
  let videoManuallyPaused = false;
  let motionPaused = reducedMotion;
  let videoInView = false;
  let comparisonInView = false;
  const allowAutoplay = !reducedMotion && !navigator.connection?.saveData;
  const updateVideoPlayback = () => {
    if (showcaseVideo) {
      if (videoInView && !document.hidden && !motionPaused && !videoManuallyPaused && allowAutoplay) {
        showcaseVideo.play().catch(() => {});
      } else showcaseVideo.pause();
    }
    if (comparisonVideo) {
      if (comparisonInView && !document.hidden && !motionPaused && allowAutoplay) {
        comparisonVideo.play().catch(() => {});
      } else comparisonVideo.pause();
    }
  };
  if (showcaseVideo && videoControl) {
    showcaseVideo.controls = false;
    const syncVideoControl = () => {
      const paused = showcaseVideo.paused;
      videoControl.lastChild.textContent = paused ? " PLAY" : " PAUSE";
      videoControl.setAttribute("aria-label", paused ? "Play showcase video" : "Pause showcase video");
    };
    videoControl.addEventListener("click", () => {
      videoManuallyPaused = !showcaseVideo.paused;
      if (showcaseVideo.paused) showcaseVideo.play().catch(syncVideoControl);
      else showcaseVideo.pause();
      syncVideoControl();
    });
    showcaseVideo.addEventListener("play", syncVideoControl);
    showcaseVideo.addEventListener("pause", syncVideoControl);
    syncVideoControl();
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => {
        videoInView = entry.isIntersecting;
        updateVideoPlayback();
      }, { threshold: .15 }).observe(showcaseVideo);
    }
  }
  if (comparisonVideo && "IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      comparisonInView = entry.isIntersecting;
      updateVideoPlayback();
    }, { threshold: .2 }).observe(comparisonVideo);
  }
  document.addEventListener("visibilitychange", updateVideoPlayback);

  $("#motionControl")?.addEventListener("click", (event) => {
    motionPaused = !motionPaused;
    document.documentElement.classList.toggle("motion-paused", motionPaused);
    event.currentTarget.setAttribute("aria-pressed", String(motionPaused));
    event.currentTarget.textContent = motionPaused ? "Resume motion" : "Pause motion";
    updateVideoPlayback();
  });
  $("#prepSlider")?.addEventListener("input", (event) => {
    $("#prepComparison")?.style.setProperty("--split", `${event.target.value}%`);
    event.target.setAttribute("aria-valuetext", `${event.target.value} percent manual preparation visible`);
  });

  const switcher = $("#productSwitcher");
  const switcherButtons = $$(".switcher-tabs button", switcher || document.createElement("div"));
  const switcherTitle = $("#switcherTitle");
  const switcherCopy = $("#switcherCopy");
  const switcherCount = $("#switcherCount");
  const visualWord = $("#visualWord");
  let switcherTimer = 0;
  // A single live panel keeps the visual layout compact while exposing proper tabs.
  const switcherPanel = $(".switcher-panel", switcher || document.createElement("div"));
  if (switcherPanel) {
    const content = document.createElement("div");
    content.id = "switcherContent";
    content.setAttribute("role", "tabpanel");
    content.setAttribute("aria-labelledby", "productTab0");
    content.tabIndex = 0;
    content.className = "switcher-content";
    switcherTitle?.before(content);
    if (switcherTitle) content.append(switcherTitle);
    if (switcherCopy) content.append(switcherCopy);
  }
  switcherButtons.forEach((button) => {
    button.id = `productTab${button.dataset.index}`;
    button.setAttribute("aria-controls", "switcherContent");
    button.tabIndex = button.classList.contains("active") ? 0 : -1;
    button.addEventListener("keydown", (event) => {
      const index = switcherButtons.indexOf(button);
      const next = event.key === "ArrowRight" ? (index + 1) % switcherButtons.length : event.key === "ArrowLeft" ? (index - 1 + switcherButtons.length) % switcherButtons.length : event.key === "Home" ? 0 : event.key === "End" ? switcherButtons.length - 1 : null;
      if (next === null) return;
      event.preventDefault();
      switcherButtons[next].focus();
      switcherButtons[next].click();
    });
    button.addEventListener("click", () => {
      if (!switcher || button.classList.contains("active")) return;
      switcher.classList.add("is-changing");
      switcherButtons.forEach((item) => {
        const selected = item === button;
        item.classList.toggle("active", selected);
        item.setAttribute("aria-selected", String(selected));
        item.tabIndex = selected ? 0 : -1;
      });
      clearTimeout(switcherTimer);
      switcherTimer = window.setTimeout(() => {
        if (switcherTitle) switcherTitle.textContent = button.dataset.title || "";
        if (switcherCopy) switcherCopy.textContent = button.dataset.copy || "";
        if (visualWord) visualWord.textContent = button.dataset.word || "";
        if (switcherCount) switcherCount.textContent = `${String(Number(button.dataset.index || 0) + 1).padStart(2, "0")} / 05`;
        $("#switcherContent")?.setAttribute("aria-labelledby", button.id);
        switcher.classList.remove("is-changing");
      }, reducedMotion ? 0 : 220);
    });
  });
  $(".switcher-panel a", switcher || document.createElement("div"))?.addEventListener("click", () => {
    const product = $("#contactProduct");
    const selected = switcherButtons.find((button) => button.getAttribute("aria-selected") === "true");
    if (product && !product.value && selected) product.value = selected.dataset.title || selected.textContent;
  });

  const rail = $("#equipmentRail");
  const railStep = () => ($( ".machine-card", rail || document.createElement("div"))?.getBoundingClientRect().width || 420) + 18;
  const syncRail = () => {
    if (!rail) return;
    if ($("#railPrev")) $("#railPrev").disabled = rail.scrollLeft <= 2;
    if ($("#railNext")) $("#railNext").disabled = rail.scrollLeft >= rail.scrollWidth - rail.clientWidth - 2;
  };
  rail?.addEventListener("scroll", syncRail, { passive: true });
  rail?.addEventListener("dragstart", (event) => event.preventDefault());
  window.addEventListener("resize", syncRail, { passive: true });
  syncRail();
  $("#railPrev")?.addEventListener("click", () => rail?.scrollBy({ left: -railStep(), behavior: reducedMotion ? "auto" : "smooth" }));
  $("#railNext")?.addEventListener("click", () => rail?.scrollBy({ left: railStep(), behavior: reducedMotion ? "auto" : "smooth" }));
  if (rail && finePointer) {
    let dragging = false;
    let startX = 0;
    let startScroll = 0;
    rail.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.target.closest("a")) return;
      dragging = true;
      rail.classList.add("is-dragging");
      startX = event.clientX;
      startScroll = rail.scrollLeft;
      rail.setPointerCapture(event.pointerId);
    });
    rail.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      rail.scrollLeft = startScroll - (event.clientX - startX);
    });
    const stopDrag = () => { dragging = false; rail.classList.remove("is-dragging"); };
    rail.addEventListener("pointerup", stopDrag);
    rail.addEventListener("pointercancel", stopDrag);
    rail.addEventListener("lostpointercapture", stopDrag);
  }

  const interestField = () => $("#contactInterest");
  const messageField = () => $("#contactMessage");
  $$('[data-interest]').forEach((element) => {
    element.querySelector("a[href='#contact']")?.addEventListener("click", () => selectInterest(element.dataset.interest || ""));
    if (element.matches("a")) element.addEventListener("click", () => selectInterest(element.dataset.interest || ""));
  });
  function selectInterest(interest) {
    const field = interestField();
    const message = messageField();
    if (!field || !message) return;
    const lower = interest.toLowerCase();
    if (lower.includes("pack") || lower.includes("seal") || lower.includes("fill")) field.value = "Packaging equipment";
    else if (lower.includes("line")) field.value = "Complete production line";
    else if (lower.includes("parts") || lower.includes("support")) field.value = "Parts or after-sales support";
    else field.value = "Food processing machinery";
    if (!message.value) message.value = `I would like to discuss ${interest.toLowerCase()}.`;
  }

  const finderForm = $("#finderForm");
  const finderResult = $("#finderResult");
  const resultTitle = $("#resultTitle");
  const resultSummary = $("#resultSummary");
  const recommendationList = $("#recommendationList");
  let pendingPlan = null;
  const setButtonLoading = (button, loading, label) => {
    if (!button) return;
    if (loading) {
      button._originalContent = [...button.childNodes];
      button.textContent = label;
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
    } else {
      if (button._originalContent) button.replaceChildren(...button._originalContent);
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }
  };
  const renderRecommendation = (data) => {
    if (!resultTitle || !resultSummary || !recommendationList || !finderForm || !finderResult) return;
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
    resultTitle.tabIndex = -1;
    resultTitle.focus({ preventScroll: true });
  };

  finderForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!finderResult) return;
    const submit = $("button[type='submit']", finderForm);
    const payload = Object.fromEntries(new FormData(finderForm).entries());
    pendingPlan = {
      product: finderForm.elements.product.selectedOptions[0]?.textContent || "",
      interest: payload.need === "packaging" ? "Packaging equipment" : payload.need === "full-line" ? "Complete production line" : payload.need === "unsure" ? "Not sure yet" : "Food processing machinery",
      output: payload.output || "",
      message: `Please help me review equipment for ${finderForm.elements.product.selectedOptions[0]?.textContent || "my product"}. My priority is ${finderForm.elements.need.selectedOptions[0]?.textContent || "production"}.`
    };
    setButtonLoading(submit, true, "Building your plan…");
    try {
      const response = await fetch("/api/recommend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Recommendation unavailable");
      renderRecommendation(data);
      pendingPlan.message = `I used the machine finder and received: ${data.recommendations.map((item) => item.name).join(", ")}. I would like help confirming the right setup.`;
    } catch (error) {
      renderRecommendation({ title: "Send the production details directly", summary: "The automated match is temporarily unavailable. ZMCA can still review the same details through the inquiry form.", recommendations: [{ name: "Direct ZMCA review", reason: "Share the product, process, output target, and main bottleneck below." }] });
    } finally {
      setButtonLoading(submit, false);
    }
  });
  $("#finderReset")?.addEventListener("click", () => {
    finderForm?.reset();
    if (finderForm) finderForm.hidden = false;
    if (finderResult) finderResult.hidden = true;
    recommendationList?.replaceChildren();
    pendingPlan = null;
    finderForm?.elements.product.focus();
  });
  $("#useRecommendation")?.addEventListener("click", () => {
    if (pendingPlan) {
      $("#contactProduct").value = pendingPlan.product;
      $("#contactInterest").value = pendingPlan.interest;
      $("#contactOutput").value = pendingPlan.output;
      if (!$("#contactMessage").value) $("#contactMessage").value = pendingPlan.message;
    }
    window.setTimeout(() => $("#contactProduct")?.focus({ preventScroll: true }), reducedMotion ? 0 : 450);
  });

  const contactForm = $("#contactForm");
  const contactStatus = $("#contactStatus");
  const showContactStatus = (kind, message, link) => {
    if (!contactStatus) return;
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
  contactForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!contactForm.reportValidity()) return;
    const submit = $("button[type='submit']", contactForm);
    const payload = Object.fromEntries(new FormData(contactForm).entries());
    payload.consent = Boolean(contactForm.elements.consent.checked);
    setButtonLoading(submit, true, "Preparing inquiry…");
    showContactStatus("", "Validating your equipment inquiry…");
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Unable to prepare inquiry");
      const message = data.notification === "sent" ? `Inquiry ${data.reference} was submitted. You can also continue directly in Messenger.` : `Inquiry ${data.reference} is ready. Continue in Messenger to send it directly to ZMCA.`;
      showContactStatus("success", message, data.messengerUrl);
      // Keep the details available until the visitor has actually sent the Messenger handoff.
    } catch (error) {
      showContactStatus("error", error.message || "The form could not be submitted. Please message ZMCA directly.", "https://m.me/zmcatrading");
    } finally {
      setButtonLoading(submit, false);
    }
  });

  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
