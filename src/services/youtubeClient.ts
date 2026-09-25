import { Innertube } from 'youtubei.js';

let youtubeInstance: Innertube | null = null;

export const getYouTubeClient = async (oauthToken?: string) => {
  if (!youtubeInstance) {
    youtubeInstance = await Innertube.create({
      retrieve_player: false,
    });
    // Set US region and English language by default to prevent regional IP noise
    if (youtubeInstance.session?.context?.client) {
      youtubeInstance.session.context.client.gl = 'US';
      youtubeInstance.session.context.client.hl = 'en';
    }
  }
  
  // Inject OAuth / Access Token if logged in
  if (oauthToken) {
    (youtubeInstance.session.oauth as any).accessToken = oauthToken;
    try {
      youtubeInstance.session.oauth.setTokens({
        access_token: oauthToken,
        refresh_token: '',
        expiry_date: new Date(Date.now() + 3600 * 1000).toISOString(),
      });
    } catch {}
  }

  return youtubeInstance;
};
