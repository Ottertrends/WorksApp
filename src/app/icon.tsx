import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

const logoUrl = new URL("../../public/logo.png", import.meta.url).toString();

export default function Icon() {
  return new ImageResponse(
    <img
      alt="WorksApp"
      height={size.height}
      src={logoUrl}
      style={{ objectFit: "contain" }}
      width={size.width}
    />,
    { ...size },
  );
}
