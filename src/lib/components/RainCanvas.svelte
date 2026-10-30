<script lang="ts">
	import { onMount } from 'svelte';
	import {
		createRain,
		type RainConfig,
		type RainController,
		type RainStats
	} from '#lib/rain/index.js';

	let {
		config = {},
		onstats
	}: { config?: Partial<RainConfig>; onstats?: (stats: RainStats) => void } = $props();

	let canvas: HTMLCanvasElement;
	let rain: RainController | undefined = $state();

	onMount(() => {
		const controller = createRain(canvas, $state.snapshot(config) as Partial<RainConfig>);
		const off = controller.onStats((s) => onstats?.(s));
		rain = controller;
		return () => {
			off();
			controller.destroy();
		};
	});

	$effect(() => {
		rain?.setConfig($state.snapshot(config) as Partial<RainConfig>);
	});
</script>

<canvas bind:this={canvas} aria-hidden="true"></canvas>

<style>
	canvas {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
		z-index: 0;
	}
</style>
