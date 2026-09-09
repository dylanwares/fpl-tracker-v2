import type { MetadataRoute } from "next";

/**
 * Installed to the home screen, this runs without browser chrome — the single
 * biggest thing that makes the app feel native (design spec §8).
 *
 * `orientation` is deliberately unset: the fixture ticker is the one view that
 * genuinely benefits from landscape, and that's still an open question.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FPL Tracker",
    short_name: "FPL",
    description: "Midweek planning aid for Fantasy Premier League",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0b0e",
    theme_color: "#0b0b0e",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
