/** @type {import('next').NextConfig} */
const nextConfig = {
    swcMinify: false,
    images: {
        domains: ['avatars.githubusercontent.com'],
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    }
};

module.exports = nextConfig;
