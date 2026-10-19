"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Apple-style momentum scrolling.
 *
 * - Wheel / trackpad input is smoothed with an inertial lerp, so the page glides and settles softly.
 * - Touch devices keep their native momentum (and iOS rubber-band), which is already the "Apple" feel there.
 * - Anchor links (#consultation-area, …) glide instead of jumping.
 * - Scrollable panels (AI chat, hero drawer) keep native scrolling so they never fight the page.
 * - Honors `prefers-reduced-motion` (Lenis disables smoothing automatically).
 *
 * Renders nothing; it only drives window scrolling. Pure presentation – no API / data logic.
 */
export default function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true,
      smoothWheel: true,
      lerp: 0.085, // lower = longer, softer glide
      wheelMultiplier: 0.95,
      anchors: true,
      allowNestedScroll: true,
      prevent: (node) => Boolean(node.closest?.(".ai-chat-body, .half-form-drawer, .ai-chat-modal, select, textarea")),
    });

    return () => lenis.destroy();
  }, []);

  return null;
}
