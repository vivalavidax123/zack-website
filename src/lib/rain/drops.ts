import { between } from './random';

/**
 * Water on the glass, simulated on the CPU in CSS pixels.
 *
 * Big drops land, sit, and once heavy enough slide down, stalling and
 * speeding up as they go. A sliding drop swallows whatever it touches,
 * which wipes a clean path through the fine mist, and it leaves small
 * trail drops behind. Mist droplets never move; they only fill back in.
 */

type Drop = {
	x: number;
	y: number;
	r: number;
	vy: number;
	vx: number;
	/** Seconds until a sliding drop may stall or lurch again. */
	wobble: number;
	lastTrailY: number;
	mist: boolean;
	dead: boolean;
};

export type DropSettings = {
	rainAmount: number;
	dropSize: number;
	mist: number;
};

/** Floats per instance: x, y, radius, vertical stretch. */
export const INSTANCE_STRIDE = 4;

const MAX_DROPS = 5000;
const CELL = 32;
const REFERENCE_AREA = 1280 * 800;
const GRAVITY = 900;
const MAX_SPEED = 520;
const MAX_RADIUS = 18;

export class DropSim {
	private drops: Drop[] = [];
	private width = 1;
	private height = 1;
	private grid = new Map<number, Drop[]>();
	private rand: () => number;
	readonly instances = new Float32Array(MAX_DROPS * INSTANCE_STRIDE);

	constructor(rand: () => number = Math.random) {
		this.rand = rand;
	}

	get count(): number {
		return this.drops.length;
	}

	resize(width: number, height: number) {
		this.width = width;
		this.height = height;
		this.drops = this.drops.filter((d) => d.x < width + 20 && d.y < height + 20);
	}

	step(dt: number, s: DropSettings) {
		const area = (this.width * this.height) / REFERENCE_AREA;
		this.spawnRain(dt, s, area);
		this.fillMist(s, area);
		this.buildGrid();

		for (const d of this.drops) {
			if (d.dead || d.mist) continue;
			if (d.vy === 0) this.maybeStartSliding(d, dt, s);
			else this.slide(d, dt);
		}

		this.drops = this.drops.filter((d) => !d.dead && d.y - d.r < this.height);
	}

	/** Pack drops into `instances` for the renderer and return how many there are. */
	writeInstances(): number {
		const out = this.instances;
		let n = 0;
		for (const d of this.drops) {
			if (n >= MAX_DROPS) break;
			const i = n * INSTANCE_STRIDE;
			out[i] = d.x;
			out[i + 1] = d.y;
			out[i + 2] = d.r;
			// Sliding drops stretch a little, like a bead dragging its tail.
			out[i + 3] = 1 + Math.min(d.vy / MAX_SPEED, 1) * 0.35;
			n++;
		}
		return n;
	}

	private spawnRain(dt: number, s: DropSettings, area: number) {
		let expected = s.rainAmount * 70 * area * dt;
		while (expected > 0) {
			if (expected < 1 && this.rand() > expected) break;
			expected -= 1;
			if (this.drops.length >= MAX_DROPS) return;
			const r = (Math.pow(this.rand(), 2.5) * 10 + 2.6) * s.dropSize;
			const d = this.makeDrop(this.rand() * this.width, this.rand() * this.height * 0.95, r, false);
			// Landing on an existing drop grows it instead of overlapping it.
			const hit = this.firstOverlap(d);
			if (hit && !hit.mist) {
				hit.r = Math.min(MAX_RADIUS, Math.hypot(hit.r, d.r * 0.7));
			} else {
				if (hit) hit.dead = true;
				this.drops.push(d);
			}
		}
	}

	private fillMist(s: DropSettings, area: number) {
		const target = Math.min(MAX_DROPS * 0.6, s.mist * 1800 * area);
		let mistCount = 0;
		for (const d of this.drops) if (d.mist) mistCount++;
		const missing = Math.min(30, target - mistCount);
		for (let i = 0; i < missing; i++) {
			const r = Math.pow(this.rand(), 2) * 1.8 + 0.8;
			this.drops.push(this.makeDrop(this.rand() * this.width, this.rand() * this.height, r, true));
		}
	}

	private maybeStartSliding(d: Drop, dt: number, s: DropSettings) {
		const threshold = 5.2 * s.dropSize;
		if (d.r < threshold) return;
		// Heavier drops break free sooner.
		if (this.rand() < dt * (d.r - threshold) * 0.6) {
			d.vy = between(this.rand, 20, 60);
			d.lastTrailY = d.y;
		}
	}

	private slide(d: Drop, dt: number) {
		d.wobble -= dt;
		if (d.wobble <= 0) {
			d.wobble = between(this.rand, 0.08, 0.5);
			// Glass is never perfectly clean: stall sometimes, lurch sideways a bit.
			if (this.rand() < 0.25) d.vy *= 0.25;
			d.vx = between(this.rand, -1, 1) * d.r * 3;
		}
		d.vy = Math.min(MAX_SPEED, d.vy + GRAVITY * (d.r / 10) * dt);
		d.x += d.vx * dt;
		d.y += d.vy * dt;
		d.r = Math.max(1.5, d.r - dt * 0.6);

		const gap = d.r * between(this.rand, 1.6, 3.2);
		if (d.y - d.lastTrailY > gap && this.drops.length < MAX_DROPS) {
			d.lastTrailY = d.y;
			const tr = d.r * between(this.rand, 0.18, 0.38);
			this.drops.push(
				this.makeDrop(d.x + between(this.rand, -0.2, 0.2) * d.r, d.y - d.r * 1.3, tr, false)
			);
		}

		for (const other of this.neighbours(d)) {
			if (other === d || other.dead) continue;
			if (other.y > d.y + d.r && other.r > d.r * 0.5) continue;
			const reach = (d.r + other.r) * 0.85;
			const dx = other.x - d.x;
			const dy = other.y - d.y;
			if (dx * dx + dy * dy < reach * reach) {
				other.dead = true;
				// Mist adds a little water, a real drop adds a lot.
				d.r = Math.min(MAX_RADIUS, Math.hypot(d.r, other.r * (other.mist ? 0.5 : 0.85)));
			}
		}
	}

	private makeDrop(x: number, y: number, r: number, mist: boolean): Drop {
		return { x, y, r, vy: 0, vx: 0, wobble: 0, lastTrailY: y, mist, dead: false };
	}

	private key(cx: number, cy: number) {
		return cx * 100003 + cy;
	}

	private buildGrid() {
		this.grid.clear();
		for (const d of this.drops) {
			const k = this.key(Math.floor(d.x / CELL), Math.floor(d.y / CELL));
			let bucket = this.grid.get(k);
			if (!bucket) this.grid.set(k, (bucket = []));
			bucket.push(d);
		}
	}

	private *neighbours(d: Drop): Generator<Drop> {
		const cx = Math.floor(d.x / CELL);
		const cy = Math.floor(d.y / CELL);
		const span = Math.ceil(d.r / CELL);
		for (let x = cx - span; x <= cx + span; x++) {
			for (let y = cy - span; y <= cy + span; y++) {
				const bucket = this.grid.get(this.key(x, y));
				if (bucket) yield* bucket;
			}
		}
	}

	private firstOverlap(d: Drop): Drop | undefined {
		for (const other of this.drops) {
			const reach = d.r + other.r;
			if (Math.abs(other.x - d.x) < reach && Math.abs(other.y - d.y) < reach) {
				if (Math.hypot(other.x - d.x, other.y - d.y) < reach * 0.8) return other;
			}
		}
		return undefined;
	}
}
