<script lang="ts">
	import type { Shot } from '#lib/data/projects.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const project = $derived(data.project);

	/** The big picture at the top: the first screenshot, or the one the panel uses. */
	const hero = $derived<Shot | null>(
		project.gallery?.[0] ?? (project.image ? { ...project.image, caption: '' } : null)
	);
	const shots = $derived(project.gallery ?? []);

	let viewer = $state<HTMLDialogElement>();
	let shown = $state(0);

	/**
	 * Full-size screenshots open in a native <dialog>: the browser handles
	 * focus, Escape and the backdrop, so there is no focus trap to write.
	 */
	function open(i: number) {
		shown = i;
		viewer?.showModal();
	}

	function step(by: number) {
		shown = (shown + by + shots.length) % shots.length;
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowRight') step(1);
		else if (e.key === 'ArrowLeft') step(-1);
	}
</script>

<svelte:head>
	<title>{project.name} · Zeming Xia</title>
	<meta name="description" content={project.summary} />
</svelte:head>

<div class="scroller">
	<nav class="crumbs" aria-label="Breadcrumb">
		<a href="/">Zeming Xia</a>
		<span aria-hidden="true">/</span>
		<a href="/projects">Projects</a>
	</nav>

	<article>
		<header>
			<h1>{project.name}</h1>
			{#if project.meta?.length}
				<p class="meta">{project.meta.join(' · ')}</p>
			{/if}
			<p class="when">{project.when}</p>
			<p class="pitch">{project.description}</p>
			<div class="links">
				{#each project.links as link (link.href)}
					<a href={link.href} target="_blank" rel="noreferrer">{link.label}</a>
				{/each}
			</div>
		</header>

		{#if hero}
			{#if shots.length}
				<button type="button" class="hero" onclick={() => open(0)} aria-label="View {hero.alt}">
					<img src={hero.src} alt={hero.alt} width="1440" height="900" decoding="async" />
				</button>
			{:else}
				<img class="hero" src={hero.src} alt={hero.alt} decoding="async" />
			{/if}
		{/if}

		{#each project.story ?? [] as section (section.heading)}
			<section>
				<h2>{section.heading}</h2>
				{#each section.paragraphs as paragraph, i (i)}
					<p>{paragraph}</p>
				{/each}
			</section>
		{/each}

		{#if shots.length > 1}
			<section>
				<h2>Screenshots</h2>
				<ul class="gallery">
					{#each shots as shot, i (shot.src)}
						<li>
							<button type="button" onclick={() => open(i)} aria-label="View {shot.alt}">
								<img
									src={shot.src}
									alt=""
									width="1440"
									height="900"
									loading="lazy"
									decoding="async"
								/>
							</button>
							<p>{shot.caption}</p>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<section>
			<h2>Key features</h2>
			<ul class="highlights">
				{#each project.highlights as line (line)}<li>{line}</li>{/each}
			</ul>
		</section>

		<section>
			<h2>Built with</h2>
			<ul class="stack">
				{#each project.stack as tool (tool)}<li>{tool}</li>{/each}
			</ul>
		</section>

		<footer>
			<a href="/projects">← All projects</a>
			{#if data.next}
				<a href="/projects/{data.next.id}">Next: {data.next.name} →</a>
			{/if}
		</footer>
	</article>
</div>

{#if shots.length}
	<dialog bind:this={viewer} class="viewer" aria-label="Screenshots" {onkeydown}>
		<form method="dialog">
			<button class="close" aria-label="Close">×</button>
		</form>
		<figure>
			<img src={shots[shown].src} alt={shots[shown].alt} />
			<figcaption>
				{shots[shown].caption}
				<span class="count">{shown + 1} / {shots.length}</span>
			</figcaption>
		</figure>
		{#if shots.length > 1}
			<button type="button" class="arrow prev" aria-label="Previous" onclick={() => step(-1)}>
				‹
			</button>
			<button type="button" class="arrow next" aria-label="Next" onclick={() => step(1)}>›</button>
		{/if}
	</dialog>
{/if}

<style>
	/* The page itself never scrolls (the glass stays put), so this column does. */
	.scroller {
		position: fixed;
		inset: 0;
		overflow-y: auto;
		padding: clamp(16px, 4vh, 40px) clamp(16px, 4vw, 48px) 80px;
		box-sizing: border-box;
	}
	.crumbs {
		display: flex;
		gap: 8px;
		font-size: 14px;
		letter-spacing: 0.06em;
		color: var(--ink-soft);
		text-shadow: 0 1px 10px rgba(0, 0, 0, 0.6);
	}
	.crumbs a {
		color: var(--ink-soft);
		text-decoration: none;
	}
	.crumbs a:hover {
		color: var(--ink);
	}

	article {
		max-width: 780px;
		margin: 28px auto 0;
		padding: clamp(20px, 4vw, 40px);
		border-radius: 24px;
		background: rgba(10, 18, 18, 0.78);
		border: 1px solid rgba(232, 239, 238, 0.16);
		backdrop-filter: blur(14px);
		font:
			15px/1.65 system-ui,
			sans-serif;
	}
	h1 {
		margin: 0;
		font:
			italic 400 clamp(28px, 4vw, 40px) Georgia,
			'Times New Roman',
			serif;
	}
	.meta {
		margin: 8px 0 0;
		font-size: 14px;
	}
	.when {
		margin: 2px 0 0;
		color: var(--ink-soft);
		font-size: 12px;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}
	.pitch {
		margin: 16px 0 0;
		color: var(--ink-soft);
	}
	h2 {
		margin: 36px 0 8px;
		font:
			italic 400 22px Georgia,
			'Times New Roman',
			serif;
	}
	section p {
		margin: 0 0 12px;
	}

	.links,
	footer {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 18px;
	}
	.links a,
	footer a {
		font-size: 13px;
		color: var(--ink);
		background: rgba(14, 24, 24, 0.55);
		border: 1px solid rgba(232, 239, 238, 0.3);
		border-radius: 999px;
		padding: 7px 14px;
		text-decoration: none;
	}
	.links a:hover,
	footer a:hover {
		border-color: rgba(232, 239, 238, 0.65);
	}
	footer {
		justify-content: space-between;
		margin-top: 40px;
	}

	button {
		font: inherit;
		color: inherit;
		cursor: pointer;
	}
	.hero,
	.gallery button {
		display: block;
		width: 100%;
		padding: 0;
		border: 1px solid rgba(232, 239, 238, 0.14);
		border-radius: 14px;
		overflow: hidden;
		background: none;
		cursor: zoom-in;
	}
	.hero {
		margin-top: 28px;
	}
	img {
		display: block;
		width: 100%;
		height: auto;
	}
	.hero img,
	.gallery img {
		transition: transform 0.4s ease;
	}
	.hero:hover img,
	.gallery button:hover img {
		transform: scale(1.02);
	}

	.gallery {
		list-style: none;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 16px;
		margin: 0;
		padding: 0;
	}
	.gallery p {
		margin: 6px 0 0;
		font-size: 13px;
		color: var(--ink-soft);
	}

	.highlights {
		margin: 0;
		padding-left: 18px;
	}
	.highlights li + li {
		margin-top: 6px;
	}
	.stack {
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin: 0;
		padding: 0;
	}
	.stack li {
		padding: 3px 10px;
		border-radius: 999px;
		background: rgba(232, 239, 238, 0.08);
		font-size: 12px;
	}

	.viewer {
		width: min(1200px, 94vw);
		max-height: 94vh;
		padding: 0;
		border: 0;
		background: none;
		color: var(--ink);
		overflow: visible;
	}
	.viewer::backdrop {
		background: rgba(5, 10, 10, 0.85);
		backdrop-filter: blur(6px);
	}
	.viewer figure {
		margin: 0;
	}
	.viewer img {
		max-height: 82vh;
		object-fit: contain;
		border-radius: 10px;
	}
	.viewer figcaption {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		margin-top: 10px;
		font:
			14px system-ui,
			sans-serif;
	}
	.count {
		color: var(--ink-soft);
	}
	.close,
	.arrow {
		position: absolute;
		width: 40px;
		height: 40px;
		padding: 0;
		border-radius: 50%;
		border: 1px solid rgba(232, 239, 238, 0.35);
		background: rgba(14, 24, 24, 0.7);
		font-size: 22px;
		line-height: 1;
	}
	.close {
		top: -14px;
		right: -14px;
		z-index: 1;
	}
	.arrow {
		top: calc(50% - 40px);
	}
	.prev {
		left: 10px;
	}
	.next {
		right: 10px;
	}
	.close:hover,
	.arrow:hover {
		border-color: rgba(232, 239, 238, 0.7);
	}
	:focus-visible {
		outline: 2px solid rgba(232, 239, 238, 0.85);
		outline-offset: 3px;
	}

	@media (prefers-reduced-motion: reduce) {
		.hero img,
		.gallery img {
			transition: none;
		}
	}
</style>
