export type SceneName = 'dusk-forest' | 'city-night';

export type BackgroundSource = { kind: 'scene'; scene: SceneName } | { kind: 'image'; src: string };

export type RainConfig = {
	/** How often new drops land on the glass, 0 to 1. */
	rainAmount: number;
	/** Size multiplier for drops that land on the glass. */
	dropSize: number;
	/** Density of the fine static droplets, 0 to 1. */
	mist: number;
	/** Strength of the falling rain behind the glass, 0 to 1. */
	streaks: number;
	/** How strongly a drop bends the scene behind it. */
	refraction: number;
	/** Overall exposure of the scene. */
	brightness: number;
	/** Colour grade multiplied over the final image (linear RGB, around 1). */
	tint: [number, number, number];
	background: BackgroundSource;
	/** 'auto' follows the visitor's prefers-reduced-motion setting. */
	reducedMotion: boolean | 'auto';
	/** Upper bound on device pixel ratio, to keep large screens cheap. */
	maxPixelRatio: number;
};

export const defaultConfig: RainConfig = {
	rainAmount: 0.5,
	dropSize: 1,
	mist: 0.6,
	streaks: 0.5,
	refraction: 0.22,
	brightness: 0.9,
	tint: [0.96, 1.0, 1.02],
	background: { kind: 'scene', scene: 'dusk-forest' },
	reducedMotion: 'auto',
	maxPixelRatio: 1.5
};

export function mergeConfig(base: RainConfig, patch: Partial<RainConfig>): RainConfig {
	return { ...base, ...patch };
}
