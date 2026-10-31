/**
 * A soft loop of rain behind the whole site. Off until the visitor turns it
 * on, and remembered for their next visit.
 *
 * It plays through Web Audio rather than an <audio> element for two reasons:
 * a looping buffer has no gap at the seam, and a gain node can fade and duck
 * on every browser, iOS included (iOS ignores `audio.volume`).
 */

const SRC = '/sounds/rain.mp3';
/** Rain sits under everything; previews play at 0.4, so this stays well below. */
const VOLUME = 0.25;
/** How far down the rain goes while a song preview plays. */
const DUCKED = 0.06;
const FADE_S = 0.8;
/** Skip a sliver at each end: MP3 files carry a little silence there. */
const TRIM_S = 0.05;
const STORE_KEY = 'rain-sound';

class RainSound {
	private ctx: AudioContext | null = null;
	private gain: GainNode | null = null;
	private source: AudioBufferSourceNode | null = null;
	private loading: Promise<AudioBuffer | null> | null = null;
	private ducked = false;
	on = false;

	/** Whether the visitor left it on last time. Browsers still need a click before it can play. */
	wanted(): boolean {
		try {
			return localStorage.getItem(STORE_KEY) === 'on';
		} catch {
			return false;
		}
	}

	async start() {
		this.on = true;
		this.remember();
		const ctx = (this.ctx ??= new AudioContext());
		if (ctx.state === 'suspended') await ctx.resume();
		if (!this.gain) {
			this.gain = ctx.createGain();
			this.gain.gain.value = 0;
			this.gain.connect(ctx.destination);
		}
		const buffer = await this.buffer(ctx);
		// The visitor may have turned it off again while the file loaded.
		if (!buffer || !this.on) return;
		if (!this.source) {
			const source = ctx.createBufferSource();
			source.buffer = buffer;
			source.loop = true;
			source.loopStart = TRIM_S;
			source.loopEnd = Math.max(TRIM_S * 2, buffer.duration - TRIM_S);
			source.connect(this.gain);
			source.start(0, TRIM_S);
			this.source = source;
		}
		this.fade(this.level());
	}

	stop() {
		this.on = false;
		this.remember();
		const source = this.source;
		this.source = null;
		if (!source || !this.ctx) return;
		this.fade(0);
		source.stop(this.ctx.currentTime + FADE_S);
	}

	/** Quieter while a song preview plays, so the song is what you hear. */
	duck(ducked: boolean) {
		if (this.ducked === ducked) return;
		this.ducked = ducked;
		if (this.source) this.fade(this.level());
	}

	private level() {
		return this.ducked ? DUCKED : VOLUME;
	}

	private fade(to: number) {
		if (!this.ctx || !this.gain) return;
		const now = this.ctx.currentTime;
		const gain = this.gain.gain;
		gain.cancelScheduledValues(now);
		gain.setValueAtTime(gain.value, now);
		gain.linearRampToValueAtTime(to, now + FADE_S);
	}

	private buffer(ctx: AudioContext): Promise<AudioBuffer | null> {
		this.loading ??= fetch(SRC)
			.then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status}`))))
			.then((data) => ctx.decodeAudioData(data))
			.catch((err) => {
				console.warn('Rain sound failed to load:', err);
				this.loading = null;
				return null;
			});
		return this.loading;
	}

	private remember() {
		try {
			localStorage.setItem(STORE_KEY, this.on ? 'on' : 'off');
		} catch {
			// Private windows can refuse storage; the toggle still works for this visit.
		}
	}
}

/** One rain sound for the whole site, shared by the toggle and the songs page. */
export const rainSound = new RainSound();
