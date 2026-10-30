// Spike server on http://127.0.0.1:5173
//   /                    -> deezer-test.html
//   /api/preview/:id     -> fresh Deezer preview URL (Deezer's API sends no CORS headers)
//   /login, /callback    -> Spotify Authorization Code flow; writes SPOTIFY_REFRESH_TOKEN into .env
// Secrets and tokens are only read from / written to .env, never logged.
import http from 'node:http';
import fs from 'node:fs';
import crypto from 'node:crypto';

const PORT = 5173;
const HOST = '127.0.0.1';
const ENV_PATH = new URL('./.env', import.meta.url);
const REDIRECT_URI = `http://${HOST}:${PORT}/callback`;
const SCOPES = 'user-read-currently-playing user-read-recently-played user-top-read';

function readEnv() {
  const env = {};
  for (const line of fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

function setEnvValue(key, value) {
  let text = fs.readFileSync(ENV_PATH, 'utf8');
  const re = new RegExp(`^${key}=.*$`, 'm');
  text = re.test(text) ? text.replace(re, `${key}=${value}`) : text.replace(/\n?$/, `\n${key}=${value}\n`);
  fs.writeFileSync(ENV_PATH, text);
}

let pendingState = null;
let accessToken = null; // { value, expiresAt } – kept in memory only

async function spotifyAccessToken() {
  if (accessToken && Date.now() < accessToken.expiresAt) return accessToken.value;
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN } = readEnv();
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: SPOTIFY_REFRESH_TOKEN }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`Spotify refresh failed: ${res.status} ${j.error}`);
  accessToken = { value: j.access_token, expiresAt: Date.now() + (j.expires_in - 60) * 1000 };
  return accessToken.value;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  try {
    if (url.pathname === '/' || url.pathname === '/deezer-test.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(fs.readFileSync(new URL('./deezer-test.html', import.meta.url)));
    }

    if (url.pathname === '/songs') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(fs.readFileSync(new URL('./songs-test.html', import.meta.url)));
    }

    if (url.pathname === '/favourites.json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(fs.readFileSync(new URL('./favourites.sample.json', import.meta.url)));
    }

    if (url.pathname === '/api/now-playing') {
      const spotify = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { Authorization: `Bearer ${await spotifyAccessToken()}` },
      });
      // 204 = nothing playing (no body)
      let body = { is_playing: false };
      if (spotify.status === 200) {
        const j = await spotify.json();
        body = { is_playing: j.is_playing, title: j.item?.name, artist: j.item?.artists?.map((a) => a.name).join(', '), isrc: j.item?.external_ids?.isrc };
      } else if (spotify.status !== 204) {
        body = { is_playing: false, error: spotify.status };
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(body));
    }

    const preview = url.pathname.match(/^\/api\/preview\/(\d+)$/);
    if (preview) {
      const track = await (await fetch(`https://api.deezer.com/track/${preview[1]}`)).json();
      res.writeHead(track.preview ? 200 : 404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ id: track.id, title: track.title, preview: track.preview || null }));
    }

    if (url.pathname === '/login') {
      const { SPOTIFY_CLIENT_ID } = readEnv();
      pendingState = crypto.randomBytes(16).toString('hex');
      const auth = new URL('https://accounts.spotify.com/authorize');
      auth.search = new URLSearchParams({
        response_type: 'code', client_id: SPOTIFY_CLIENT_ID, scope: SCOPES,
        redirect_uri: REDIRECT_URI, state: pendingState,
      });
      res.writeHead(302, { Location: auth.toString() });
      return res.end();
    }

    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');
      if (url.searchParams.get('error') || !code || url.searchParams.get('state') !== pendingState) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        return res.end(`Login failed: ${url.searchParams.get('error') || 'missing code or state mismatch'}`);
      }
      pendingState = null;
      const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = readEnv();
      const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
        },
        body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI }),
      });
      const tokens = await tokenRes.json();
      if (!tokenRes.ok || !tokens.refresh_token) {
        console.log('Token exchange failed:', tokenRes.status, tokens.error, tokens.error_description);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        return res.end(`Token exchange failed (${tokenRes.status}): ${tokens.error || ''} ${tokens.error_description || ''}`);
      }
      setEnvValue('SPOTIFY_REFRESH_TOKEN', tokens.refresh_token);
      console.log('Saved SPOTIFY_REFRESH_TOKEN to .env (scopes granted:', tokens.scope + ')');
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      return res.end('Spotify connected. Refresh token saved to .env. You can close this tab.');
    }

    res.writeHead(404);
    res.end('Not found');
  } catch (err) {
    console.log('Error on', url.pathname, err.message);
    res.writeHead(500);
    res.end('Server error');
  }
});

server.listen(PORT, HOST, () => console.log(`Spike server on http://${HOST}:${PORT}`));
