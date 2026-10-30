import { paintBackground, type PaintedBackground } from './background';
import { defaultConfig, mergeConfig, type BackgroundSource, type RainConfig } from './config';
import { DropSim } from './drops';
import { FeatureDrops, type FeatureBox, type FeatureDrop } from './features';
import { GlassRenderer } from './renderer';

export type { BackgroundSource, RainConfig, SceneName } from './config';
export type { FeatureBox, FeatureDrop } from './features';
export { defaultConfig } from './config';

export type RainStats = {
	fps: number;
	/** Average milliseconds of JavaScript work per frame (simulation + draw calls). */
	frameMs: number;
	drops: number;
	webgl: boolean;
	reducedMotion: boolean;
};

export type RainController = {
	setConfig(patch: Partial<RainConfig>): void;
	/** Place large drops on the glass (homepage tabs). Ids keep their animation across calls. */
	setFeatureDrops(drops: FeatureDrop[]): void;
	/** Swell one feature drop, or none. */
	setHovered(id: string | null): void;
	/** Where the pointer is, in CSS pixels, so drifting drops can stop for it. */
	setPointer(point: { x: number; y: number } | null): void;
	/** The feature drop under a point, if any. */
	featureAt(x: number, y: number): string | null;
	/** Where a feature drop is right now. */
	featureBox(id: string): FeatureBox | null;
	/** Feature drops within `distance` of a point, nearest first. */
	featuresNear(x: number, y: number, distance: number): string[];
	onStats(listener: (stats: RainStats) => void): () => void;
	destroy(): void;
};

/** Seconds of simulated rain before the first frame, so the glass is never empty. */
const PREWARM_SECONDS = 8;
const MAX_STEP = 1 / 30;

/**
 * Mount rain-on-glass onto a canvas. The canvas is sized from its CSS box, so
 * give it a size in CSS (for example `position: fixed; inset: 0`).
 * Plain TypeScript with no framework imports: pages only mount it and pass config.
 */
