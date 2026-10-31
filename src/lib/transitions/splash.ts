import { cubicOut } from 'svelte/easing';

export type SplashOrigin = { x: number; y: number; r: number };

/**
 * Svelte transition: reveal an element as a circle of water spreading from a
 * drop (centre and radius in CSS pixels). Only `clip-path` changes, so the
 * content never moves and the browser doesn't have to lay it out again.
 */
export function splash(node: HTMLElement, from: SplashOrigin) {
	const rect = node.getBoundingClientRect();
	const cx = from.x - rect.left;
	const cy = from.y - rect.top;
	const reach = Math.max(
		...[
			[0, 0],
			[rect.width, 0],
			[0, rect.height],
			[rect.width, rect.height]
		].map(([x, y]) => Math.hypot(x - cx, y - cy))
	);
	return {
		duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 520,
		easing: cubicOut,
		css: (t: number) => `clip-path: circle(${from.r + (reach - from.r) * t}px at ${cx}px ${cy}px)`
	};
}
