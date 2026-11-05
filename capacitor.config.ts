import { defineConfig } from 'capacitor-cli';

export default defineConfig({
  appId: 'com.oblivion.music',
  appName: 'Oblivion Music',
  webDir: 'dist',
  server: {
    url: 'https://oblivion-rho.vercel.app',
    cleartext: true,
  },
});
