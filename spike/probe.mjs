// Spike probe: Deezer matching (search vs ISRC) and preview URL inspection.
// Run: node probe.mjs > probe-output.json
const API = 'https://api.deezer.com';

const songs = [
  { artist: 'Radiohead', track: 'Creep' },
  { artist: 'Fleetwood Mac', track: 'Dreams' },
  { artist: 'Queen', track: 'Bohemian Rhapsody' },
  { artist: 'Nirvana', track: 'Smells Like Teen Spirit' },
  { artist: 'Grouper', track: 'Heavy Water/I\'d Rather Be Sleeping' },
];

const getJson = async (url) => (await fetch(url)).json();

function previewInfo(url) {
  const u = new URL(url);
  const hdnea = u.searchParams.get('hdnea') || '';
  const exp = Number((hdnea.match(/exp=(\d+)/) || [])[1]);
  return {
    host: u.host,
    params: [...u.searchParams.keys()],
    exp: exp ? new Date(exp * 1000).toISOString() : null,
    lifetimeSec: exp ? exp - Math.floor(Date.now() / 1000) : null,
  };
}

const out = [];
for (const s of songs) {
  const q = `artist:"${s.artist}" track:"${s.track}"`;
  const advanced = await getJson(`${API}/search?q=${encodeURIComponent(q)}&limit=5`);
  const q2 = `${s.artist} track:"${s.track}"`;
  const search = await getJson(`${API}/search?q=${encodeURIComponent(q2)}&limit=5`);
  const plain = await getJson(`${API}/search?q=${encodeURIComponent(s.artist + ' ' + s.track)}&limit=5`);
  const hits = [];
  for (const h of search.data || []) {
    const t = await getJson(`${API}/track/${h.id}`);
    hits.push({ id: h.id, artist: h.artist?.name, title: h.title, version: h.title_version, album: h.album?.title, isrc: t.isrc, rank: h.rank, duration: h.duration });
  }
  let roundTrip = null;
  if (hits[0]?.isrc) {
    const r = await getJson(`${API}/track/isrc:${hits[0].isrc}`);
    roundTrip = { id: r.id, title: r.title, album: r.album?.title, sameId: r.id === hits[0].id };
  }
  out.push({
    advancedQuery: q,
    advancedTotal: advanced.total,
    query: q2,
    total: search.total,
    hits,
    plainSearchTop: (plain.data || []).slice(0, 3).map((h) => `${h.id} ${h.title} — ${h.artist?.name} [${h.album?.title}]`),
    roundTrip,
  });
}

// Preview URL freshness: fetch the same track twice, a few seconds apart.
const firstId = out[0].hits[0]?.id;
const a = await getJson(`${API}/track/${firstId}`);
await new Promise((r) => setTimeout(r, 3000));
const b = await getJson(`${API}/track/${firstId}`);
const preview = {
  url1: a.preview, info1: previewInfo(a.preview),
  url2: b.preview, info2: previewInfo(b.preview),
  sameUrl: a.preview === b.preview,
};

console.log(JSON.stringify({ when: new Date().toISOString(), out, preview }, null, 2));
