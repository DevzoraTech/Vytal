import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";


// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: ["67bb98ac25cd.ngrok-free.app"],
    proxy: {
      "/api": {
        target: process.env.vytal_backend_url, //target//
        changeOrigin: true,
      },
    },
  },
});
