import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The dev/preview server is reached through a rotating sandbox host
// (<port>-<sandbox id>.e2b.app for Arena, or the Base44 equivalent), so those
// hosts have to be allowed explicitly. localhost and raw IPs stay allowed by Vite.
const allowedHosts = [
  // Arena / E2B live preview hosts (<port>-<sandbox id>.e2b.app)
  ".e2b.app",
  // Base44 sandbox preview hosts
  ...(process.env.BASE44_PREVIEW_MODE === "1" && process.env.BASE44_SANDBOX_HOST_DOMAIN
    ? [`.${process.env.BASE44_SANDBOX_HOST_DOMAIN}`]
    : []),
];

// ESPN's public API is keyless and CORS-enabled; these proxies are the
// same-origin fallback used by src/api/espn.js when a browser blocks the direct
// call. They also make the endpoints easy to inspect during development:
//   /espn/apis/site/v2/sports/basketball/nba/scoreboard
//   /espn-web/apis/common/v3/sports/basketball/nba/leaders
const espnProxy = {
  "/espn-web": {
    target: "https://site.web.api.espn.com",
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/espn-web/, ""),
  },
  "/espn": {
    target: "https://site.api.espn.com",
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/espn/, ""),
  },
};

// Sportsrc's API is keyed (X-API-KEY header); this proxy keeps the endpoint
// reachable when the browser blocks the direct call, and forwards the header
// server-side. The key is also attached as an `api_key` query parameter by
// src/api/sportsrc.js as a fallback:
//   /sportsrc/?type=matches&sport=basketball
const sportsrcProxy = {
  "/sportsrc": {
    target: "https://api.sportsrc.org/v3",
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/sportsrc/, ""),
  },
};

const apiProxy = { ...espnProxy, ...sportsrcProxy };

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    strictPort: true,
    allowedHosts,
    watch: { usePolling: true },
    proxy: apiProxy,
  },
  preview: {
    host: true,
    port: 3000,
    strictPort: true,
    allowedHosts,
    proxy: apiProxy,
  },
  test: {
    environment: "jsdom",
  },
});
