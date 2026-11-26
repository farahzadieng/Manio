import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA, type ManifestOptions } from "vite-plugin-pwa";
const manifest = {
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
      src: "/icons/manio-fullbleed-192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/icons/manio-fullbleed-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    },
  ],
} satisfies Partial<ManifestOptions>;

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "manio-dark-manifest",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "manifest-dark.webmanifest",
          source: JSON.stringify({
            ...manifest,
            icons: manifest.icons.map((icon) => ({
              ...icon,
              src: icon.src.replace("fullbleed-", "fullbleed-dark-"),
            })),
          }),
        });
      },
    },
    VitePWA({
      registerType: "prompt",
      includeAssets: [
        "icons/manio-fullbleed-192.png",
        "icons/manio-fullbleed-512.png",
        "icons/apple-touch-icon-fullbleed-180.png",
        "icons/manio-fullbleed-dark-192.png",
        "icons/manio-fullbleed-dark-512.png",
        "icons/apple-touch-icon-fullbleed-dark-180.png",
      ],
      manifest,
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: [
          "**/*.{js,css,html,svg,woff2}",
          "manifest-dark.webmanifest",
        ],
        runtimeCaching: [],
      },
    }),
  ],
});
