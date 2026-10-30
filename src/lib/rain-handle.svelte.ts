import { getContext, setContext } from 'svelte';
import type { RainController, RainStats } from '#lib/rain/index.js';

const KEY = Symbol('rain');

/**
 * The one rain engine shared by every page. The layout owns it, so the glass
 * keeps its drops when you move between pages; pages reach it through context.
 */
export class RainHandle {
	controller = $state.raw<RainController | undefined>(undefined);
	stats = $state.raw<RainStats | null>(null);
}

export function provideRain(handle: RainHandle) {
	setContext(KEY, handle);
}

export function useRain(): RainHandle {
	return getContext<RainHandle>(KEY);
}
