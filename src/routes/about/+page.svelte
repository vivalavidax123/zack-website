<script lang="ts">
	import { about } from '#lib/data/about.js';
</script>

<svelte:head>
	<title>About · Zeming Xia</title>
	<meta name="description" content="About Zeming Xia: study, timeline and where to find me." />
</svelte:head>

<header>
	<a class="home" href="/">Zeming Xia</a>
	<h1>About</h1>
</header>

<main>
	<section class="card">
		<p class="intro">{about.intro}</p>

		<h2>Timeline</h2>
		<ol>
			{#each about.timeline as item, i (i)}
				<li style:--i={i}>
					<span class="mark"></span>
					<span class="when">{item.when}</span>
					<span class="title">{item.title}</span>
					<span class="place">{item.place}</span>
					{#if item.detail}<span class="detail">{item.detail}</span>{/if}
				</li>
			{/each}
		</ol>

		<h2>Find me</h2>
		<div class="links">
			{#each about.links as link (link.href)}
				<a href={link.href} target="_blank" rel="noreferrer">{link.label}</a>
			{/each}
		</div>
	</section>
</main>

<style>
	header {
		position: fixed;
		top: clamp(16px, 4vh, 40px);
		left: clamp(16px, 4vw, 48px);
		text-shadow: 0 2px 14px rgba(0, 0, 0, 0.55);
		z-index: 1;
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

	/* The page scrolls inside itself; the body stays still so the glass does too. */
	main {
		position: fixed;
		inset: 0;
		overflow-y: auto;
		padding: clamp(110px, 18vh, 150px) clamp(16px, 4vw, 48px) 40px;
	}

	/* Words need a calm surface: a soft, misted backdrop behind them. */
	.card {
		max-width: 560px;
		padding: clamp(18px, 3vw, 28px);
		border-radius: 22px;
		background: rgba(10, 18, 18, 0.5);
		backdrop-filter: blur(12px);
		font:
			15px/1.6 system-ui,
			sans-serif;
		animation: condense 1s ease-out both;
	}
	@keyframes condense {
		from {
			opacity: 0;
		}
	}
	.intro {
		margin: 0;
		font:
			italic 19px/1.5 Georgia,
			'Times New Roman',
			serif;
	}
	h2 {
		margin: 28px 0 12px;
		font:
			400 12px system-ui,
			sans-serif;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--ink-soft);
	}

	ol {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 18px;
	}
	li {
		position: relative;
		display: grid;
		padding-left: 40px;
	}
	/* A bead of water for each milestone, joined by a thin trail. */
	.mark {
		position: absolute;
		left: 6px;
		top: 6px;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background:
			radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.75) 0 12%, transparent 30%),
			radial-gradient(circle at 50% 60%, rgba(160, 185, 184, 0.35), rgba(10, 20, 20, 0.6) 75%);
		box-shadow:
			inset 0 -2px 4px rgba(0, 0, 0, 0.45),
			0 1px 3px rgba(0, 0, 0, 0.4);
	}
	li:first-child .mark {
		left: 4px;
		top: 4px;
		width: 22px;
		height: 22px;
	}
	li:not(:last-child)::before {
		content: '';
		position: absolute;
		left: 14px;
		top: 30px;
		bottom: -16px;
		width: 1px;
		background: linear-gradient(rgba(232, 239, 238, 0.3), rgba(232, 239, 238, 0.08));
	}
	.when {
		font-size: 12px;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--ink-soft);
	}
	.title {
		font:
			italic 18px Georgia,
			'Times New Roman',
			serif;
	}
	.place,
	.detail {
		color: var(--ink-soft);
	}

	.links {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.links a {
		font:
			14px system-ui,
			sans-serif;
		color: var(--ink);
		background: rgba(14, 24, 24, 0.55);
		border: 1px solid rgba(232, 239, 238, 0.3);
		border-radius: 999px;
		padding: 8px 16px;
		text-decoration: none;
	}
	.links a:hover {
		border-color: rgba(232, 239, 238, 0.65);
	}
	:focus-visible {
		outline: 2px solid rgba(232, 239, 238, 0.85);
		outline-offset: 3px;
	}

	@media (prefers-reduced-motion: reduce) {
		.card {
			animation: none;
		}
	}
</style>