export function createRain(
	canvas: HTMLCanvasElement,
	patch: Partial<RainConfig> = {}
): RainController {
	let config = mergeConfig(defaultConfig, patch);
	const renderer = safeCreate(canvas);
	const sim = new DropSim();
	const features = new FeatureDrops();
	const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
	const listeners = new Set<(stats: RainStats) => void>();

	let width = 0;
	let height = 0;
	let raf = 0;
	let running = false;
	let destroyed = false;
	let lastTime = 0;
	let elapsed = 0;
	let background: PaintedBackground | null = null;
	let backgroundKey = '';
	let paintToken = 0;

	let frames = 0;
	let workMs = 0;
	let statsSince = performance.now();

	const reducedMotion = () =>
		config.reducedMotion === 'auto' ? motionQuery.matches : config.reducedMotion;

	function measure() {
		const rect = canvas.getBoundingClientRect();
		const w = Math.max(1, Math.round(rect.width));
		const h = Math.max(1, Math.round(rect.height));
		if (w === width && h === height) return false;
		width = w;
		height = h;
		const ratio = Math.min(window.devicePixelRatio || 1, config.maxPixelRatio);
		if (renderer) renderer.resize(width, height, ratio);
		else {
			canvas.width = Math.round(width * ratio);
			canvas.height = Math.round(height * ratio);
		}
		sim.resize(width, height);
		features.setBounds(height);
		return true;
	}

	async function repaintBackground() {
		const token = ++paintToken;
		const key = backgroundId(config.background);
		try {
			const painted = await paintBackground(config.background, width, height);
			if (token !== paintToken || destroyed) return;
			background = painted;
			backgroundKey = key;
			if (renderer) renderer.setBackground(painted);
			drawOnce();
		} catch (err) {
			console.warn(err);
			if (config.background.kind === 'image') {
				config = { ...config, background: defaultConfig.background };
				repaintBackground();
			}
		}
	}

	function stepSim(dt: number) {
		features.step(dt);
		// Moving drops carry their clear patch of glass with them.
		if (features.moving) sim.setObstacles(features.list, false);
		sim.step(dt, config);
	}

	function draw() {
		if (renderer) {
			const still = reducedMotion();
			if (still) features.settle();
			const count = features.write(sim.instances, sim.writeInstances(), elapsed, still);
			renderer.render(sim.instances, count, {
				time: elapsed,
				refraction: config.refraction,
				streaks: reducedMotion() ? 0 : config.streaks,
				brightness: config.brightness,
				tint: config.tint
			});
		} else if (background) {
			// No WebGL: a still, blurred scene is still a calm background.
			const ctx = canvas.getContext('2d');
			ctx?.drawImage(background.fog, 0, 0, canvas.width, canvas.height);
		}
	}

	function drawOnce() {
		if (!background) return;
		draw();
	}

	function frame(now: number) {
		if (!running) return;
		raf = requestAnimationFrame(frame);
		const dt = Math.min(MAX_STEP, (now - lastTime) / 1000 || 0);
		lastTime = now;
		elapsed += dt;

		const start = performance.now();
		stepSim(dt);
		draw();
		workMs += performance.now() - start;
		frames++;
		reportStats(now);
	}

	function reportStats(now: number) {
		const span = now - statsSince;
		if (span < 500) return;
		const stats: RainStats = {
			fps: (frames * 1000) / span,
			frameMs: frames ? workMs / frames : 0,
			drops: sim.count,
			webgl: renderer !== null,
			reducedMotion: reducedMotion()
		};
		frames = 0;
		workMs = 0;
		statsSince = now;
		for (const l of listeners) l(stats);
	}

	function start() {
		if (running || destroyed || !renderer || reducedMotion() || document.hidden) return;
		running = true;
		lastTime = performance.now();
		statsSince = lastTime;
		frames = 0;
		workMs = 0;
		raf = requestAnimationFrame(frame);
	}

	function stop() {
		running = false;
		cancelAnimationFrame(raf);
	}

	function prewarm() {
		for (let t = 0; t < PREWARM_SECONDS; t += MAX_STEP) stepSim(MAX_STEP);
	}

	function idleStats(): RainStats {
		return {
			fps: 0,
			frameMs: 0,
			drops: sim.count,
			webgl: renderer !== null,
			reducedMotion: reducedMotion()
		};
	}

	/** Re-evaluate whether we should be animating (motion setting, tab visibility). */
	function sync() {
		if (reducedMotion() || document.hidden) {
			stop();
			drawOnce();
			for (const l of listeners) l(idleStats());
		} else start();
	}

	const resizeObserver = new ResizeObserver(() => {
		if (measure()) {
			repaintBackground();
			if (!running) drawOnce();
		}
	});
	resizeObserver.observe(canvas);
	document.addEventListener('visibilitychange', sync);
	motionQuery.addEventListener('change', sync);

	measure();
	prewarm();
	repaintBackground();
	sync();

	return {
		setConfig(next) {
			const before = config;
			config = mergeConfig(config, next);
			if (backgroundId(config.background) !== backgroundKey) repaintBackground();
			if (config.maxPixelRatio !== before.maxPixelRatio) {
				width = 0;
				measure();
			}
			if (config.reducedMotion !== before.reducedMotion) sync();
			if (!running) drawOnce();
		},
		setFeatureDrops(drops) {
			features.set(drops, reducedMotion());
			sim.setObstacles(drops);
			if (!running) drawOnce();
		},
		setHovered(id) {
			features.setHovered(id);
			if (!running) drawOnce();
		},
		setPointer(point) {
			if (point) features.setPointer(point.x, point.y);
			else features.setPointer(null);
		},
		featureAt: (x, y) => features.at(x, y),
		featureBox: (id) => features.box(id),
		featuresNear: (x, y, distance) => features.nearby(x, y, distance),
		onStats(listener) {
			listeners.add(listener);
			if (!running) listener(idleStats());
			return () => listeners.delete(listener);
		},
		destroy() {
			destroyed = true;
			stop();
			resizeObserver.disconnect();
			document.removeEventListener('visibilitychange', sync);
			motionQuery.removeEventListener('change', sync);
			listeners.clear();
			renderer?.destroy();
		}
	};
}

function backgroundId(bg: BackgroundSource): string {
	return bg.kind === 'image' ? `image:${bg.src}` : `scene:${bg.scene}`;
}

function safeCreate(canvas: HTMLCanvasElement): GlassRenderer | null {
	try {
		return GlassRenderer.create(canvas);
	} catch (err) {
		console.warn('Rain falls back to a still background:', err);
		return null;
	}
}
