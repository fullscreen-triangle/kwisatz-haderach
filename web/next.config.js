/** @type {import('next').NextConfig} */

const nextConfig = {
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
