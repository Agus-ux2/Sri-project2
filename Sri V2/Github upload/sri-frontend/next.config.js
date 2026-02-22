/** @type {import('next').NextConfig} */
const nextConfig = {
    // Static export for S3 hosting
    output: 'export',

    // Disable image optimization (not supported in static export)
    images: {
        unoptimized: true,
    },

    // Trailing slashes for S3 compatibility
    trailingSlash: true,

    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },

    // Environment variable for API URL
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://cdxoud6wm6.execute-api.us-east-1.amazonaws.com/prod',
    },
};

module.exports = nextConfig;
