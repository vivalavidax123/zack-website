<script lang="ts">
	import '../app.css';
	import { afterNavigate, onNavigate } from '$app/navigation';
	import RainCanvas from '#lib/components/RainCanvas.svelte';
	import { RainHandle, provideRain } from '#lib/rain-handle.svelte.js';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// One engine for the whole site: navigating keeps the same glass and drops.
	const rain = new RainHandle();
	provideRain(rain);

	/** Link previews need an absolute address for their image. */
	const SITE = 'https://zemingxia.com';

	/** How long the old page takes to fade, even when the glass stays still. */
	const FADE_MS = 220;

	let leaving = $state(false);
	let lastPress: { x: number; y: number } | null = null;

	/**
	 * Every page change is one move of the viewer: toward the window, aimed at
	 * what you clicked, or a step back when you go home or press Back. SvelteKit
	 * waits for the promise we return before it swaps the page.
	 */
	onNavigate((nav) => {
		if (!nav.to || nav.to.url.pathname === nav.from?.url.pathname) return;
		const back = nav.to.url.pathname === '/' || (nav.type === 'popstate' && (nav.delta ?? 0) < 0);
		const toward = nav.type === 'link' ? (lastPress ?? undefined) : undefined;
		leaving = true;
		return Promise.all([
			rain.controller?.leave(back ? -1 : 1, toward),
			new Promise((done) => setTimeout(done, FADE_MS))
		]).then(() => {});
	});

	afterNavigate(() => {
		leaving = false;
		void rain.controller?.arrive();
	});
</script>

<svelte:head>
	<!-- What a link preview shows when the site is shared in a chat or post. -->
	<meta property="og:site_name" content="Zack" />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="Zack" />
	<meta
		property="og:description"
		content="Rain on the window, and the songs I keep coming back to."
	/>
	<meta property="og:image" content="{SITE}/og.jpg" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="theme-color" content="#0d1716" />
</svelte:head>

<svelte:window onpointerdown={(e) => (lastPress = { x: e.clientX, y: e.clientY })} />

<RainCanvas oncreate={(c) => (rain.controller = c)} onstats={(s) => (rain.stats = s)} />

<div class="page" class:leaving>
	{@render children()}
</div>

<style>
	.page {
		position: relative;
		z-index: 1;
		min-height: 100%;
		transition: opacity 0.45s ease-out;
	}
	.leaving {
		opacity: 0;
		transition-duration: 0.2s;
		transition-timing-function: ease-in;
	}
</style>
