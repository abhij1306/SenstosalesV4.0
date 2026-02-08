import type { NextConfig } from "next";

const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
    output: 'standalone', // Enable for Electron (spawned server)
    reactStrictMode: true,
    poweredByHeader: false,
    compress: true,
    images: {
        unoptimized: false, // Standard handling
        formats: ['image/avif', 'image/webp'],
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'picsum.photos',
            },
            {
                protocol: 'https',
                hostname: 'i.pravatar.cc',
            },
            {
                protocol: 'https',
                hostname: 'images.pexels.com',
            },
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
        ],
    },
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production',
    },
    turbopack: {
        root: process.cwd(),
        rules: {
            '*.svg': {
                loaders: ['@svgr/webpack'],
                as: '*.js',
            },
        },
    },
    async rewrites() {
        return [
            {
                source: "/api/:path*",
                destination: `http://127.0.0.1:8000/api/:path*`,
            },
        ];
    },
    // Performance optimizations
    experimental: {
        optimizePackageImports: [

            'date-fns',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-popover',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slot',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
            'zustand'
        ],
        scrollRestoration: true,
    },
    // Webpack optimizations for tree shaking and code splitting
    webpack: (config, { isServer, dev }) => {
        // Enable tree shaking
        config.optimization = {
            ...config.optimization,
            usedExports: true,
            sideEffects: false,
        };

        // Split chunks optimization
        if (!isServer) {
            config.optimization.splitChunks = {
                chunks: 'all',
                cacheGroups: {
                    // Vendor chunk for node_modules
                    vendor: {
                        test: /[\\/]node_modules[\\/]/,
                        name: 'vendors',
                        chunks: 'all',
                        priority: 10,
                    },
                    // Common chunk for shared code
                    common: {
                        minChunks: 2,
                        chunks: 'all',
                        priority: 5,
                        reuseExistingChunk: true,
                    },
                    // Radix UI components chunk
                    radix: {
                        test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
                        name: 'radix-ui',
                        chunks: 'all',
                        priority: 15,
                    },
                },
            };
        }

        // Limit cache size in development
        if (dev) {
            config.cache = {
                type: 'filesystem',
                buildDependencies: {
                    config: [__filename],
                },
                // Limit cache size to 100MB
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                cacheDirectory: '.next/cache',
            };
        }

        return config;
    },
    // Limit build cache size
    onDemandEntries: {
        // Period (in ms) where pages will be kept in memory
        maxInactiveAge: 60 * 60 * 1000, // 1 hour
        // Number of pages to keep in memory
        pagesBufferLength: 5,
    },
};

export default withBundleAnalyzer(nextConfig);
