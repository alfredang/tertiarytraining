import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  // dockerode pulls in `ssh2` which has native binaries/assets that
  // can't be bundled into ESM server chunks. Keep them external so
  // they're require()'d at runtime from node_modules.
  serverExternalPackages: ["dockerode", "docker-modem", "ssh2", "tar-stream"],
};

export default nextConfig;
