import { ImageResponse } from "next/og";

/**
 * iOS uses this for the home-screen icon. Generated rather than checked in as a
 * binary so the palette stays tied to the design tokens.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0B0B0E",
          color: "#B14BF4",
          fontSize: 64,
          fontWeight: 700,
        }}
      >
        FPL
      </div>
    ),
    size,
  );
}
