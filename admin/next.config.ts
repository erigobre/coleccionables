import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // El build en el contenedor de Coolify (pocos vCPUs -> pocos workers) falla
  // al prerenderizar /_global-error con un bug de concurrencia de Turbopack
  // (warnings de "key" duplicada en <html>/<head>/<meta>). Forzar 1 worker
  // evita la condicion de carrera; en local con mas CPUs no se reproducia.
  experimental: {
    cpus: 1,
  },
};

export default nextConfig;
