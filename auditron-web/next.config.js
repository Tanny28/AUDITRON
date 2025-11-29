/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    images: {
        domains: ['localhost'],
        unoptimized: process.env.NODE_ENV === 'development',
    },
    env: {
        NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE,
        NEXT_PUBLIC_STRIPE_PK: process.env.NEXT_PUBLIC_STRIPE_PK,
    },
}

module.exports = nextConfig
