/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        tactical: {
          bg: "#0a0a0f",
          panel: "rgba(12, 12, 20, 0.85)",
          glass: "rgba(12, 12, 20, 0.72)",
          border: "rgba(255, 255, 255, 0.08)",
          borderHover: "rgba(255, 255, 255, 0.18)",
          cyan: "#00d4ff",
          cyanDim: "rgba(0, 212, 255, 0.15)",
          cyanGlow: "rgba(0, 212, 255, 0.45)",
          amber: "#ffaa00",
          amberDim: "rgba(255, 170, 0, 0.15)",
          red: "#ff4444",
          green: "#00ff88",
          textPrimary: "#e8eaed",
          textSecondary: "rgba(232, 234, 237, 0.65)",
          textDim: "rgba(232, 234, 237, 0.35)",
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"SF Mono"', "monospace"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        cyanGlow: "0 0 20px rgba(0, 212, 255, 0.35)",
        panelGlow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      },
      borderRadius: {
        panel: "16px",
        btn: "10px",
      },
    },
  },
  plugins: [],
};
