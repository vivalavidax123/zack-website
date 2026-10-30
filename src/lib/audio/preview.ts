/**
 * Plays 30-second Deezer previews with a soft fade in and out.
 * Plain TypeScript, no Svelte: the songs page tells it what to play, and it
 * reports back through `onchange`.
 *
 * One <audio> element per song keeps things simple: switching songs fades
 * one out while the next fades in. iOS ignores `audio.volume`, so there the
 * fade is skipped and songs simply start and stop.
 */

export type PreviewState = {
	id: string | null;
	status: 'idle' | 'loading' | 'playing' | 'blocked';
};

const FADE_MS = 400;
/** Deezer links last about 15 minutes; refetch after 10 to be safe. */
const URL_FRESH_MS = 10 * 60 * 1000;
/** Keep a few elements around so returning to a song is instant. */
const MAX_ELEMENTS = 6;

type Entry = { audio: HTMLAudioElement; fade: number; at: number };

export class PreviewPlayer {
	private urls = new Map<
		number,
		{ url: string | null; at: number; pending?: Promise<string | null> }
	>();
	private elements = new Map<string, Entry>();
	private current: string | null = null;
	private wanted: string | null = null;
	state: PreviewState = { id: null, status: 'idle' };

	constructor(private onchange: (state: PreviewState) => void = () => {}) {}

	/** Fetch the link ahead of time, so hovering starts sound faster. */
	warm(deezerId: number | null) {
		if (deezerId) void this.url(deezerId);
	}

	async play(id: string, deezerId: number | null, startAt: number) {
		this.wanted = id;
		if (this.current && this.current !== id) this.fadeOut(this.current);
		if (!deezerId) return this.set(null, 'idle');

		this.set(id, 'loading');
		const url = await this.url(deezerId);
		// The pointer may have moved on while we waited.
		if (this.wanted !== id) return;
		if (!url) return this.set(null, 'idle');

		const entry = this.element(id, url);
		const audio = entry.audio;
		if (audio.paused) {
			// A preview is 30 seconds; start inside it.
			const start = Math.min(Math.max(0, startAt), 25);
			if (audio.readyState >= 1) audio.currentTime = start;
			else
				audio.addEventListener('loadedmetadata', () => (audio.currentTime = start), { once: true });
			if (volumeWorks()) audio.volume = 0;
		}
		this.current = id;
		try {
			await audio.play();
		} catch {
			// Browsers block sound until the visitor has clicked or tapped once.
			if (this.wanted === id) this.set(id, 'blocked');
			return;
		}
		if (this.wanted !== id) return;
		this.fadeTo(entry, 1);
		this.set(id, 'playing');
	}

	stop() {
		this.wanted = null;
		if (this.current) this.fadeOut(this.current);
		this.set(null, 'idle');
	}

	destroy() {
		for (const { audio, fade } of this.elements.values()) {
			cancelAnimationFrame(fade);
			audio.pause();
			audio.removeAttribute('src');
		}
		this.elements.clear();
	}

	private set(id: string | null, status: PreviewState['status']) {
		this.state = { id, status };
		this.onchange(this.state);
	}

	private async url(deezerId: number): Promise<string | null> {
		const cached = this.urls.get(deezerId);
		if (cached?.pending) return cached.pending;
		if (cached && Date.now() - cached.at < URL_FRESH_MS) return cached.url;

		const pending = fetch(`/api/preview/${deezerId}`)
			.then((r) => (r.ok ? (r.json() as Promise<{ url: string | null }>) : { url: null }))
			.then((b) => b.url)
			.catch(() => null);
		this.urls.set(deezerId, { url: null, at: 0, pending });
		const url = await pending;
		this.urls.set(deezerId, { url, at: Date.now() });
		return url;
	}

	private element(id: string, url: string): Entry {
		let entry = this.elements.get(id);
		if (entry && entry.audio.src !== url && entry.audio.paused) {
			entry.audio.src = url;
		}
		if (!entry) {
			const audio = new Audio();
			audio.preload = 'auto';
			audio.src = url;
			audio.addEventListener('ended', () => {
				if (this.current === id) {
					this.current = null;
					this.set(null, 'idle');
				}
			});
			entry = { audio, fade: 0, at: 0 };
			this.elements.set(id, entry);
			this.trim();
		}
		entry.at = performance.now();
		return entry;
	}

	/** Forget the least recently used, silent elements. */
	private trim() {
		const quiet = [...this.elements.entries()]
			.filter(([id, e]) => id !== this.current && e.audio.paused)
			.sort((a, b) => a[1].at - b[1].at);
		while (this.elements.size > MAX_ELEMENTS && quiet.length) {
			const [id, e] = quiet.shift()!;
			e.audio.removeAttribute('src');
			this.elements.delete(id);
		}
	}

	private fadeOut(id: string) {
		const entry = this.elements.get(id);
		if (this.current === id) this.current = null;
		if (entry) this.fadeTo(entry, 0, () => entry.audio.pause());
	}

	private fadeTo(entry: Entry, target: number, done?: () => void) {
		cancelAnimationFrame(entry.fade);
		const audio = entry.audio;
		if (!volumeWorks()) {
			done?.();
			return;
		}
		const from = audio.volume;
		const start = performance.now();
		const tick = (now: number) => {
			const t = Math.min(1, (now - start) / FADE_MS);
			audio.volume = Math.min(1, Math.max(0, from + (target - from) * t));
			if (t < 1) entry.fade = requestAnimationFrame(tick);
			else done?.();
		};
		entry.fade = requestAnimationFrame(tick);
	}
}

let canFade: boolean | undefined;
/** iOS keeps volume at 1 whatever you set, so fades there are skipped. */
function volumeWorks(): boolean {
	if (canFade === undefined) {
		const probe = new Audio();
		probe.volume = 0.5;
		canFade = probe.volume === 0.5;
	}
	return canFade;
}
