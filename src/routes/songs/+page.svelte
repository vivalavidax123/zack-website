<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { PreviewPlayer, type PreviewState } from '#lib/audio/preview.js';
	import { rainSound } from '#lib/audio/rain-sound.js';
	import type { FeatureBox } from '#lib/rain/index.js';
	import { useRain } from '#lib/rain-handle.svelte.js';
	import { dialog } from '#lib/actions/dialog.js';
	import { splash } from '#lib/transitions/splash.js';
	import { songDrops } from '#lib/songs/layout.js';
	import type { Song } from '#lib/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const rain = useRain();
	const songs = $derived(data.songs);
	const byId = $derived(new Map(songs.map((s) => [s.id, s])));

	let width = $state(0);
	let height = $state(0);
	/** Glass shows the drops; list is the plain, accessible way in. */
	let view = $state<'glass' | 'list' | null>(null);
	let hovered = $state<string | null>(null);
	let selected = $state<string | null>(null);
	/** Where the clicked drop was: the panel opens out of it like a splash. */
	let origin = $state({ x: 0, y: 0, r: 0 });
	let splashes = $state(0);
	let box = $state<FeatureBox | null>(null);
	let preview = $state<PreviewState>({ id: null, status: 'idle' });

	let player: PreviewPlayer | undefined;

	// Without motion or WebGL the drops can't drift, so start with the list.
	$effect(() => {
		if (view || !rain.stats) return;
		view = rain.stats.reducedMotion || !rain.stats.webgl ? 'list' : 'glass';
	});

	$effect(() => {
		const controller = rain.controller;
		if (!controller || !width || !height) return;
		controller.setFeatureDrops(view === 'glass' ? songDrops(songs, width, height) : []);
	});

	$effect(() => {
		rain.controller?.setHovered(view === 'glass' ? hovered : null);
	});

	// The glass is shared with other pages: take our drops away when we leave.
	$effect(() => {
		const controller = rain.controller;
		return () => {
			controller?.setFeatureDrops([]);
			controller?.setHovered(null);
			controller?.setPointer(null);
		};
	});

	// Follow the hovered drop with its card; it eases to a stop, so keep measuring.
	$effect(() => {
		const id = hovered;
		const controller = rain.controller;
		if (!id || !controller) {
			box = null;
			return;
		}
		let frame = 0;
		const follow = () => {
			box = controller.featureBox(id);
			frame = requestAnimationFrame(follow);
		};
		follow();
		return () => cancelAnimationFrame(frame);
	});

	onMount(() => {
		player = new PreviewPlayer((s) => {
			preview = s;
			// Let the song come through: the rain steps back while a preview plays.
			rainSound.duck(s.status === 'playing');
		});
		// The first few favourites are the likeliest first hovers.
		// Links only: the sound itself loads once the pointer comes near a drop,
		// so opening the page on mobile data stays light.
		for (const song of songs.slice(0, 3)) void player.warm(song.id, song.deezerId, false);
		return () => {
			player?.destroy();
			rainSound.duck(false);
		};
	});

	function play(song: Song | undefined) {
		if (song) void player?.play(song.id, song.deezerId, song.climaxStart);
		else player?.stop();
	}

	function hover(id: string | null) {
		if (id === hovered) return;
		hovered = id;
		play(id ? byId.get(id) : undefined);
	}

	const covers = new Set<string>();

	/** Load the previews and covers of the drops around the pointer before they're needed. */
	function warmAround(x: number, y: number) {
		for (const id of rain.controller?.featuresNear(x, y, 160).slice(0, 3) ?? []) {
			const song = byId.get(id);
			void player?.warm(id, song?.deezerId ?? null);
			if (song?.imageUrl && !covers.has(song.imageUrl)) {
				covers.add(song.imageUrl);
				new Image().src = song.imageUrl;
			}
		}
	}

	function onpointermove(e: PointerEvent) {
		if (e.pointerType === 'touch' || !rain.controller) return;
		rain.controller.setPointer({ x: e.clientX, y: e.clientY });
		hover(rain.controller.featureAt(e.clientX, e.clientY));
		warmAround(e.clientX, e.clientY);
	}

	function onpointerleave(e: PointerEvent) {
		if (e.pointerType === 'touch') return;
		rain.controller?.setPointer(null);
		hover(null);
	}

	function onpointerup(e: PointerEvent) {
		const controller = rain.controller;
		if (!controller) return;
		const id = controller.featureAt(e.clientX, e.clientY);
		if (e.pointerType !== 'touch') {
			if (id) {
				const b = rain.controller?.featureBox(id);
				origin = b ? { x: b.x, y: b.y, r: b.r } : { x: e.clientX, y: e.clientY, r: 0 };
				splashes++;
				selected = id;
			} else if (preview.status === 'blocked') play(hovered ? byId.get(hovered) : undefined);
			return;
		}
		// Phones have no hover: the first tap plays and shows the card, a second opens Spotify.
		if (id && id === hovered) {
			window.open(byId.get(id)?.spotifyUrl, '_blank', 'noreferrer');
			return;
		}
		controller.setPointer(id ? { x: e.clientX, y: e.clientY } : null);
		hover(id);
	}

	function toggle(song: Song) {
		if (preview.id === song.id && preview.status !== 'idle') player?.stop();
		else play(song);
	}

	function switchView() {
		view = view === 'list' ? 'glass' : 'list';
		hover(null);
		selected = null;
	}

	const hoveredSong = $derived(hovered ? byId.get(hovered) : undefined);
	const selectedSong = $derived(selected ? byId.get(selected) : undefined);

	/** Put the card beside the drop, on whichever side has room. */
	const cardStyle = $derived.by(() => {
		if (!box) return '';
		const right = box.x + box.r + 260 < width;
		const x = right ? box.x + box.r + 14 : box.x - box.r - 14;
		const y = Math.min(height - 70, Math.max(70, box.y));
		return `left:${x}px;top:${y}px;transform:translate(${right ? 0 : -100}%,-50%)`;
	});

	function status(song: Song): string {
		if (!song.deezerId) return 'No preview';
		if (preview.id !== song.id) return '';
		if (preview.status === 'loading') return 'Loading…';
		if (preview.status === 'blocked') return 'Click to listen';
		return preview.status === 'playing' ? 'Playing' : '';
	}
