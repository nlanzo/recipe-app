import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "mui-vendor": ["@mui/material", "@mui/icons-material"],
          utils: ["zod", "react-markdown"],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    proxy: {
      // Auth endpoints stay in Node.js backend
      "/api/auth": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
        secure: false,
      },
      // All other API endpoints route to .NET backend
      "/api": {
        target: "http://localhost:5169",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      reporter: ["text", "html"],
      exclude: ["node_modules/"],
    },
  },
})
