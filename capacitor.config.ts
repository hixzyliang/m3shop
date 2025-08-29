import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "io.m3shop.co",
  appName: "M3 Shop",
  webDir: "dist",
  plugins: {
    CapacitorAssets: {
      iosSource: "public/assets/logo.png",
      androidSource: "public/assets/logo.png",
    },
  },
};

export default config;
