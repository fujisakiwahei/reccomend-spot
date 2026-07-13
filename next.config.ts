import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";
const deploymentId = getVercelDeploymentId();

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https://upload.wikimedia.org https://tile.openstreetmap.org",
  "font-src 'self' data:",
  "connect-src 'self' https://tile.openstreetmap.org",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  deploymentId,
  poweredByHeader: false,
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        port: "",
        pathname: "/wikipedia/commons/thumb/**",
        search: "",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

function getVercelDeploymentId(): string | undefined {
  const vercelDeploymentId = process.env.VERCEL_DEPLOYMENT_ID;

  if (vercelDeploymentId !== undefined) {
    const normalizedDeploymentId = vercelDeploymentId.startsWith("dpl_")
      ? vercelDeploymentId.slice(4)
      : vercelDeploymentId;

    return normalizedDeploymentId.slice(0, 32);
  }

  // VercelのデプロイIDが未公開でも、コミットごとに画面と配信アセットを揃える。
  return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 32);
}
