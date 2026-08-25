import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Raster fallback of the BrandMark lookout dots (Safari does not use SVG favicons).
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          paddingLeft: 10,
          gap: 3,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: 9999,
            background: "#b86a2b",
          }}
        />
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: 9999,
            background: "rgba(16, 24, 32, 0.8)",
            marginLeft: 5,
          }}
        />
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: 9999,
            background: "rgba(16, 24, 32, 0.45)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
