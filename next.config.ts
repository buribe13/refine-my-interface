import type { NextConfig } from "next";

/**
 * GitHub Pages needs a static export + a repo base path.
 *
 * For a project site: https://<user>.github.io/<repo>/
 * set NEXT_PUBLIC_BASE_PATH="/<repo>" (example: "/refine-my-interface").
 *
 * For a user/organization site at the domain root:
 * leave NEXT_PUBLIC_BASE_PATH empty.
 */
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").trim();
const normalizedBasePath =
  basePath === "" ? "" : basePath.startsWith("/") ? basePath : `/${basePath}`;

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: normalizedBasePath,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
