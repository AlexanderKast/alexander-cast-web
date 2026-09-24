"use client";

import { useEffect } from "react";
import Cal, { getCalApi } from "@calcom/embed-react";

export function CalEmbed({
  calLink,
  namespace = "consultoria",
  brandColor = "#E6B800",
}: {
  calLink: string;
  namespace?: string;
  /** Accent color inside the Cal.com widget (defaults to the original gold). */
  brandColor?: string;
}) {
  useEffect(() => {
    (async () => {
      const cal = await getCalApi({ namespace });
      cal("ui", {
        cssVarsPerTheme: {
          dark: { "cal-brand": brandColor },
          light: { "cal-brand": brandColor },
        },
        hideEventTypeDetails: false,
        layout: "month_view",
      });
    })();
  }, [namespace, brandColor]);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
      <Cal
        namespace={namespace}
        calLink={calLink}
        style={{ width: "100%", height: "680px", overflow: "scroll" }}
        config={{ layout: "month_view", theme: "dark" }}
      />
    </div>
  );
}
