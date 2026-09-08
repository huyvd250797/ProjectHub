"use client";

import { useEffect } from "react";

const MODAL_SELECTOR = [
  "[role='dialog']",
  "[aria-modal='true']",
  "[data-modal-lock='true']",
  "[class*='fixed'][class*='inset-0'][class*='z-']",
].join(",");

function isVisibleModal(element: Element) {
  if (!(element instanceof HTMLElement)) return false;
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
  return element.getClientRects().length > 0;
}

export function GlobalModalScrollLock() {
  useEffect(() => {
    let locked = false;
    let previousOverflow = "";
    let previousHtmlOverflow = "";
    let previousPosition = "";
    let previousTop = "";
    let previousWidth = "";
    let scrollY = 0;

    function lock() {
      if (locked) return;
      locked = true;
      scrollY = window.scrollY;
      previousOverflow = document.body.style.overflow;
      previousHtmlOverflow = document.documentElement.style.overflow;
      previousPosition = document.body.style.position;
      previousTop = document.body.style.top;
      previousWidth = document.body.style.width;
      document.documentElement.classList.add("asc-modal-scroll-locked");
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
    }

    function unlock() {
      if (!locked) return;
      locked = false;
      document.documentElement.classList.remove("asc-modal-scroll-locked");
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousOverflow;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      document.body.style.width = previousWidth;
      window.scrollTo(0, scrollY);
    }

    function sync() {
      const hasModal = Array.from(document.body.querySelectorAll(MODAL_SELECTOR)).some(isVisibleModal);
      if (hasModal) lock();
      else unlock();
    }

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { attributes: true, childList: true, subtree: true, attributeFilter: ["class", "style", "aria-modal", "data-modal-lock"] });
    window.addEventListener("resize", sync);
    sync();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
      unlock();
    };
  }, []);

  return null;
}
