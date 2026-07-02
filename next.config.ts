import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    // the surfaces were renamed to verbs that scale (execute / create /
    // supply / explore); keep the old paths alive for shared links
    return [
      { source: "/run", destination: "/execute", permanent: true },
      { source: "/generate", destination: "/create", permanent: true },
      { source: "/share", destination: "/supply", permanent: true },
      { source: "/app", destination: "/explore", permanent: true },
    ];
  },
};

export default nextConfig;
