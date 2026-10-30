import { defineEnvVars } from '@sveltejs/kit/env';

const optional = (value: string | undefined) => value || undefined;

/**
 * Every environment variable the site reads, in one place. None are public:
 * they are only importable from `$app/env/private`, which never reaches the browser.
 * All are optional so the site still builds and runs without Spotify set up.
 */
export const variables = defineEnvVars({
	SPOTIFY_CLIENT_ID: { schema: optional, description: 'Spotify app client ID' },
	SPOTIFY_CLIENT_SECRET: { schema: optional, description: 'Spotify app client secret' },
	SPOTIFY_REFRESH_TOKEN: {
		schema: optional,
		description: 'Long-lived Spotify refresh token, created once by spike/server.mjs /login'
	}
});
