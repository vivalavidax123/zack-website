// Step 3: refresh an access token, call three Spotify endpoints, save trimmed samples (no tokens) to samples/.
// Run: node spotify-samples.mjs
import fs from 'node:fs';

const env = {};
for (const line of fs.readFileSync(new URL('./.env', import.meta.url), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2];
}

const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    Authorization: 'Basic ' + Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString('base64'),
  },
  body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: env.SPOTIFY_REFRESH_TOKEN }),
});
const tokens = await tokenRes.json();
if (!tokenRes.ok) {
  console.log('Refresh failed:', tokenRes.status, tokens.error, tokens.error_description);
  process.exit(1);
}
console.log('Refreshed access token; new refresh token returned:', Boolean(tokens.refresh_token));

const trimTrack = (t) => t && {
  id: t.id,
  name: t.name,
  artists: t.artists?.map((a) => a.name),
  album: t.album?.name,
  isrc: t.external_ids?.isrc ?? null,
  duration_ms: t.duration_ms,
  popularity: t.popularity,
  preview_url: t.preview_url ?? null,
};

const endpoints = {
  'top-tracks': ['/me/top/tracks?limit=10&time_range=short_term', (j) => j.items.map(trimTrack)],
  'recently-played': ['/me/player/recently-played?limit=10', (j) => j.items.map((i) => ({ played_at: i.played_at, ...trimTrack(i.track) }))],
  'currently-playing': ['/me/player/currently-playing', (j) => ({ is_playing: j.is_playing, progress_ms: j.progress_ms, type: j.currently_playing_type, track: trimTrack(j.item) })],
};

fs.mkdirSync(new URL('./samples/', import.meta.url), { recursive: true });
for (const [name, [path, trim]] of Object.entries(endpoints)) {
  const res = await fetch('https://api.spotify.com/v1' + path, { headers: { Authorization: `Bearer ${tokens.access_token}` } });
  const text = await res.text();
  let result;
  if (res.status === 204) result = { status: 204, note: 'Nothing playing' };
  else if (!res.ok) result = { status: res.status, error: text };
  else {
    const json = JSON.parse(text);
    result = { status: res.status, rawKeys: Object.keys(json), data: trim(json) };
  }
  fs.writeFileSync(new URL(`./samples/${name}.json`, import.meta.url), JSON.stringify(result, null, 2));
  console.log(`${name}: HTTP ${res.status}` + (res.ok ? '' : ` ${text}`));
}
