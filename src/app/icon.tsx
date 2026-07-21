import { ImageResponse } from "next/og";
export const size = { width: 512, height: 512 }; export const contentType = "image/png";
export default function Icon() { return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1f5d3a", color: "white", fontSize: 260, fontWeight: 800 }}>W</div>, { ...size }); }
