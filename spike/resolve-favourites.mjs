// Build favourites.sample.json from Spotify sample tracks:
// Spotify ISRC -> Deezer /track/isrc: -> if that copy has no preview, fall back to a plain
// "artist title" search and take the first hit whose artist matches and that has a preview.
// Run: node resolve-favourites.mjs
import fs from 'node:fs';

const PICKS = [
  '2SLwbpExuoBDZBpjfefCtV', // Out of Time – The Weeknd
  '0UVvQQdoeJeH7aDcgh9dVL', // Dragonsong – Nobuo Uematsu
  '4KBegMBVyHsfC7fPOztTzV', // 情非得已 – Harlem Yu
  '7HKkudjI7pofH9oDqt3Y1T', // U – SUPER JUNIOR
  '6s8nHXTJVqFjXE4yVZPDHR', // Troublemaker – Olly Murs (ISRC copy has no preview: tests the fallback)
];

const read = (f) => JSON.parse(fs.readFileSync(new URL(`./samples/${f}.json`, import.meta.url))).data;
const tracks = new Map([...read('top-tracks'), ...read('recently-played')].map((t) => [t.id, t]));
const getJson = async (url) => (await fetch(url)).json();
const norm = (s) => s.toLowerCase().replace(/^the\s+/, '').replace(/[^\p{L}\p{N}]/gu, '');

async function resolve(t) {
  const byIsrc = await getJson(`https://api.deezer.com/track/isrc:${t.isrc}`);
  if (byIsrc.id && byIsrc.preview) return { deezerId: byIsrc.id, matchedBy: 'isrc' };

  const q = `${t.artists[0]} ${t.name.replace(/\s*\(feat\..*\)/i, '')}`;
  const search = await getJson(`https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=10`);
  const hit = (search.data || []).find((h) => h.preview && norm(h.artist.name) === norm(t.artists[0]));
  if (hit) return { deezerId: hit.id, matchedBy: 'search' };
  return { deezerId: byIsrc.id ?? null, matchedBy: byIsrc.id ? 'isrc-no-preview' : 'none' };
}

const favourites = [];
for (const id of PICKS) {
  const t = tracks.get(id);
  const r = await resolve(t);
  favourites.push({
    spotifyId: t.id, isrc: t.isrc, deezerId: r.deezerId, matchedBy: r.matchedBy,
    title: t.name, artist: t.artists.join(', '), climaxStart: 10,
  });
  console.log(`${t.name} – ${t.artists[0]}: ${r.matchedBy} -> ${r.deezerId}`);
}
fs.writeFileSync(new URL('./favourites.sample.json', import.meta.url), JSON.stringify(favourites, null, 2) + '\n');
