<script lang="ts">
	import '../app.css';
	import RainCanvas from '#lib/components/RainCanvas.svelte';
	import { RainHandle, provideRain } from '#lib/rain-handle.svelte.js';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// One engine for the whole site: navigating keeps the same glass and drops.
	const rain = new RainHandle();
	provideRain(rain);
</script>

<RainCanvas oncreate={(c) => (rain.controller = c)} onstats={(s) => (rain.stats = s)} />

<div class="page">
	{@render children()}
</div>

<style>
	.page {
		position: relative;
		z-index: 1;
		min-height: 100%;
	}
</style>
