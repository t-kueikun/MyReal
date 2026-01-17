/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === 'development';

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (isServer) {
      if (Array.isArray(config.externals)) {
        config.externals.push('onnxruntime-node');
      } else if (typeof config.externals === 'function') {
        const originalExternals = config.externals;
        config.externals = async (ctx, req, cb) => {
          if (req === 'onnxruntime-node') {
            return cb(null, 'commonjs onnxruntime-node');
          }
          return originalExternals(ctx, req, cb);
        };
      }
    } else {
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        'onnxruntime-node': false
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          {
            key: 'Permissions-Policy',
            value:
              'camera=(self), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value:
              `default-src 'self'; img-src 'self' data: blob: https:; media-src 'self' blob: https:; connect-src 'self' https: data:; font-src 'self' https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}; frame-ancestors 'none'`
          }
        ]
      }
    ];
  }
};

export default nextConfig;
