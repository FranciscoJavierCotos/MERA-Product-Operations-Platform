/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== "production";

const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  images: {
    remotePatterns: [
      ...(isDev
        ? [
            {
              protocol: "http",
              hostname: "localhost",
              port: "",
              pathname: "/**",
              search: "",
            },
            {
              protocol: "http",
              hostname: "127.0.0.1",
              port: "",
              pathname: "/**",
              search: "",
            },
          ]
        : []),
      {
        protocol: "https",
        hostname: "**.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
        search: "",
      },
    ],
  },
};

module.exports = nextConfig;