</script>

<svelte:head>
	<title>Songs · Zack</title>
	<meta
		name="description"
		content="The songs I keep coming back to, and what I've played lately."
	/>
</svelte:head>

<svelte:window
	bind:innerWidth={width}
	bind:innerHeight={height}
	onkeydown={(e) => e.key === 'Escape' && (selected = null)}
/>

{#if view === 'glass'}
	<div
		class="glass"
		class:pointing={Boolean(hovered)}
		aria-hidden="true"
		{onpointermove}
		{onpointerleave}
		{onpointerup}
	></div>
{/if}

<header>
	<a class="home" href="/">Zack</a>
	<h1>Songs</h1>
	<p>
		{#if view === 'list'}
			Favourites first, then what I've played lately.
		{:else}
			Hover a drop to hear it. Big drops are favourites.
		{/if}
	</p>
</header>

{#if view}
	<button class="switch" type="button" onclick={switchView}>
		{view === 'list' ? 'Show on the glass' : 'Show as a list'}
	</button>
{/if}

{#if preview.status === 'blocked'}
	<button class="gate" type="button" onclick={() => play(hovered ? byId.get(hovered) : undefined)}>
		Tap to listen
	</button>
{/if}

{#if view === 'glass' && hoveredSong?.imageUrl && box}
	<!-- The cover sits inside the drop, as if seen through the water. -->
	{#key hoveredSong.id}
		<span
			class="cover"
			out:fade|global={{ duration: 300 }}
			style:left="{box.x}px"
			style:top="{box.y}px"
			style:width="{box.r * 1.7}px"
			style:height="{box.r * 1.7}px"
		>
			<img src={hoveredSong.imageUrl} alt="" />
		</span>
	{/key}
{/if}

{#if view === 'glass' && hoveredSong && box}
	<div class="card" style={cardStyle} aria-live="polite">
		<span class="title">{hoveredSong.title}</span>
		<span class="artist">{hoveredSong.artist}</span>
		{#if hoveredSong.note}<span class="note">{hoveredSong.note}</span>{/if}
		{#if status(hoveredSong)}<span class="status">{status(hoveredSong)}</span>{/if}
	</div>
{/if}

{#if view === 'list'}
	<main class="list">
		<ol>
			{#each songs as song (song.id)}
				<li class:favourite={song.source === 'favourite'}>
					{#if song.imageUrl}
						<img src={song.imageUrl} alt="" width="48" height="48" loading="lazy" />
					{:else}
						<span class="art"></span>
					{/if}
					<span class="words">
						<span class="title">{song.title}</span>
						<span class="artist">{song.artist}</span>
						{#if song.note}<span class="note">{song.note}</span>{/if}
					</span>
					<button
						type="button"
						disabled={!song.deezerId}
						aria-pressed={preview.id === song.id && preview.status !== 'idle'}
						aria-label="{preview.id === song.id ? 'Stop' : 'Play'} preview of {song.title}"
						onclick={() => toggle(song)}
					>
						{preview.id === song.id && preview.status !== 'idle' ? 'Stop' : 'Play'}
					</button>
					<a href={song.spotifyUrl} target="_blank" rel="noreferrer">Spotify</a>
				</li>
			{:else}
				<li class="empty">No songs yet. The rain is still gathering them.</li>
			{/each}
		</ol>
	</main>
{/if}

{#if selectedSong && splashes}
	{#key splashes}
		<span
			class="ripple"
			style:left="{origin.x}px"
			style:top="{origin.y}px"
			style:width="{origin.r * 2}px"
			style:height="{origin.r * 2}px"
		></span>
	{/key}
{/if}

{#if selectedSong}
	<div
		class="panel"
		role="dialog"
		aria-label={selectedSong.title}
		tabindex="-1"
		use:dialog
		transition:splash={origin}
	>
		<button class="close" type="button" aria-label="Close" onclick={() => (selected = null)}>
			×
		</button>
		{#if selectedSong.imageUrl}
			<img
				src={selectedSong.imageUrl}
				alt="Cover of {selectedSong.album}"
				decoding="async"
				width="200"
				height="200"
			/>
		{/if}
		<h2>{selectedSong.title}</h2>
		<p class="artist">{selectedSong.artist} · {selectedSong.album}</p>
		{#if selectedSong.note}<p class="note">{selectedSong.note}</p>{/if}
		<div class="actions">
			{#if selectedSong.deezerId}
				<button type="button" onclick={() => toggle(selectedSong)}>
					{preview.id === selectedSong.id && preview.status !== 'idle'
						? 'Stop preview'
						: 'Play preview'}
				</button>
			{/if}
			<a href={selectedSong.spotifyUrl} target="_blank" rel="noreferrer">Play on Spotify</a>
		</div>
	</div>
{/if}

<style>
	.glass {
		position: fixed;
		inset: 0;
		touch-action: manipulation;
	}
	.pointing {
		cursor: pointer;
	}

	header {
		position: fixed;
		top: clamp(16px, 4vh, 40px);
		left: clamp(16px, 4vw, 48px);
		max-width: calc(100vw - 32px);
		pointer-events: none;
		text-shadow: 0 2px 14px rgba(0, 0, 0, 0.55);
	}
	header a,
	header p {
		pointer-events: auto;
	}
	.home {
		color: var(--ink-soft);
		text-decoration: none;
		font-size: 14px;
		letter-spacing: 0.06em;
	}
	h1 {
		margin: 2px 0 0;
		font-weight: 400;
		font-size: clamp(26px, 3.6vw, 40px);
	}
	header p {
		margin: 4px 0 0;
		font-style: italic;
		color: var(--ink-soft);
		font-size: 14px;
	}

	button,
	.actions a,
	li a {
		font:
			13px system-ui,
			sans-serif;
		color: var(--ink);
		background: rgba(14, 24, 24, 0.55);
		border: 1px solid rgba(232, 239, 238, 0.3);
		border-radius: 999px;
		padding: 7px 14px;
		text-decoration: none;
		cursor: pointer;
		backdrop-filter: blur(8px);
	}
	button:hover,
	.actions a:hover,
	li a:hover {
		border-color: rgba(232, 239, 238, 0.65);
	}
	button:disabled {
		opacity: 0.4;
		cursor: default;
	}
	:focus-visible {
		outline: 2px solid rgba(232, 239, 238, 0.85);
		outline-offset: 3px;
	}

	.switch {
		position: fixed;
		top: clamp(16px, 4vh, 40px);
		right: clamp(16px, 4vw, 48px);
	}
	.gate {
		position: fixed;
		bottom: 28px;
		left: 50%;
		transform: translateX(-50%);
		padding: 10px 20px;
		font-size: 14px;
	}

	.cover {
		position: fixed;
		translate: -50% -50%;
		border-radius: 50%;
		overflow: hidden;
		pointer-events: none;
		/* Soft edge, so the drop's own dark rim still frames it. */
		mask-image: radial-gradient(circle, #000 52%, transparent 71%);
		opacity: 0.9;
		animation: surface 0.35s ease-out;
	}
	.cover img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		/* Water bulges the middle and softens hard edges a little. */
		scale: 1.12;
		filter: saturate(0.85) contrast(1.05) blur(0.4px);
	}
	/* The drop's shine and shading, redrawn on top so it reads as water, not a sticker. */
	.cover::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 50%;
		background:
			radial-gradient(
				circle at 34% 26%,
				rgba(255, 255, 255, 0.5) 0,
				rgba(255, 255, 255, 0.12) 9%,
				transparent 22%
			),
			radial-gradient(circle at 50% 45%, transparent 38%, rgba(5, 12, 12, 0.55) 70%);
	}
	@keyframes surface {
		from {
			opacity: 0;
			scale: 0.8;
		}
	}

	.card {
		position: fixed;
		display: grid;
		gap: 2px;
		max-width: 240px;
		pointer-events: none;
		text-shadow: 0 1px 8px rgba(0, 0, 0, 0.7);
	}
	.title {
		font-style: italic;
		font-size: 17px;
	}
	.artist,
	.status {
		font:
			12px system-ui,
			sans-serif;
		color: var(--ink-soft);
	}
	.note {
		font-size: 13px;
		color: var(--ink-soft);
		font-style: italic;
	}
	.status {
		letter-spacing: 0.05em;
		text-transform: uppercase;
		font-size: 10px;
	}

	.list {
		position: fixed;
		inset: clamp(120px, 18vh, 160px) 0 0;
		overflow-y: auto;
		padding: 0 clamp(16px, 4vw, 48px) 40px;
	}
	ol {
		list-style: none;
		margin: 0 auto;
		padding: 0;
		max-width: 640px;
		display: grid;
		gap: 6px;
	}
	li {
		display: grid;
		grid-template-columns: 48px 1fr auto auto;
		align-items: center;
		gap: 12px;
		padding: 8px 12px;
		border-radius: 14px;
		background: rgba(10, 18, 18, 0.45);
		backdrop-filter: blur(10px);
	}
	li.favourite {
		background: rgba(18, 30, 30, 0.6);
	}
	li img,
	.art {
		width: 48px;
		height: 48px;
		border-radius: 8px;
		background: rgba(232, 239, 238, 0.1);
	}
	.words {
		display: grid;
		min-width: 0;
	}
	.words > span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	li.empty {
		display: block;
		text-align: center;
		font-style: italic;
	}
	@media (prefers-reduced-motion: reduce) {
		.cover {
			animation: none;
		}
	}
	@media (max-width: 480px) {
		li {
			grid-template-columns: 40px 1fr auto;
		}
		li img,
		.art {
			width: 40px;
			height: 40px;
		}
		li a {
			display: none;
		}
	}

	/* A ring of water spreading from the clicked drop. */
	.ripple {
		position: fixed;
		translate: -50% -50%;
		border-radius: 50%;
		border: 1.5px solid rgba(232, 239, 238, 0.55);
		pointer-events: none;
		opacity: 0;
		animation: ripple 0.7s ease-out;
	}
	@keyframes ripple {
		from {
			opacity: 1;
			scale: 1;
		}
		to {
			opacity: 0;
			scale: 2.6;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.ripple {
			display: none;
		}
	}

	.panel:focus {
		outline: none;
	}
	.panel {
		position: fixed;
		right: clamp(16px, 4vw, 48px);
		bottom: clamp(16px, 4vh, 40px);
		width: min(300px, calc(100vw - 32px));
		display: grid;
		gap: 6px;
		padding: 18px;
		border-radius: 20px;
		background: rgba(10, 18, 18, 0.72);
		border: 1px solid rgba(232, 239, 238, 0.18);
		backdrop-filter: blur(14px);
	}
	.panel img {
		width: 100%;
		height: auto;
		border-radius: 12px;
	}
	.panel h2 {
		margin: 6px 0 0;
		font-weight: 400;
		font-style: italic;
		font-size: 20px;
	}
	.panel p {
		margin: 0;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 8px;
	}
	.close {
		position: absolute;
		top: 10px;
		right: 10px;
		width: 30px;
		height: 30px;
		padding: 0;
		font-size: 18px;
		line-height: 1;
	}
</style>
