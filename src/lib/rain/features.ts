import { INSTANCE_STRIDE, RESERVED_INSTANCES } from './drops';

/**
 * Large drops that pages place on the glass, such as the homepage tabs.
 * Unlike rain they never slide or evaporate. They condense into view,
 * breathe very slightly, and swell when hovered.
 */
export type FeatureDrop = {
	id: string;
	/** Centre in CSS pixels from the top-left of the canvas. */
	x: number;
	y: number;
	/** Radius in CSS pixels. */
	r: number;
};

type LiveFeature = FeatureDrop & {
	/** 0 → 1 as the drop condenses onto the glass. */
	appear: number;
	delay: number;
	scale: number;
	phase: number;
};

export const MAX_FEATURES = RESERVED_INSTANCES;

const APPEAR_SECONDS = 1.4;
const STAGGER_SECONDS = 0.18;
const HOVER_SCALE = 1.08;

export class FeatureDrops {
	private items: LiveFeature[] = [];
	private hovered: string | null = null;

	get list(): readonly FeatureDrop[] {
		return this.items;
	}

	/** Replace the set of drops. Drops that keep their id keep their animation state. */
	set(next: FeatureDrop[], instant: boolean) {
		const previous = new Map(this.items.map((f) => [f.id, f]));
		this.items = next.slice(0, MAX_FEATURES).map((f, i) => {
			const old = previous.get(f.id);
			if (old) return { ...old, x: f.x, y: f.y, r: f.r };
			return {
				...f,
				appear: instant ? 1 : 0,
				delay: instant ? 0 : i * STAGGER_SECONDS,
				scale: 1,
				phase: i * 1.7
			};
		});
	}

	setHovered(id: string | null) {
		this.hovered = id;
	}

	step(dt: number) {
		for (const f of this.items) {
			if (f.delay > 0) f.delay -= dt;
			else f.appear = Math.min(1, f.appear + dt / APPEAR_SECONDS);
			const target = f.id === this.hovered ? HOVER_SCALE : 1;
			// Ease toward the target size; framerate independent.
			f.scale += (target - f.scale) * (1 - Math.exp(-dt * 10));
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
			out[i + 3] = 1.04;
			n++;
		}
		return n;
	}
}
