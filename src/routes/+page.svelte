<script lang="ts">
	import Login from '$lib/Login.svelte';
	let loggedIn = $state(false);
</script>

{#if !loggedIn}
	<div class="flex h-screen w-screen flex-col items-center justify-center bg-neutral-900">
		<Login onSubmit={() => (loggedIn = true)} />
	</div>
{:else}
	<div class="h-screen w-screen text-white bg-neutral-900">Main Dashboar</div>
{/if}
