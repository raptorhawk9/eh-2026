<script lang="ts">
	import { formatReportDate, type HazardReport } from '$lib/report';

	let { reports }: { reports: HazardReport[] } = $props();
</script>

<div class="min-w-0 flex-[2] border border-white p-4 text-white">
	<h2 class="text-3xl">Report List</h2>

	{#if reports.length === 0}
		<p class="mt-4">No reports yet.</p>
	{/if}

	{#each reports as report (report.loggedAt)}
		<div class="mt-4 border border-white p-4">
			<h3 class="text-xl">{report.address}</h3>
			<p>Hazard: {report.hazard}</p>
			<p>Platform: {report.platform}</p>
			<p>Check-in: {formatReportDate(report.checkinAt)}</p>
			<p>Logged: {formatReportDate(report.loggedAt)}</p>
			<p>Details: {report.details}</p>
		</div>
	{/each}
</div>
