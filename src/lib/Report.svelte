<script lang="ts">
	type HazardReport = {
		address: string;
		hazard: string;
		platform: string;
		details: string;
	};

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

		onSubmit({ address, hazard: finalHazard, platform: finalPlatform, details });

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
			<option>Uber</option>
			<option>DoorDash</option>
			<option>Lyft</option>
			<option>Grubhub</option>
			<option> Instacart</option>
			<option>Other</option>
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
