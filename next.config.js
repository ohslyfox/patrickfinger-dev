/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    async redirects() {
        return [
            {
                source: "/resume",
                destination: "/resume.pdf",
                permanent: true,
            },
            {
                source: "/lol",
                destination: "https://slyfox.lol",
                permanent: true,
            },
        ];
    },
};

module.exports = nextConfig;
