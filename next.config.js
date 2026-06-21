/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: __dirname,
  },
  serverRuntimeConfig: {
    _startup: (() => {
      const port = process.env.SERVER_PORT || process.env.PORT || 3001;
      console.log(`Server is running on port ${port}`);
    })(),
  },
};

module.exports = nextConfig;
