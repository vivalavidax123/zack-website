<script lang="ts">
	import { page } from '$app/state';
	import ComingSoon from '#lib/components/ComingSoon.svelte';
</script>

{#if page.status === 404}
	<ComingSoon
		title="Nothing here"
		line="This page slid off the glass. Let's go back to the window."
	/>
{:else}
	<ComingSoon
		title="Something went wrong"
		line="The rain got in somewhere. Try again in a moment."
	/>
{/if}
