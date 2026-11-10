import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A self-contained server in .next/standalone (server.js plus only the traced node_modules).
  // CI packs it into the container image; see specs/002-ci-docker-publish/research.md R1.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
