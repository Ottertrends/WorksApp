import { ImageResponse } from "next/og";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function OpenGraphImage() { return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#f6f8f3", color: "#13281d" }}><div style={{ fontSize: 72, fontWeight: 800 }}>WorksApp</div><div style={{ fontSize: 34, marginTop: 20 }}>AI-powered project management for contractors.</div></div>, { ...size }); }
