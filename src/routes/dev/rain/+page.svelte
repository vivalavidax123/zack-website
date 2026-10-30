<script lang="ts">
	import { defaultConfig, type RainConfig, type SceneName } from '#lib/rain/index.js';
	import { useRain } from '#lib/rain-handle.svelte.js';

	const rain = useRain();

	let rainAmount = $state(defaultConfig.rainAmount);
	let dropSize = $state(defaultConfig.dropSize);
	let mist = $state(defaultConfig.mist);
	let streaks = $state(defaultConfig.streaks);
	let refraction = $state(defaultConfig.refraction);
	let brightness = $state(defaultConfig.brightness);
	let warmth = $state(0);
	let scene = $state<SceneName | 'image'>('dusk-forest');
	let imageUrl = $state('');
	let reducedMotion = $state<'auto' | 'on' | 'off'>('auto');
	const stats = $derived(rain.stats);
	let open = $state(true);

	const config = $derived<Partial<RainConfig>>({
		rainAmount,
		dropSize,
		mist,
		streaks,
		refraction,
		brightness,
		tint: [0.96 + warmth * 0.1, 1.0, 1.02 - warmth * 0.1],
		background:
			scene === 'image' && imageUrl
				? { kind: 'image', src: imageUrl }
				: { kind: 'scene', scene: scene === 'image' ? 'dusk-forest' : scene },
		reducedMotion: reducedMotion === 'auto' ? 'auto' : reducedMotion === 'on'
	});

	$effect(() => {
		rain.controller?.setConfig(config);
	});

	// Leave the glass as we found it when navigating away.
	$effect(() => {
		const controller = rain.controller;
		return () => controller?.setConfig(defaultConfig);
	});

	const sliders = [
		{
			label: 'Rain on glass',
			get: () => rainAmount,
			set: (v: number) => (rainAmount = v),
			min: 0,
			max: 1.5,
			step: 0.05
		},
		{
			label: 'Drop size',
			get: () => dropSize,
			set: (v: number) => (dropSize = v),
			min: 0.5,
			max: 1.8,
			step: 0.05
		},
		{ label: 'Mist', get: () => mist, set: (v: number) => (mist = v), min: 0, max: 1, step: 0.05 },
		{
			label: 'Falling rain',
			get: () => streaks,
			set: (v: number) => (streaks = v),
			min: 0,
			max: 1.5,
			step: 0.05
		},
		{
			label: 'Lens strength',
			get: () => refraction,
			set: (v: number) => (refraction = v),
			min: 0,
			max: 0.5,
			step: 0.01
		},
		{
			label: 'Brightness',
			get: () => brightness,
			set: (v: number) => (brightness = v),
			min: 0.4,
			max: 1.4,
			step: 0.02
		},
		{
			label: 'Warmth',
			get: () => warmth,
			set: (v: number) => (warmth = v),
			min: -1,
			max: 1,
			step: 0.05
		}
	];
</script>

<svelte:head>
	<title>Rain lab</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<aside class="panel" class:closed={!open}>
	<header>
		<h1>Rain lab</h1>
		<button type="button" onclick={() => (open = !open)} aria-expanded={open}>
			{open ? 'Hide' : 'Show'}
		</button>
	</header>

	{#if stats}
		<p class="stats">
			<strong>{stats.fps.toFixed(0)}</strong> fps · {stats.frameMs.toFixed(2)} ms JS · {stats.drops} drops
			{#if !stats.webgl}· no WebGL{/if}
			{#if stats.reducedMotion}· reduced motion{/if}
		</p>
	{/if}

	{#if open}
		{#each sliders as s (s.label)}
			<label>
				<span>{s.label} <output>{s.get().toFixed(2)}</output></span>
				<input
					type="range"
					min={s.min}
					max={s.max}
					step={s.step}
					value={s.get()}
					oninput={(e) => s.set(Number(e.currentTarget.value))}
				/>
			</label>
		{/each}

		<label>
			<span>Scene</span>
			<select bind:value={scene}>
				<option value="dusk-forest">Misty forest</option>
				<option value="city-night">City at night</option>
				<option value="image">Photo…</option>
			</select>
		</label>
		{#if scene === 'image'}
			<label>
				<span>Photo URL (put files in /static/backgrounds)</span>
				<input type="text" placeholder="/backgrounds/my-photo.jpg" bind:value={imageUrl} />
			</label>
		{/if}

		<label>
			<span>Reduced motion</span>
			<select bind:value={reducedMotion}>
				<option value="auto">Follow system</option>
				<option value="on">On (still drops)</option>
				<option value="off">Off</option>
			</select>
		</label>
	{/if}
</aside>

<style>
	.panel {
		position: fixed;
		top: 16px;
		right: 16px;
		width: min(300px, calc(100vw - 32px));
		max-height: calc(100vh - 32px);
		overflow: auto;
		box-sizing: border-box;
		padding: 14px 16px;
		border-radius: 14px;
		background: rgba(20, 32, 32, 0.35);
		border: 1px solid rgba(255, 255, 255, 0.14);
		backdrop-filter: blur(18px) saturate(1.2);
		-webkit-backdrop-filter: blur(18px) saturate(1.2);
		font:
			13px/1.4 system-ui,
			sans-serif;
		z-index: 1;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	h1 {
		margin: 0;
		font:
			italic 18px Georgia,
			serif;
	}
	button,
	select,
	input[type='text'] {
		font: inherit;
		color: inherit;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 8px;
		padding: 4px 8px;
	}
	select option {
		color: #111;
	}
	.stats {
		margin: 8px 0 4px;
		color: var(--ink-soft);
		font-variant-numeric: tabular-nums;
	}
	label {
		display: grid;
		gap: 4px;
		margin-top: 10px;
	}
	label span {
		display: flex;
		justify-content: space-between;
		color: var(--ink-soft);
	}
	input[type='range'] {
		width: 100%;
		accent-color: #cfe0dc;
	}
</style>
