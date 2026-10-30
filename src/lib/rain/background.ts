import type { BackgroundSource, SceneName } from './config';
import { between, seeded } from './random';

/**
 * Two versions of the scene behind the glass:
 * - `sharp` is what a drop shows when it acts as a lens,
 * - `fog` is the heavily blurred view through misted glass.
 */
export type PaintedBackground = { sharp: HTMLCanvasElement; fog: HTMLCanvasElement };

const SHARP_SCALE = 0.5;
const FOG_SCALE = 0.125;

export async function paintBackground(
	source: BackgroundSource,
	width: number,
	height: number
): Promise<PaintedBackground> {
	const base = makeCanvas(
		Math.max(1, Math.round(width * SHARP_SCALE)),
		Math.max(1, Math.round(height * SHARP_SCALE))
	);
	const ctx = base.getContext('2d')!;

	if (source.kind === 'image') {
		const img = await loadImage(source.src);
		drawCover(ctx, img, base.width, base.height);
	} else {
		paintScene(ctx, source.scene, base.width, base.height);
	}

	const sharp = blurred(base, 1, 1.5);
	const fog = blurred(base, FOG_SCALE / SHARP_SCALE, 3);
	return { sharp, fog };
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
	const c = document.createElement('canvas');
	c.width = w;
	c.height = h;
	return c;
}

/** Downscale then blur. Downscaling alone already softens, the filter smooths the rest. */
function blurred(src: HTMLCanvasElement, scale: number, radius: number): HTMLCanvasElement {
	const out = makeCanvas(
		Math.max(1, Math.round(src.width * scale)),
		Math.max(1, Math.round(src.height * scale))
	);
	const ctx = out.getContext('2d')!;
	ctx.filter = `blur(${radius}px)`;
	// Draw slightly oversized so the blur does not pull dark edges in from outside the canvas.
	const pad = radius * 3;
	ctx.drawImage(src, -pad, -pad, out.width + pad * 2, out.height + pad * 2);
	ctx.filter = 'none';
	return out;
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error(`Could not load background image ${src}`));
		img.src = src;
	});
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
	const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
	const dw = img.naturalWidth * scale;
	const dh = img.naturalHeight * scale;
	ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function paintScene(ctx: CanvasRenderingContext2D, scene: SceneName, w: number, h: number) {
	if (scene === 'city-night') paintCityNight(ctx, w, h);
	else paintDuskForest(ctx, w, h);
}

/** Pale light through a misty clearing, framed by dark trunks. Muted greens and grey-blue. */
function paintDuskForest(ctx: CanvasRenderingContext2D, w: number, h: number) {
	const rand = seeded(7);
	const unit = Math.max(w, h);

	const sky = ctx.createLinearGradient(0, 0, 0, h);
	sky.addColorStop(0, '#3e5357');
	sky.addColorStop(0.35, '#7d9496');
	sky.addColorStop(0.7, '#2a3b3c');
	sky.addColorStop(1, '#0d1716');
	ctx.fillStyle = sky;
	ctx.fillRect(0, 0, w, h);

	glow(ctx, w * 0.55, h * 0.22, unit * 0.42, 'rgba(214, 228, 226, 0.75)');
	glow(ctx, w * 0.5, h * 0.45, unit * 0.3, 'rgba(160, 186, 182, 0.35)');

	// Distant trees, washed out by mist.
	for (let i = 0; i < 26; i++) {
		const x = between(rand, -0.05, 1.05) * w;
		const tw = between(rand, 0.01, 0.025) * unit;
		const alpha = between(rand, 0.18, 0.35);
		tree(ctx, x, h * between(rand, 0.05, 0.25), tw, h, `rgba(52, 72, 70, ${alpha})`, rand);
	}

	// Mid trees.
	for (let i = 0; i < 12; i++) {
		const side = rand() < 0.5 ? between(rand, -0.05, 0.35) : between(rand, 0.68, 1.05);
		tree(
			ctx,
			side * w,
			-h * 0.1,
			between(rand, 0.02, 0.04) * unit,
			h,
			`rgba(24, 38, 36, 0.7)`,
			rand
		);
	}

	// Near trunks framing the view.
	for (let i = 0; i < 5; i++) {
		const side = i % 2 === 0 ? between(rand, -0.08, 0.18) : between(rand, 0.84, 1.08);
		tree(
			ctx,
			side * w,
			-h * 0.2,
			between(rand, 0.05, 0.09) * unit,
			h,
			'rgba(8, 15, 14, 0.92)',
			rand
		);
	}

	// Ground mist and a darker forest floor.
	const floor = ctx.createLinearGradient(0, h * 0.62, 0, h);
	floor.addColorStop(0, 'rgba(120, 146, 140, 0.25)');
	floor.addColorStop(0.4, 'rgba(26, 44, 38, 0.6)');
	floor.addColorStop(1, 'rgba(6, 12, 10, 0.95)');
	ctx.fillStyle = floor;
	ctx.fillRect(0, h * 0.62, w, h * 0.38);

	vignette(ctx, w, h, 0.55);
}

