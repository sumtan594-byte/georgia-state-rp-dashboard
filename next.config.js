/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  logging: {
    incomingRequests: {
      ignore: [/^\/api\/presence(?:\?|$)/],
    },
  },
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;
