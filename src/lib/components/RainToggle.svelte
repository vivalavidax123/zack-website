<script lang="ts">
	import { onMount } from 'svelte';
	import { rainSound } from '#lib/audio/rain-sound.js';

	let on = $state(false);

	// The rain starts with the first click or key press: browsers allow no
	// sound before that. Visitors who turned it off keep it off.
	onMount(() => {
		if (!rainSound.wanted()) return;
		on = true;
		const begin = () => {
			if (on) void rainSound.start();
		};
		window.addEventListener('pointerdown', begin, { once: true });
		window.addEventListener('keydown', begin, { once: true });
		return () => {
			window.removeEventListener('pointerdown', begin);
			window.removeEventListener('keydown', begin);
		};
	});

	function toggle() {
		on = !on;
		if (on) void rainSound.start();
		else rainSound.stop();
	}
</script>

<button type="button" class="toggle" aria-pressed={on} onclick={toggle}>
	<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
		<path d="M12 3c-3 4.2-5 7.2-5 9.8a5 5 0 0 0 10 0C17 10.2 15 7.2 12 3z" />
		{#if !on}<line x1="4" y1="4" x2="20" y2="20" />{/if}
	</svg>
	<span>Rain sound</span>
</button>

<style>
	.toggle {
		position: fixed;
		left: clamp(16px, 4vw, 48px);
		bottom: clamp(16px, 4vh, 40px);
		z-index: 2;
		display: flex;
		align-items: center;
		gap: 7px;
		padding: 7px 14px;
		font:
			13px system-ui,
			sans-serif;
		color: var(--ink-soft);
		background: rgba(14, 24, 24, 0.45);
		border: 1px solid rgba(232, 239, 238, 0.22);
		border-radius: 999px;
		backdrop-filter: blur(6px);
		cursor: pointer;
		transition:
			color 0.2s ease,
			border-color 0.2s ease;
	}
	.toggle:hover,
	.toggle[aria-pressed='true'] {
		color: var(--ink);
		border-color: rgba(232, 239, 238, 0.55);
	}
	.toggle:focus-visible {
		outline: 2px solid rgba(232, 239, 238, 0.85);
		outline-offset: 3px;
	}
	svg {
		fill: none;
		stroke: currentColor;
		stroke-width: 1.6;
		stroke-linecap: round;
	}
	[aria-pressed='true'] svg path {
		fill: currentColor;
		fill-opacity: 0.35;
	}
</style>
