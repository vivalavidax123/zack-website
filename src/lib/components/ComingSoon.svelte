<script lang="ts">
	let { title, line }: { title: string; line: string } = $props();
</script>

<svelte:head>
	<title>{title} · Zeming Xia</title>
</svelte:head>

<main>
	<h1>{title}</h1>
	<p>{line}</p>
	<a href="/">Back to the window</a>
</main>

<style>
	main {
		position: fixed;
		inset: 0;
		display: grid;
		place-content: center;
		justify-items: center;
		gap: 8px;
		padding: 16px;
		text-align: center;
	}
	h1 {
		margin: 0;
		font-weight: 400;
		font-size: clamp(30px, 5vw, 48px);
		text-shadow: 0 2px 18px rgba(0, 0, 0, 0.5);
	}
	p {
		margin: 0;
		font-style: italic;
		color: var(--ink-soft);
		text-shadow: 0 1px 10px rgba(0, 0, 0, 0.5);
	}
	a {
		margin-top: 16px;
		padding: 8px 16px;
		border-radius: 999px;
		color: var(--ink);
		text-decoration: none;
		font:
			14px system-ui,
			sans-serif;
		background: rgba(20, 32, 32, 0.35);
		border: 1px solid rgba(255, 255, 255, 0.16);
		backdrop-filter: blur(14px);
	}
	a:focus-visible {
		outline: 2px solid rgba(232, 239, 238, 0.85);
		outline-offset: 4px;
	}
</style>
