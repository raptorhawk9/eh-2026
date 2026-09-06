<script lang="ts">
	let isActive = $state(false);
	let duration: Number | undefined = $state();
	let time = $state(0);
	let address: String | undefined = $state();

	function startSession() {
		if (duration != undefined && address != undefined) {
			time = Number(duration) * 60; // convert to seconds
			duration = undefined;
			isActive = true;
			countDown();
		}
	}

	function countDown() {
		const timer = setInterval(() => {
			if (time > 0 && isActive) {
				time -= 1;
			} else if (isActive) {
				confirm('SOS sent, police notified');
				reset();
				clearInterval(timer);
			} else {
				reset();
				clearInterval(timer);
			}
		}, 1000);

		return () => clearInterval(timer);
	}

	function reset() {
		time = 0;
		duration = undefined;
		isActive = false;
		address = undefined;
	}
</script>

<div class="align-center flex w-full flex-row items-center justify-center border border-white">
	<div class="flex flex-col items-center justify-center align-middle w-fit">
		{#if !isActive}
			<form class="flex w-full flex-col gap-4 p-4">
				<div class="flex flex-row items-center justify-center gap-4 align-middle">
					<input placeholder="Address" class="text-black" bind:value={address} />
					<input
						class="text-black"
						placeholder="Duration (minutes)"
						type="number"
						bind:value={duration}
					/>
				</div>
				<button
					class="border border-white p-1.5 text-white hover:cursor-pointer"
					onclick={startSession}>Start Session</button
				>
			</form>
		{:else}
			<div class="flex w-full flex-col gap-4 p-4">
				<div class="flex flex-row justify-center align-middle">Address: {address}</div>
				<div class="flex flex-row justify-center align-middle text-2xl">
					{Math.trunc(time / 60)}:{time % 60}
				</div>
				<button
					class="w-full border border-white bg-green-600 p-1 hover:cursor-pointer"
					onclick={reset}>I'm Safe</button
				>
			</div>
		{/if}
	</div>
</div>
