<script lang="ts">
	import Login from '$lib/Login.svelte';
	import SosButton from '$lib/SosButton.svelte';
	import CheckIn from '$lib/CheckIn.svelte';
	import { Check } from 'drizzle-orm/gel-core';
	import Contacts from '$lib/Contacts.svelte';
	/** @type {import('./$types').PageProps} */
	let { data } = $props();
</script>

{#if !data.user}
	<div class="flex h-screen w-screen flex-col items-center justify-center">
		<Login />
	</div>
{:else}
	<div class="h-screen w-screen text-white">
		<div class="p-4 flex flex-col gap-4"><SosButton /><Contacts/><CheckIn /></div>
	</div>
{/if}
