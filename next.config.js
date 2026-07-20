/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  logging: {
    incomingRequests: {
      ignore: [/^\/api\/presence(?:\?|$)/],
    },
  },
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      { source: '/privacy-policy.html', destination: '/privacy-policy', permanent: true },
      { source: '/terms-of-service.html', destination: '/terms-of-service', permanent: true },
    ];
  },
  async headers() {
    const noIndex = [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }];
    return [
      { source: '/api/:path*', headers: noIndex },
      { source: '/training.html', headers: noIndex },
      { source: '/google5bd3de71cd1f42a2.html', headers: noIndex },
      { source: '/login', headers: noIndex },
      { source: '/verify', headers: noIndex },
      { source: '/ban-appeals', headers: noIndex },
      { source: '/dashboard', headers: noIndex },
      { source: '/admins', headers: noIndex },
      { source: '/audit-logs', headers: noIndex },
      { source: '/admin/:path*', headers: noIndex },
      { source: '/applications/:path*', headers: noIndex },
      { source: '/apply/:path+', headers: noIndex },
      { source: '/panel/:path*', headers: noIndex },
      { source: '/training/:path*', headers: noIndex },
      { source: '/trainer-handbook', headers: noIndex },
      { source: '/staff-handbook/:path*', headers: noIndex },
      { source: '/staff-intake/:path*', headers: noIndex },
      { source: '/transcripts/:path*', headers: noIndex },
      { source: '/transcript/:path*', headers: noIndex },
    ];
  },
};

module.exports = nextConfig;
