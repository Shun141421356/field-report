const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/,
      handler: 'CacheFirst',
      options: { cacheName: 'photos', expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 } },
    },
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/,
      handler: 'NetworkFirst',
      options: { cacheName: 'api', networkTimeoutSeconds: 10 },
    },
  ],
})

module.exports = withPWA({
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/**' }],
  },
})
