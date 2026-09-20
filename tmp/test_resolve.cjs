const play = require('play-dl');

(async () => {
  await play.setToken({ soundcloud: { client_id: 'Pb72ranhoyt6gw7hM7TkzUItXlMWSNSo' } });
  
  async function resolveAudio(title, artist) {
    const cleanT = (title || '')
      .replace(/\b(official\s+(music\s+)?video|official\s+audio|lyrics?|lyric\s+video|4k|hd|remastered?)\b/gi, '')
      .replace(/[\(\[\{][^\)\]\}]*[\)\]\}]/g, ' ')
      .trim();
    const queries = [
      (cleanT + ' ' + (artist || '')).trim(),
      cleanT,
      ((artist || '') + ' ' + cleanT).trim()
    ];
    for (const q of queries) {
      if (!q) continue;
      const res = await play.search(q, { source: { soundcloud: 'tracks' }, limit: 5 });
      for (const t of (res || [])) {
        try {
          const info = await play.soundcloud(t.url);
          if (!info.durationInSec || info.durationInSec > 45) {
            const prog = info.formats?.find(f => f.format?.protocol === 'progressive' && !f.snipped);
            if (prog) {
              const meta = await fetch(prog.url + '?client_id=Pb72ranhoyt6gw7hM7TkzUItXlMWSNSo').then(r => r.json());
              if (meta.url) return { name: info.name, url: meta.url, duration: info.durationInSec };
            }
          }
        } catch {}
      }
    }
    return null;
  }

  const tracks = [
    ['Bohemian Rhapsody (Official Video Remastered)', 'Queen'],
    ['Billie Jean', 'Michael Jackson'],
    ['In The End (Official HD Video)', 'Linkin Park'],
    ['Lose Yourself (From 8 Mile Soundtrack)', 'Eminem'],
    ['Hotel California (2013 Remaster)', 'Eagles']
  ];

  for (const [t, a] of tracks) {
    const r = await resolveAudio(t, a);
    console.log(t, '->', !!r, r?.duration, 'sec');
  }
})().catch(console.error);
