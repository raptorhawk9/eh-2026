<script lang="ts">
	import { onDestroy } from 'svelte';
	let isActive = $state(false);
	let duration = $state<number | undefined>();
	let time = $state(0);
	let address = $state('');
	let activeAddress = $state('');
	let error = $state('');
	let timer: ReturnType<typeof setInterval> | undefined;
	function clearTimer() {
		if (timer) {
			clearInterval(timer);
			timer = undefined;
		}
	}
	function startSession() {
		error = '';
		if (!address.trim() || !duration || duration <= 0) {
			error = 'Enter an address and a duration greater than zero.';
			return;
		}
		activeAddress = address.trim();
		time = Math.round(duration * 60);
		isActive = true;
		clearTimer();
		timer = setInterval(() => {
			if (time > 0) time -= 1;
			else {
				confirm('SOS sent, police notified');
				reset();
			}
		}, 1000);
	}
	function reset() {
		clearTimer();
		time = 0;
		duration = undefined;
		isActive = false;
		address = '';
		activeAddress = '';
		error = '';
	}
	function formatTime(seconds: number) {
		return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
	}
	onDestroy(clearTimer);
</script>

<section
	class="rounded-2xl border border-[#d8dce7] bg-white p-5 shadow-[0_8px_24px_rgba(30,42,67,0.05)]"
>
	<h2 class="text-lg font-semibold text-[#172033]">Safety check-in</h2>
	<p class="mt-1 text-sm leading-6 text-[#586174]">
		Set a timer and we will prompt an SOS when it ends.
	</p>
	{#if !isActive}
		<form
			class="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_8rem]"
			onsubmit={(event) => {
				event.preventDefault();
				startSession();
			}}
		>
			<label class="grid gap-1.5 text-sm font-medium text-[#28344a]"
				>Address<input
					class="rounded-xl border-[#c8cfdd] px-3 py-2.5 text-[#172033]"
					bind:value={address}
					autocomplete="street-address"
				/></label
			>
			<label class="grid gap-1.5 text-sm font-medium text-[#28344a]"
				>Duration (minutes)<input
					class="rounded-xl border-[#c8cfdd] px-3 py-2.5 text-[#172033]"
					type="number"
					min="1"
					bind:value={duration}
				/></label
			>
			{#if error}<p class="text-sm font-medium text-[#b4232d] lg:col-span-2" role="alert">
					{error}
				</p>{/if}
			<button
				class="rounded-xl border border-[#1238dd] px-4 py-2.5 text-sm font-semibold text-[#1238dd] transition hover:bg-[#edf1ff] active:translate-y-px lg:col-span-2"
				type="submit">Start check-in</button
			>
		</form>
	{:else}
		<div class="mt-5 rounded-xl bg-[#edf1ff] p-4">
			<p class="text-sm text-[#40506d]">Checking in from {activeAddress}</p>
			<p class="mt-1 text-3xl font-semibold tracking-tight text-[#1238dd] tabular-nums">
				{formatTime(time)}
			</p>
			<button
				class="mt-4 rounded-xl bg-[#1238dd] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f2fb8] active:translate-y-px"
				onclick={reset}>I'm safe</button
			>
		</div>
	{/if}
</section>
