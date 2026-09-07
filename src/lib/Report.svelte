<script lang="ts">
	import { platforms, type HazardReport } from '$lib/report';

	let { onSubmit }: { onSubmit: (report: HazardReport) => void } = $props();
	let address = $state('');
	let hazard = $state('');
	let otherHazard = $state('');
	let platform = $state('');
	let otherPlatform = $state('');
	let details = $state('');
	let error = $state('');
	function submitReport() {
		const finalHazard = hazard === 'Other' ? otherHazard.trim() : hazard;
		const finalPlatform = platform === 'Other' ? otherPlatform.trim() : platform;
		if (!address.trim() || !finalHazard || !finalPlatform) {
			error = 'Enter an address, hazard, and platform before submitting.';
			return;
		}
		error = '';
		const loggedAt = new Date().toISOString();
		onSubmit({
			address: address.trim(),
			hazard: finalHazard,
			platform: finalPlatform,
			details: details.trim(),
			checkinAt: loggedAt,
			loggedAt
		});
		address = '';
		hazard = '';
		otherHazard = '';
		platform = '';
		otherPlatform = '';
		details = '';
	}
</script>

<section
	class="rounded-2xl border border-[#d8dce7] bg-white p-5 shadow-[0_8px_24px_rgba(30,42,67,0.05)] sm:p-6"
>
	<h2 class="text-xl font-semibold tracking-tight text-[#172033]">Report a hazard</h2>
	<p class="mt-1 text-sm leading-6 text-[#586174]">Share details to help keep the road safer.</p>
	<form
		class="mt-5 grid gap-4"
		onsubmit={(event) => {
			event.preventDefault();
			submitReport();
		}}
	>
		<label class="grid gap-1.5 text-sm font-medium text-[#28344a]"
			>Address<input
				class="rounded-xl border-[#c8cfdd] px-3 py-2.5 text-[#172033]"
				bind:value={address}
			/></label
		><label class="grid gap-1.5 text-sm font-medium text-[#28344a]"
			>Hazard<select
				class="rounded-xl border-[#c8cfdd] px-3 py-2.5 text-[#172033]"
				bind:value={hazard}
				><option value="">Choose a hazard</option><option>Poor lighting</option><option
					>Aggressive animal</option
				><option>Hostile customer</option><option>Prior incident</option><option
					>Suspicious activity</option
				><option>Unsafe road conditions</option><option>Other</option></select
			></label
		>{#if hazard === 'Other'}<label class="grid gap-1.5 text-sm font-medium text-[#28344a]"
				>Describe the hazard<input
					class="rounded-xl border-[#c8cfdd] px-3 py-2.5 text-[#172033]"
					bind:value={otherHazard}
				/></label
			>{/if}<label class="grid gap-1.5 text-sm font-medium text-[#28344a]"
			>Platform<select
				class="rounded-xl border-[#c8cfdd] px-3 py-2.5 text-[#172033]"
				bind:value={platform}
				><option value="">Choose a platform</option>{#each platforms as option (option)}<option
						value={option}>{option}</option
					>{/each}</select
			></label
		>{#if platform === 'Other'}<label class="grid gap-1.5 text-sm font-medium text-[#28344a]"
				>Enter the platform<input
					class="rounded-xl border-[#c8cfdd] px-3 py-2.5 text-[#172033]"
					bind:value={otherPlatform}
				/></label
			>{/if}<label class="grid gap-1.5 text-sm font-medium text-[#28344a]"
			>Details <span class="font-normal text-[#667085]">(optional)</span><textarea
				class="rounded-xl border-[#c8cfdd] px-3 py-2.5 text-[#172033]"
				bind:value={details}
				rows="4"></textarea></label
		>{#if error}<p class="text-sm font-medium text-[#b4232d]" role="alert">{error}</p>{/if}<button
			class="rounded-xl bg-[#1238dd] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f2fb8] active:translate-y-px"
			type="submit">Submit report</button
		>
		<p class="text-xs leading-5 text-[#586174]">
			For manual reports, the check-in and logged times are set when you submit.
		</p>
	</form>
</section>
