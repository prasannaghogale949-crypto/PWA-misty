import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// NOTE: install @vitejs/plugin-react as a devDependency (not listed above to
// keep the base install lean) — `npm i -D @vitejs/plugin-react`.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/*.png"],
      manifest: {
        name: "Sahyadri Passport — MistyMonoliths",
        short_name: "Sahyadri Passport",
        description: "Collect verified summit stamps across the Sahyadris.",
        theme_color: "#17140F",
        background_color: "#17140F",
        display: "standalone",
        orientation: "portrait",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        // Scanner routes need the camera + network live; never serve them
        // from cache. Everything else (shell, fonts, vault assets) can.
        navigateFallbackDenylist: [/^\/manager\/scan/, /^\/scan/],
      },
    }),
  ],
});
