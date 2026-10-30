import { INSTANCE_STRIDE, RESERVED_INSTANCES } from './drops';

/**
 * Large drops that pages place on the glass, such as the homepage tabs and
 * the songs. Unlike rain they never evaporate or merge. They condense into
 * view, breathe very slightly, and swell when hovered. A drop with `drift`
 * creeps down the glass, pauses when the pointer comes near, and wraps back
 * to the top when it leaves the bottom.
 */
export type FeatureDrop = {
	id: string;
	/** Centre in CSS pixels from the top-left of the canvas. */
	x: number;
	y: number;
	/** Radius in CSS pixels. */
	r: number;
	/** Downward speed in CSS pixels per second. Omit for a drop that stays put. */
	drift?: number;
};

export type FeatureBox = { id: string; x: number; y: number; r: number };

type LiveFeature = FeatureDrop & {
	/** 0 → 1 as the drop condenses onto the glass. */
	appear: number;
	delay: number;
	scale: number;
	phase: number;
	speed: number;
};

export const MAX_FEATURES = RESERVED_INSTANCES;

const APPEAR_SECONDS = 1.4;
const STAGGER_SECONDS = 0.18;
const MAX_STAGGER_SECONDS = 1.2;
const HOVER_SCALE = 1.08;
/** How far beyond its edge a drop notices the pointer and stops, in CSS pixels. */
const PAUSE_DISTANCE = 120;

export class FeatureDrops {
	private items: LiveFeature[] = [];
	private hovered: string | null = null;
	private pointer: { x: number; y: number } | null = null;
	private height = 1;

	get list(): readonly FeatureDrop[] {
		return this.items;
	}

	get moving(): boolean {
		return this.items.some((f) => f.drift);
	}

	setBounds(height: number) {
		this.height = height;
	}

	/**
	 * Replace the set of drops. Drops that keep their id keep their animation
	 * state, and a drifting drop also keeps its place on the glass.
	 */
	set(next: FeatureDrop[], instant: boolean) {
		const previous = new Map(this.items.map((f) => [f.id, f]));
		this.items = next.slice(0, MAX_FEATURES).map((f, i) => {
			const old = previous.get(f.id);
			if (old) return { ...old, x: f.x, y: f.drift ? old.y : f.y, r: f.r, drift: f.drift };
			return {
				...f,
				appear: instant ? 1 : 0,
				delay: instant ? 0 : Math.min(MAX_STAGGER_SECONDS, i * STAGGER_SECONDS),
				scale: 1,
				phase: i * 1.7,
				speed: f.drift ?? 0
			};
		});
	}

	setHovered(id: string | null) {
		this.hovered = id;
	}

	setPointer(x: number, y: number): void;
	setPointer(none: null): void;
	setPointer(x: number | null, y?: number) {
		this.pointer = x === null ? null : { x, y: y ?? 0 };
	}

	step(dt: number) {
		for (const f of this.items) {
			if (f.delay > 0) f.delay -= dt;
			else f.appear = Math.min(1, f.appear + dt / APPEAR_SECONDS);
			const target = f.id === this.hovered ? HOVER_SCALE : 1;
			// Ease toward the target size; framerate independent.
			f.scale += (target - f.scale) * (1 - Math.exp(-dt * 10));

			if (!f.drift) continue;
			// Stop for the pointer so nobody has to chase a moving target. A hovered
			// drop stops at once, so it can't glide out from under the cursor.
			if (f.id === this.hovered) f.speed = 0;
			const wanted = this.near(f) ? 0 : f.drift;
			f.speed += (wanted - f.speed) * (1 - Math.exp(-dt * 6));
			f.y += f.speed * dt;
			if (f.y - f.r > this.height) f.y = -f.r;
		}
	}

	/** Jump straight to the resting state, for reduced motion. */
	settle() {
		for (const f of this.items) {
			f.delay = 0;
			f.appear = 1;
			f.scale = f.id === this.hovered ? HOVER_SCALE : 1;
		}
	}

	/** The drop under a point, if any. Uses the drawn size, so a swollen drop is easier to hit. */
	at(x: number, y: number): string | null {
		// Keep the hovered drop while the pointer is still on it, even if a
		// drifting neighbour slides over it.
		const hovered = this.items.find((f) => f.id === this.hovered);
		if (hovered && this.contains(hovered, x, y)) return hovered.id;
		for (let i = this.items.length - 1; i >= 0; i--) {
			const f = this.items[i];
			if (f.appear < 0.5) continue;
			if (this.contains(f, x, y)) return f.id;
		}
		return null;
	}

	box(id: string): FeatureBox | null {
		const f = this.items.find((item) => item.id === id);
		return f ? { id: f.id, x: f.x, y: f.y, r: f.r * f.scale } : null;
	}

	/** Ids of drops whose edge is within `distance` of a point, nearest first. */
	nearby(x: number, y: number, distance: number): string[] {
		return this.items
			.map((f) => ({ id: f.id, gap: Math.hypot(f.x - x, f.y - y) - f.r }))
			.filter((d) => d.gap <= distance)
			.sort((a, b) => a.gap - b.gap)
			.map((d) => d.id);
	}

	/** Append to the renderer's instance buffer after the rain, so these draw on top. */
	write(out: Float32Array, start: number, time: number, still: boolean): number {
		let n = start;
		for (const f of this.items) {
			if (f.appear <= 0) continue;
			const i = n * INSTANCE_STRIDE;
			// Ease-out so the drop gathers quickly and settles gently.
			const grow = 1 - Math.pow(1 - f.appear, 3);
			const breathe = still ? 1 : 1 + Math.sin(time * 0.9 + f.phase) * 0.012;
			out[i] = f.x;
			out[i + 1] = f.y;
			out[i + 2] = f.r * grow * f.scale * breathe;
			// A drifting drop is a little longer, like a bead about to run.
			out[i + 3] = f.drift ? 1.1 : 1.04;
			n++;
		}
		return n;
	}

	private contains(f: LiveFeature, x: number, y: number): boolean {
		const r = f.r * f.scale;
		return (f.x - x) ** 2 + (f.y - y) ** 2 <= r * r;
	}

	private near(f: LiveFeature): boolean {
		if (!this.pointer) return false;
		const reach = f.r + PAUSE_DISTANCE;
		return (f.x - this.pointer.x) ** 2 + (f.y - this.pointer.y) ** 2 < reach * reach;
	}
}
