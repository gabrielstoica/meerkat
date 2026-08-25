import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const dynamic = "force-static";

// iOS home-screen icon. Same three-dot lookout as BrandMark, on limestone paper.
export default function AppleIcon() {
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
          background: "#eef1f4",
          paddingLeft: 58,
          gap: 14,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 9999,
            background: "#b86a2b",
          }}
        />
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 9999,
            background: "rgba(16, 24, 32, 0.8)",
            marginLeft: 20,
          }}
        />
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 9999,
            background: "rgba(16, 24, 32, 0.45)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
