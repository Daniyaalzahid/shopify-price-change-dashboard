import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/auth-browser",
  workers: 1,
  use: { baseURL: "http://127.0.0.1:3000", browserName: "chromium" },
  webServer: {
    command: "npm start -- --hostname 127.0.0.1",
    url: "http://127.0.0.1:3000/login",
    reuseExistingServer: false,
    env: { APP_MODE: "auth", APP_ORIGIN: "http://127.0.0.1:3000" },
  },
});
