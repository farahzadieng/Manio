import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: [
        "icons/manio-192.png",
        "icons/manio-512.png",
        "icons/apple-touch-icon-180.png",
      ],
      manifest: {
        name: "مانیو — دفتر خرج شخصی",
        short_name: "مانیو",
        lang: "fa",
        dir: "rtl",
        start_url: "/",
        display: "standalone",
        background_color: "#F8F6F1",
        theme_color: "#F8F6F1",
        icons: [
          {
            src: "/icons/manio-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/manio-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],
        runtimeCaching: [],
      },
    }),
  ],
});
