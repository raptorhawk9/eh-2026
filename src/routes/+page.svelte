<script lang="ts">
	import Login from '$lib/Login.svelte';
	import SosButton from '$lib/SosButton.svelte';
	import Map from '$lib/Map.svelte';
	import CheckIn from '$lib/CheckIn.svelte';
	import Report from '$lib/Report.svelte';
	import Contacts from '$lib/Contacts.svelte';
	import ReportList from '$lib/ReportList.svelte';
	/** @type {import('./$types').PageProps} */
	let { data } = $props();

	type HazardReport = {
		address: string;
		hazard: string;
		platform: string;
		details: string;
	};

	let reports = $state<HazardReport[]>([]);

	function addReport(report: HazardReport) {
		reports.push(report);
	}
</script>

{#if !data.user}
	<div class="flex h-screen w-screen flex-col items-center justify-center">
		<Login />
	</div>
{:else}
	<div class="h-screen w-screen text-white">
		<div class="p-4 flex flex-col gap-4">
			<SosButton />
			<Contacts/>
			<CheckIn />
			<Map />

<div class="flex gap-4">
				<Report onSubmit={addReport} />
				<ReportList {reports} />
			</div>
		</div>
	</div>
{/if}
