/** @type {import('next').NextConfig} */

const nextConfig = {
    // deploy/server2-services.sh builds into .next-build and swaps it in only when complete
    distDir: process.env.NEXT_DIST_DIR || '.next',
    reactStrictMode: true,
    swcMinify: true,
    images: {
        unoptimized: true,
        domains: ['theme.dsngrid.com'],
        formats: ['image/webp']
    },
    // i18n: {
    //     locales: ["en"],
    //     defaultLocale: "en",
    // },
    compiler: {
        // Enables the styled-components SWC transform
        styledComponents: true,
    }

}

module.exports = nextConfig
