import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const rawBase = env.BASE_URL || "/";
  const base = rawBase.startsWith("http") ? new URL(rawBase).pathname : rawBase;
  return {
    plugins: [react()],
    base,
  };
});
