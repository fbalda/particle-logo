import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";

const LIB_PATH = "./src/lib";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: [
      {
        find: "@lib",
        replacement: resolve(__dirname, LIB_PATH),
      },
      {
        find: "@assets",
        replacement: resolve(__dirname, LIB_PATH + "/assets"),
      },
      {
        find: "@shaders",
        replacement: resolve(__dirname, LIB_PATH + "/assets/shaders"),
      },
    ],
  },
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  base: process.env.BASE_URL ?? "/",
});
