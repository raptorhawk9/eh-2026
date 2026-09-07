<script lang="ts">
	import { formatReportDate, type HazardReport } from '$lib/report';

	let { reports }: { reports: HazardReport[] } = $props();
</script>

<section
	class="rounded-2xl border border-[#d8dce7] bg-white p-5 shadow-[0_8px_24px_rgba(30,42,67,0.05)] sm:p-6"
>
	<h2 class="text-xl font-semibold tracking-tight text-[#172033]">Submitted reports</h2>
	<p class="mt-1 text-sm leading-6 text-[#586174]">
		Reports stay here during this page session. Reloading clears them.
	</p>
	{#if reports.length === 0}<div class="py-12 text-center">
			<p class="font-medium text-[#28344a]">No reports yet</p>
			<p class="mt-1 text-sm text-[#667085]">New hazard reports will appear here.</p>
		</div>{:else}<ul class="mt-5 divide-y divide-[#e5e8f0]">
			{#each reports as report (report)}<li class="py-4 break-words first:pt-0">
					<div class="flex flex-wrap items-baseline justify-between gap-2">
						<h3 class="font-semibold text-[#172033]">{report.address}</h3>
						<span class="rounded-full bg-[#edf1ff] px-2.5 py-1 text-xs font-medium text-[#1238dd]"
							>{report.platform}</span
						>
					</div>
					<p class="mt-2 text-sm font-medium text-[#28344a]">{report.hazard}</p>
					{#if report.details}<p class="mt-1 text-sm leading-6 text-[#586174]">
							{report.details}
						</p>{/if}
					<dl class="mt-3 grid gap-1 text-xs leading-5 text-[#586174]">
						<div>
							<dt class="inline font-medium">Check-in:</dt>
							<dd class="inline">
								<time datetime={report.checkinAt}>{formatReportDate(report.checkinAt)}</time>
							</dd>
						</div>
						<div>
							<dt class="inline font-medium">Logged:</dt>
							<dd class="inline">
								<time datetime={report.loggedAt}>{formatReportDate(report.loggedAt)}</time>
							</dd>
						</div>
					</dl>
				</li>{/each}
		</ul>{/if}
</section>
