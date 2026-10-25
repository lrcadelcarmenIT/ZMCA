/* ZMCA main.js — scroll reveal + sticky header behavior. Transform and opacity only. */
(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  if (!reducedMotion) document.documentElement.classList.add("js-motion");

  /* Scroll reveal: fade + rise 16px. The Three steps cards stagger by position. */
  const reveals = $$(".reveal");
  if ("IntersectionObserver" in window && !reducedMotion) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -45px" });
    reveals.forEach((element) => {
      const stepsGrid = element.closest(".steps-grid");
      if (stepsGrid) {
        const siblings = [...stepsGrid.children].filter((child) => child.classList.contains("reveal"));
        element.style.transitionDelay = `${siblings.indexOf(element) * 90}ms`;
      } else {
        element.style.transitionDelay = `${Math.min(reveals.indexOf(element) % 3, 2) * 70}ms`;
      }
      revealObserver.observe(element);
    });
  } else {
    reveals.forEach((element) => element.classList.add("visible"));
  }

  /* Sticky header gains shadow and blur once the page scrolls. */
  const header = document.querySelector(".site-header");
  let scrollFrame = 0;
  const updateHeader = () => {
    if (header) header.classList.toggle("scrolled", window.scrollY > 8);
    scrollFrame = 0;
  };
  window.addEventListener("scroll", () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(updateHeader);
  }, { passive: true });
  updateHeader();
})();
