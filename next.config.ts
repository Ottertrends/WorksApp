import type { NextConfig } from "next";

// Turbopack must use this folder (where package.json lives), not the parent.
// Avoid `import.meta.url` here because Next's config loader can treat this file
// differently between dev/prod and between bundlers.
const projectRoot = typeof __dirname === "string" ? __dirname : process.cwd();

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return ["/auth/:path*", "/dashboard/:path*", "/admin/:path*", "/invoice/:path*", "/proposal/:path*", "/api/:path*"].map(source => ({
      source, headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
    }));
  },
  turbopack: {
    root: projectRoot,
  },
  serverExternalPackages: ["jspdf", "jspdf-autotable"],
};

export default nextConfig;