/** Wet street at night: dark blue with warm and cool out-of-focus lights. */
function paintCityNight(ctx: CanvasRenderingContext2D, w: number, h: number) {
	const rand = seeded(11);
	const unit = Math.max(w, h);

	const sky = ctx.createLinearGradient(0, 0, 0, h);
	sky.addColorStop(0, '#0d1420');
	sky.addColorStop(0.55, '#1c2634');
	sky.addColorStop(1, '#0a0e14');
	ctx.fillStyle = sky;
	ctx.fillRect(0, 0, w, h);

	glow(ctx, w * 0.5, h * 0.62, unit * 0.45, 'rgba(70, 90, 120, 0.35)');

	const colours = [
		'255, 196, 120',
		'255, 160, 90',
		'170, 210, 255',
		'255, 230, 190',
		'230, 120, 110'
	];
	for (let i = 0; i < 70; i++) {
		const c = colours[Math.floor(rand() * colours.length)];
		const y = h * between(rand, 0.35, 0.85);
		glow(
			ctx,
			rand() * w,
			y,
			unit * between(rand, 0.01, 0.045),
			`rgba(${c}, ${between(rand, 0.25, 0.7)})`
		);
	}

	vignette(ctx, w, h, 0.6);
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string) {
	const g = ctx.createRadialGradient(x, y, 0, x, y, r);
	g.addColorStop(0, colour);
	g.addColorStop(1, colour.replace(/[\d.]+\)$/, '0)'));
	ctx.fillStyle = g;
	ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function tree(
	ctx: CanvasRenderingContext2D,
	x: number,
	top: number,
	width: number,
	h: number,
	colour: string,
	rand: () => number
) {
	ctx.fillStyle = colour;
	// Slightly tapered, slightly leaning trunk.
	const lean = between(rand, -0.02, 0.02) * h;
	ctx.beginPath();
	ctx.moveTo(x - width * 0.35 + lean, top);
	ctx.lineTo(x + width * 0.35 + lean, top);
	ctx.lineTo(x + width * 0.55, h);
	ctx.lineTo(x - width * 0.55, h);
	ctx.closePath();
	ctx.fill();

	// A few soft branch masses.
	const masses = 2 + Math.floor(rand() * 3);
	for (let i = 0; i < masses; i++) {
		const by = top + between(rand, 0, 0.45) * (h - top);
		const br = width * between(rand, 1.2, 2.6);
		ctx.beginPath();
		ctx.ellipse(x + lean + between(rand, -1, 1) * width, by, br, br * 0.6, 0, 0, Math.PI * 2);
		ctx.fill();
	}
}

function vignette(ctx: CanvasRenderingContext2D, w: number, h: number, strength: number) {
	const r = Math.hypot(w, h) / 2;
	const g = ctx.createRadialGradient(w / 2, h / 2, r * 0.35, w / 2, h / 2, r);
	g.addColorStop(0, 'rgba(0, 0, 0, 0)');
	g.addColorStop(1, `rgba(0, 0, 0, ${strength})`);
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, w, h);
}
