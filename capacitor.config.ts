export default {
  appId: 'com.oblivion.music',
  appName: 'Oblivion Music',
  webDir: 'dist',
  server: {
    url: 'https://oblivion-rho.vercel.app',
    cleartext: true,
    androidScheme: 'https',
    allowNavigation: [
      'oblivion-rho.vercel.app',
      '*.google.com',
      '*.googleapis.com',
      'accounts.google.com'
    ]
  },
  android: {
    allowMixedContent: true,
    overrideUserAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
  },
};
