<script lang="ts">
	let address = $state('');
	let hazard = $state('');
	let otherHazard = $state('');
	let platform = $state('');
	let otherPlatform = $state('');
	let details = $state('');
	let submitted = $state(false);
</script>

<div class="flex flex-col gap-4 p-8 text-white">
	
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
		onclick={() => submitted = true}
	>
		Submit Report
	</button>

	{#if submitted}
		<h2 class="text-xl">Your report</h2>
		<p>Address: {address}</p>
		<p>Hazard: {hazard === 'Other' ? otherHazard : hazard}</p>
		<p>Platform: {platform === 'Other' ? otherPlatform : platform}</p>
		<p>Details: {details}</p>
		<p>Not saved yet.</p>
	{/if}
</div>