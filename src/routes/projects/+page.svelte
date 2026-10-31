<script lang="ts">
	import { projects, type Project } from '#lib/data/projects.js';
	import type { FeatureDrop } from '#lib/rain/index.js';
	import { useRain } from '#lib/rain-handle.svelte.js';
	import { splash, type SplashOrigin } from '#lib/transitions/splash.js';

	const rain = useRain();

	let width = $state(0);
	let height = $state(0);
	let hovered = $state<string | null>(null);
	let open = $state<Project | null>(null);
	let origin = $state<SplashOrigin>({ x: 0, y: 0, r: 0 });

	/**
	 * Projects are still drops: they are things to read, not to chase. They sit
	 * along a gentle curve across the middle of the glass.
	 */
	const drops = $derived.by(() => {
		const narrow = width < 700;
		const n = projects.length;
		const r = Math.max(
			48,
			(narrow ? 0.22 * width : 0.11 * Math.min(width, height * 1.5)) / Math.sqrt(n)
		);
		return projects.map((p, i): FeatureDrop => {
			const t = (i + 1) / (n + 1);
			return narrow
				? { id: p.id, x: width / 2, y: height * (0.25 + 0.55 * t), r }
				: { id: p.id, x: width * t, y: height * (0.52 + Math.sin(i * 1.9) * 0.12), r };
		});
	});

	$effect(() => {
		if (!width || !height) return;
		rain.controller?.setFeatureDrops(drops);
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

	function show(p: Project, d: FeatureDrop) {
		origin = { x: d.x, y: d.y, r: d.r };
		open = p;
	}
</script>

<svelte:head>
	<title>Projects · Zack</title>
	<meta name="description" content="Things I've built." />
</svelte:head>

<svelte:window
	bind:innerWidth={width}
	bind:innerHeight={height}
	onkeydown={(e) => e.key === 'Escape' && (open = null)}
/>

<header>
	<a class="home" href="/">Zack</a>
	<h1>Projects</h1>
	<p>Things I've built. Open a drop to read more.</p>
</header>

<main class:flat={rain.stats ? !rain.stats.webgl : false}>
	{#if width}
		{#each projects as project, i (project.id)}
			{@const d = drops[i]}
			<button
				type="button"
				class="drop"
				class:hovered={hovered === project.id}
				style:left="{d.x - d.r}px"
				style:top="{d.y - d.r}px"
				style:width="{d.r * 2}px"
				style:height="{d.r * 2}px"
				aria-haspopup="dialog"
				onpointerenter={() => (hovered = project.id)}
				onpointerleave={() => (hovered = null)}
				onfocus={() => (hovered = project.id)}
				onblur={() => (hovered = null)}
				onclick={() => show(project, d)}
			>
				<span class="label" style:--i={i}>{project.name}</span>
			</button>
			<p
				class="summary"
				class:shown={hovered === project.id}
				style:left="{d.x}px"
				style:top="{d.y + d.r + 12}px"
			>
				{project.summary}
			</p>
		{/each}
	{/if}
</main>

{#if open}
	<div class="panel" role="dialog" aria-label={open.name} transition:splash={origin}>
		<button class="close" type="button" aria-label="Close" onclick={() => (open = null)}>×</button>
		{#if open.image}
			<img src={open.image.src} alt={open.image.alt} width="960" height="669" decoding="async" />
		{/if}
		<h2>{open.name}</h2>
		<p class="when">{open.when}</p>
		<p>{open.description}</p>
		<ul class="highlights">
			{#each open.highlights as line (line)}<li>{line}</li>{/each}
		</ul>
		<ul class="stack" aria-label="Built with">
			{#each open.stack as tool (tool)}<li>{tool}</li>{/each}
		</ul>
		<div class="links">
			{#each open.links as link (link.href)}
				<a href={link.href} target="_blank" rel="noreferrer">{link.label}</a>
			{/each}
		</div>
	</div>
{/if}

<style>
	header {
		position: fixed;
		top: clamp(16px, 4vh, 40px);
		left: clamp(16px, 4vw, 48px);
		max-width: calc(100vw - 32px);
		text-shadow: 0 2px 14px rgba(0, 0, 0, 0.55);
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

	.drop {
		position: absolute;
		display: grid;
		place-items: center;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: none;
		color: var(--ink);
		font: inherit;
		text-align: center;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}
	.drop:focus-visible {
		outline: 2px solid rgba(232, 239, 238, 0.85);
		outline-offset: 6px;
	}
	.label {
		max-width: 76%;
		font-style: italic;
		font-size: clamp(17px, 2vw, 24px);
		line-height: 1.15;
		text-shadow:
			0 1px 2px rgba(0, 0, 0, 0.6),
			0 0 18px rgba(0, 0, 0, 0.55);
		transition: transform 0.25s ease;
		animation: condense 1.2s ease-out both;
		animation-delay: calc(var(--i) * 0.18s + 0.35s);
	}
	@keyframes condense {
		from {
			opacity: 0;
		}
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

	.summary {
		position: absolute;
		translate: -50% 0;
		margin: 0;
		max-width: min(280px, 80vw);
		text-align: center;
		font-style: italic;
		font-size: 14px;
		color: var(--ink-soft);
		text-shadow: 0 1px 8px rgba(0, 0, 0, 0.7);
		pointer-events: none;
		opacity: 0;
		transition: opacity 0.3s ease;
	}
	.summary.shown {
		opacity: 1;
	}

	.panel {
		position: fixed;
		top: clamp(16px, 4vh, 40px);
		right: clamp(16px, 4vw, 48px);
		bottom: clamp(16px, 4vh, 40px);
		width: min(440px, calc(100vw - 32px));
		overflow-y: auto;
		padding: 20px;
		box-sizing: border-box;
		border-radius: 20px;
		background: rgba(10, 18, 18, 0.78);
		border: 1px solid rgba(232, 239, 238, 0.18);
		backdrop-filter: blur(14px);
		font:
			14px/1.55 system-ui,
			sans-serif;
	}
	.panel img {
		width: 100%;
		height: auto;
		border-radius: 12px;
	}
	.panel h2 {
		margin: 14px 0 0;
		font:
			italic 400 24px Georgia,
			'Times New Roman',
			serif;
	}
	.panel p {
		margin: 6px 0 0;
	}
	.when {
		color: var(--ink-soft);
		font-size: 12px;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}
	.highlights {
		margin: 12px 0 0;
		padding-left: 18px;
		color: var(--ink-soft);
	}
	.highlights li + li {
		margin-top: 4px;
	}
	.stack {
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin: 14px 0 0;
		padding: 0;
	}
	.stack li {
		padding: 3px 10px;
		border-radius: 999px;
		background: rgba(232, 239, 238, 0.08);
		font-size: 12px;
	}
	.links {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 16px;
	}
	.links a,
	.close {
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
	}
	.links a:hover,
	.close:hover {
		border-color: rgba(232, 239, 238, 0.65);
	}
	.close {
		position: sticky;
		top: 0;
		float: right;
		width: 30px;
		height: 30px;
		padding: 0;
		margin: -6px -6px 0 0;
		font-size: 18px;
		line-height: 1;
		z-index: 1;
	}
	:focus-visible {
		outline: 2px solid rgba(232, 239, 238, 0.85);
		outline-offset: 3px;
	}

	@media (max-width: 700px) {
		.panel {
			top: auto;
			left: 16px;
			right: 16px;
			width: auto;
			max-height: 78vh;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.label,
		.summary {
			transition: none;
			animation: none;
		}
	}
</style>
