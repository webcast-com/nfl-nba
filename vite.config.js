import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In the Base44 sandbox the preview proxy reaches Vite through a rotating sandbox
// host (<port>-<sandbox id>.<domain>), so that host has to be allowed explicitly.
// Outside preview mode the default Vite host checks are kept untouched.
const previewHosts =
  process.env.BASE44_PREVIEW_MODE === "1" && process.env.BASE44_SANDBOX_HOST_DOMAIN
    ? [`.${process.env.BASE44_SANDBOX_HOST_DOMAIN}`]
    : undefined;

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    strictPort: true,
    allowedHosts: previewHosts,
    watch: { usePolling: true },
  },
  test: {
    environment: "jsdom",
  },
});
