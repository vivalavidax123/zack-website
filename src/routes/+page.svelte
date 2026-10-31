<script lang="ts">
	import { onMount } from 'svelte';
	import type { FeatureDrop } from '#lib/rain/index.js';
	import { useRain } from '#lib/rain-handle.svelte.js';
	import type { NowPlaying } from '#lib/types.js';

	const rain = useRain();

	let width = $state(0);
	let height = $state(0);
	let hovered = $state<string | null>(null);
	let nowPlaying = $state<NowPlaying | null>(null);

	type Tab = { id: string; label: string; href: string; external?: boolean };

	const nowHref = $derived(
		nowPlaying && nowPlaying.state !== 'unavailable' ? nowPlaying.track.spotifyUrl : null
	);

	const tabs = $derived<Tab[]>([
		{ id: 'songs', label: 'Songs', href: '/songs' },
		{ id: 'projects', label: 'Projects', href: '/projects' },
		{ id: 'about', label: 'About', href: '/about' },
		{ id: 'now', label: 'Now playing', href: nowHref ?? '/songs', external: Boolean(nowHref) }
	]);

	/**
	 * Where each drop sits, as fractions of the screen and of its shorter side.
	 * Desktop is a loose composition; phones get a calm column.
	 */
	const layout = $derived.by(() => {
		const narrow = width < 700;
		const u = Math.min(width, height);
		const place = narrow
			? {
					songs: [0.5, 0.27, 0.2 * width],
					projects: [0.5, 0.48, 0.13 * width],
					about: [0.5, 0.65, 0.12 * width],
					now: [0.5, 0.82, 0.13 * width]
				}
			: {
					songs: [0.36, 0.45, 0.14 * u],
					projects: [0.64, 0.3, 0.085 * u],
					about: [0.71, 0.64, 0.075 * u],
					now: [0.47, 0.79, 0.08 * u]
				};
		return Object.fromEntries(
			Object.entries(place).map(([id, [fx, fy, r]]) => [
				id,
				{ id, x: fx * width, y: fy * height, r: Math.max(34, r) }
			])
		) as Record<string, FeatureDrop>;
	});

	$effect(() => {
		if (!width || !height) return;
		rain.controller?.setFeatureDrops(Object.values(layout));
	});

	$effect(() => {
		rain.controller?.setHovered(hovered);
	});

	// The glass is shared with other pages: take our drops away when we leave.
	$effect(() => {
		const controller = rain.controller;
		return () => {
			controller?.setFeatureDrops([]);
			controller?.setHovered(null);
		};
	});

	onMount(() => {
		let timer: ReturnType<typeof setInterval>;
		const load = async () => {
			if (document.hidden) return;
			try {
				const res = await fetch('/api/now-playing');
				nowPlaying = (await res.json()) as NowPlaying;
			} catch {
				nowPlaying = { state: 'unavailable' };
			}
		};
		load();
		timer = setInterval(load, 60_000);
		return () => clearInterval(timer);
	});

	function ago(iso: string): string {
		const minutes = Math.round((Date.now() - Date.parse(iso)) / 60_000);
		if (minutes < 2) return 'just now';
		if (minutes < 60) return `${minutes} min ago`;
		const hours = Math.round(minutes / 60);
		if (hours < 24) return `${hours} h ago`;
		const days = Math.round(hours / 24);
		return days === 1 ? 'yesterday' : `${days} days ago`;
	}

	const nowLine = $derived.by(() => {
		if (!nowPlaying) return 'Listening…';
		if (nowPlaying.state === 'unavailable') return 'Quiet for now';
		const when =
			nowPlaying.state === 'playing' ? 'Listening now' : `Last played ${ago(nowPlaying.playedAt)}`;
		return when;
	});
</script>

<svelte:head>
	<title>Zeming Xia</title>
	<meta name="description" content="Rain, my stuff and the songs I keep coming back to." />
</svelte:head>

<svelte:window bind:innerWidth={width} bind:innerHeight={height} />

<header class="masthead">
	<h1>Zeming Xia</h1>
	<p>Rain, my stuff and the songs I keep coming back to.</p>
</header>

