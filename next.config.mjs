/** @type {import('next').NextConfig} */
const nextConfig = {
    env: {
        NEXT_PUBLIC_API_SECRET_KEY: process.env.API_SECRET_KEY,
    }
};

export default nextConfig;
