/* global document, window */
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
const touchIcon = document.querySelector('link[rel="apple-touch-icon"]');
const manifest = document.querySelector('link[rel="manifest"]');
const defaultManifest = manifest?.getAttribute("href");

// The browser can use these assets when adding Manio to the home screen.
function syncInstallAppearance() {
  touchIcon?.setAttribute(
    "href",
    systemDark.matches
      ? "/icons/apple-touch-icon-fullbleed-dark-180.png"
      : "/icons/apple-touch-icon-fullbleed-180.png",
  );
  if (defaultManifest) {
    manifest.setAttribute(
      "href",
      systemDark.matches ? "/manifest-dark.webmanifest" : defaultManifest,
    );
  }
}

syncInstallAppearance();
systemDark.addEventListener("change", syncInstallAppearance);
