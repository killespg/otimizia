import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.otimizia.app",
  appName: "OtimizIA",
  webDir: "public",
  server: {
    url: "https://saas-red-beta.vercel.app",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
