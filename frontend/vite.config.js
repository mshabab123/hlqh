import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "fs";
import path from "path";

const BUILD_VERSION = Date.now().toString(36);

function versionPlugin() {
  return {
    name: "version-plugin",
    writeBundle({ dir }) {
      const outDir = dir || "dist";
      fs.writeFileSync(
        path.resolve(outDir, "version.json"),
        JSON.stringify({ version: BUILD_VERSION })
      );
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBase = env.VITE_API_BASE || "http://localhost:5000";

  return {
    plugins: [react(), tailwindcss(), versionPlugin()],
    define: {
      __APP_VERSION__: JSON.stringify(BUILD_VERSION),
    },
    server: {
      proxy: {
        "/api": {
          target: apiBase,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