<nav aria-label="Main" class:flat={rain.stats ? !rain.stats.webgl : false}>
	{#if width}
		{#each tabs as tab, i (tab.id)}
			{@const d = layout[tab.id]}
			<a
				class="drop"
				class:big={tab.id === 'songs'}
				class:hovered={hovered === tab.id}
				href={tab.href}
				target={tab.external ? '_blank' : undefined}
				rel={tab.external ? 'noreferrer' : undefined}
				style:left="{d.x - d.r}px"
				style:top="{d.y - d.r}px"
				style:width="{d.r * 2}px"
				style:height="{d.r * 2}px"
				onpointerenter={() => (hovered = tab.id)}
				onpointerleave={() => (hovered = null)}
				onfocus={() => (hovered = tab.id)}
				onblur={() => (hovered = null)}
			>
				<span class="label" style:--i={i}>{tab.label}</span>
			</a>
			{#if tab.id === 'now'}
				<p
					class="now"
					style:--i={i}
					style:left="{d.x}px"
					style:top="{d.y + d.r + 10}px"
					aria-live="polite"
				>
					{#if nowPlaying && nowPlaying.state !== 'unavailable'}
						<span class="track">{nowPlaying.track.title}</span>
						<span class="artist">{nowPlaying.track.artist}</span>
					{/if}
					<span class="when">{nowLine}</span>
				</p>
			{/if}
		{/each}
	{/if}
</nav>

<style>
	.masthead {
		position: fixed;
		top: clamp(16px, 4vh, 40px);
		left: clamp(16px, 4vw, 48px);
		max-width: calc(100vw - 32px);
	}
	h1 {
		margin: 0;
		font-weight: 400;
		font-size: clamp(28px, 4vw, 44px);
		letter-spacing: 0.04em;
		text-shadow: 0 2px 18px rgba(0, 0, 0, 0.45);
	}
	.masthead p {
		margin: 4px 0 0;
		font-style: italic;
		color: var(--ink-soft);
		font-size: clamp(13px, 1.4vw, 15px);
		text-shadow: 0 1px 10px rgba(0, 0, 0, 0.5);
	}

	.drop {
		position: absolute;
		display: grid;
		place-items: center;
		border-radius: 50%;
		color: var(--ink);
		text-decoration: none;
		-webkit-tap-highlight-color: transparent;
	}
	.drop:focus-visible {
		outline: 2px solid rgba(232, 239, 238, 0.85);
		outline-offset: 6px;
	}
	/* Words arrive with their drops, which condense one after another. */
	.label,
	.now {
		animation: condense 1.2s ease-out both;
		animation-delay: calc(var(--i) * 0.18s + 0.35s);
	}
	@keyframes condense {
		from {
			opacity: 0;
		}
	}

	.label {
		text-align: center;
		font-style: italic;
		font-size: clamp(15px, 1.6vw, 19px);
		letter-spacing: 0.03em;
		text-shadow:
			0 1px 2px rgba(0, 0, 0, 0.6),
			0 0 18px rgba(0, 0, 0, 0.55);
		transition: transform 0.25s ease;
	}
	.big .label {
		font-size: clamp(20px, 2.4vw, 28px);
	}
	.hovered .label {
		transform: scale(1.08);
	}

	/* Without WebGL there are no glass drops to sit in, so draw a quiet ring instead. */
	.flat .drop {
		border: 1px solid rgba(232, 239, 238, 0.35);
		background: rgba(20, 32, 32, 0.25);
		backdrop-filter: blur(6px);
	}

	.now {
		position: absolute;
		transform: translateX(-50%);
		margin: 0;
		width: max-content;
		max-width: min(320px, 80vw);
		display: grid;
		justify-items: center;
		text-align: center;
		gap: 2px;
		font-size: 13px;
		text-shadow: 0 1px 8px rgba(0, 0, 0, 0.6);
		pointer-events: none;
	}
	.track {
		font-style: italic;
		font-size: 15px;
	}
	.artist,
	.when {
		color: var(--ink-soft);
		font-family: system-ui, sans-serif;
		font-size: 12px;
	}

	@media (prefers-reduced-motion: reduce) {
		.label,
		.now {
			transition: none;
			animation: none;
		}
	}
</style>
