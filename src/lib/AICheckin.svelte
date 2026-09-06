<script lang="ts">
	import { onDestroy } from 'svelte';
	import { platforms, type HazardReport } from '$lib/report';

	let {
		reports,
		onReport
	}: {
		reports: HazardReport[];
		onReport: (report: HazardReport) => void;
	} = $props();

	let address = $state('');
	let platform = $state('');
	let duration = $state<number | undefined>();
	let checkinAt = $state('');
	let time = $state(0);
	let isActive = $state(false);
	let showPrompt = $state(false);
	let details = $state('');
	let draft = $state<HazardReport | null>(null);
	let warning = $state<string | null>(null);
	let error = $state('');
	let isDrafting = $state(false);
	let timer: ReturnType<typeof setInterval> | undefined;

	function stopTimer() {
		if (timer) clearInterval(timer);
		timer = undefined;
	}

	function startSession() {
		if (!address.trim() || !platform || !duration || duration <= 0) return;
		stopTimer();
		warning = null;
		checkinAt = new Date().toISOString();
		time = duration * 60;
		isActive = true;
		timer = setInterval(() => {
			if (time <= 1) {
				stopTimer();
				isActive = false;
				showPrompt = true;
				time = 0;
				return;
			}
			time -= 1;
		}, 1000);
		void checkNearbyReports(address.trim());
	}

	async function checkNearbyReports(startAddress: string) {
		try {
			const response = await fetch('/api/ai/proximity', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ address: startAddress, reports })
			});
			const result = (await response.json()) as { warning?: string | null };
			if (isActive) warning = result.warning ?? null;
		} catch {
			warning = null;
		}
	}

	function completeSafe() {
		stopTimer();
		isActive = false;
		time = 0;
		showPrompt = true;
	}

	function skipPrompt() {
		showPrompt = false;
		details = '';
		draft = null;
		error = '';
	}

	async function submitNote() {
		if (!details.trim()) return;
		isDrafting = true;
		error = '';
		try {
			const response = await fetch('/api/ai/draft-report', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ address, details, platform, checkinAt })
			});
			const result = (await response.json()) as { draft?: HazardReport; error?: string };
			if (!response.ok || !result.draft) throw new Error(result.error || 'Unable to draft report.');
			draft = result.draft;
		} catch (caught) {
			error = caught instanceof Error ? caught.message : 'Unable to draft report.';
		} finally {
			isDrafting = false;
		}
	}

	function confirmDraft() {
		if (!draft) return;
		onReport({ ...draft, loggedAt: new Date().toISOString() });
		skipPrompt();
	}

	onDestroy(stopTimer);
</script>

<div class="flex w-full flex-col items-center border border-white p-4">
	{#if !isActive && !showPrompt}
		<form class="flex w-full flex-col gap-4" onsubmit={(event) => { event.preventDefault(); startSession(); }}>
			<h2 class="text-2xl">AI check-in</h2>
			<div class="flex flex-wrap gap-4">
				<input class="min-w-0 flex-1 text-black" placeholder="Start address" bind:value={address} required />
				<select class="w-52 text-black" bind:value={platform} required>
					<option value="">Platform</option>
					{#each platforms as option (option)}
						<option value={option}>{option}</option>
					{/each}
				</select>
				<input class="w-44 text-black" placeholder="Duration (minutes)" type="number" min="1" bind:value={duration} required />
			</div>
			<button class="border border-white p-2" type="submit">Start session</button>
		</form>
	{:else if isActive}
		<div class="flex w-full flex-col gap-3">
			<div>Address: {address}</div>
			<div>Platform: {platform}</div>
			<div>Check-in started: {new Date(checkinAt).toLocaleString()}</div>
			<div class="text-2xl">{Math.trunc(time / 60)}:{String(time % 60).padStart(2, '0')}</div>
			{#if warning}
				<div class="border border-amber-300 bg-amber-950 p-3 text-amber-100">Warning: {warning}</div>
			{/if}
			<button class="border border-white bg-green-700 p-2" type="button" onclick={completeSafe}>I'm safe</button>
		</div>
	{:else}
		<div class="flex w-full flex-col gap-3">
			<h2 class="text-2xl">Anything worth flagging about this stop?</h2>
			{#if !draft}
				<textarea class="text-black" rows="4" placeholder="Optional note" bind:value={details}></textarea>
				<div class="flex gap-3">
					<button class="border border-white p-2" type="button" onclick={skipPrompt}>Skip</button>
					<button class="border border-white p-2" type="button" onclick={submitNote} disabled={isDrafting}>
						{isDrafting ? 'Drafting...' : 'Submit'}
					</button>
				</div>
			{:else}
				<div class="border border-amber-300 p-3">
					<p class="text-sm text-amber-200">AI draft. Review it before publishing.</p>
					<p class="text-sm">Platform: {draft.platform}</p>
					<p class="mt-2">{draft.hazard}</p>
					<p>{draft.details}</p>
				</div>
				<div class="flex gap-3">
					<button class="border border-white p-2" type="button" onclick={skipPrompt}>Discard</button>
					<button class="border border-white bg-green-700 p-2" type="button" onclick={confirmDraft}>Confirm report</button>
				</div>
			{/if}
			{#if error}<p class="text-red-300">{error}</p>{/if}
		</div>
	{/if}
</div>