<script lang="ts">
	import { platforms, type HazardReport } from '$lib/report';

	let { onSubmit }: { onSubmit: (report: HazardReport) => void } = $props();

	let address = $state('');
	let hazard = $state('');
	let otherHazard = $state('');
	let platform = $state('');
	let otherPlatform = $state('');
	let details = $state('');

	function submitReport() {
		if (address === '' || hazard === '' || platform === '') {
		alert('Please fill in the address, hazard, and platform');
		return;
}
		let finalHazard = hazard;
		if (hazard === 'Other') finalHazard = otherHazard;

		let finalPlatform = platform;
		if (platform === 'Other') finalPlatform = otherPlatform;

		const loggedAt = new Date().toISOString();
		onSubmit({ address, hazard: finalHazard, platform: finalPlatform, details, checkinAt: loggedAt, loggedAt });

		address = '';
		hazard = '';
		otherHazard = '';
		platform = '';
		otherPlatform = '';
		details = '';
	}
</script>

<div class="min-w-0 flex-[1] border border-white p-4">
	<div class="flex w-full flex-col gap-4 p-4 text-white">
		
		<h1 class="text-3xl">Report Hazard</h1>

		<label for="address">Address</label>
		<input id="address" class="text-black" bind:value={address} />

		<label for="hazard">Hazard</label>
		<select id="hazard" class="text-black" bind:value={hazard}>
			<option value="">Choose a hazard</option>
			<option>Poor lighting</option>
			<option>Aggressive animal</option>
			<option>Hostile customer</option>
			<option>Prior Incident</option>
			<option>Suspicious activity</option>
			<option>Unsafe road conditions</option>
			<option>Other</option>
		</select>
		{#if hazard === 'Other'}
			<label for="other-hazard">Describe the hazard</label>
			<input
				id="other-hazard"
				class="text-black"
				bind:value={otherHazard}
				placeholder="Enter the hazard type"
			/>
		{/if}

		<label for="platform">Platform</label>
		<select id="platform" class="text-black" bind:value={platform}>
			<option value="">Choose a platform</option>
			{#each platforms as option (option)}
				<option value={option}>{option}</option>
			{/each}
		</select>
		{#if platform === 'Other'}
			<label for="other-platform">Enter the platform</label>
			<input
				id="other-platform"
				class="text-black"
				bind:value={otherPlatform}
				placeholder="Enter the platform name"
			/>
		{/if}
		<p class="text-sm text-neutral-300">Check-in date and time are added automatically when this report is submitted.</p>

		<label for="details">Details</label>
		<textarea
			id="details"
			class="text-black"
			bind:value={details}
			rows="4"
		></textarea>

		<button
			type="button"
			class="border border-white p-2 hover:cursor-pointer"
			onclick={submitReport}
		>
			Submit Report
		</button>
	</div>
</div>
