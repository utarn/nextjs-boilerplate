import Script from 'next/script'

const SCRIPT_CONTENT = `
(function() {
  try {
    var theme = localStorage.getItem("theme") || "modern-minimal";
    var colorMode = localStorage.getItem("colorMode") || "system";
    var root = document.documentElement;

    root.setAttribute("data-theme", theme);

    var isDark = colorMode === "dark" ||
      (colorMode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  } catch (e) {}
})();
`

/**
 * FOUC (Flash Of Unstyled Content) prevention script.
 *
 * Uses next/script with beforeInteractive strategy so the inline script is
 * injected into the initial HTML from the server and runs before any paint.
 */
export function ThemeScript() {
  return (
    <Script
      id="theme-script"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: SCRIPT_CONTENT }}
    />
  )
}
