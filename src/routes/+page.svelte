<script lang="ts">
	import AICheckIn from '$lib/AICheckin.svelte';
	import Contacts from '$lib/Contacts.svelte';
	import logo from '$lib/assets/beacon-logo.png';
	import Login from '$lib/Login.svelte';
	import Report from '$lib/Report.svelte';
	import ReportList from '$lib/ReportList.svelte';
	import type { HazardReport } from '$lib/report';
	import SosButton from '$lib/SosButton.svelte';

	let { data }: import('./$types').PageProps = $props();
	type Tab = 'overview' | 'contacts' | 'reports' | 'map';
	const tabs: { id: Tab; label: string }[] = [
		{ id: 'overview', label: 'Overview' },
		{ id: 'contacts', label: 'Contacts' },
		{ id: 'reports', label: 'Reports' },
		{ id: 'map', label: 'Map' }
	];
	let activeTab = $state<Tab>('overview');
	let reports = $state<HazardReport[]>([]);
	let mapModule = $state.raw<Promise<typeof import('$lib/Map.svelte')> | undefined>();

	function loadMap() {
		// Load the map on its first click, then keep it so switching tabs does not reset it.
		mapModule = import('$lib/Map.svelte');
	}
	function addReport(report: HazardReport) {
		reports.push(report);
	}
	function selectTab(index: number, tabList?: HTMLElement) {
		activeTab = tabs[index].id;
		if (activeTab === 'map' && !mapModule) loadMap();
		tabList?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[index]?.focus();
	}
	function handleTabKeydown(event: KeyboardEvent, index: number) {
		let next: number;
		if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tabs.length;
		else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
			next = (index - 1 + tabs.length) % tabs.length;
		else if (event.key === 'Home') next = 0;
		else if (event.key === 'End') next = tabs.length - 1;
		else return;
		event.preventDefault();
		selectTab(next, (event.currentTarget as HTMLElement).parentElement ?? undefined);
	}
</script>

{#if !data.user}
	<main class="flex min-h-[100dvh] items-center justify-center px-4 py-8"><Login /></main>
{:else}
	<main class="min-h-[100dvh] bg-[#f8f7f3] px-4 py-5 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-6xl">
			<header
				class="border-b border-[#d8dce7] pb-5 lg:flex lg:items-end lg:justify-between lg:gap-5"
			>
				<div class="flex items-center gap-3">
					<div class="beacon-mark"><img src={logo} alt="Beacon" class="h-10 w-10" /></div>
					<div>
						<h1 class="text-xl font-semibold tracking-tight text-[#172033]">Beacon safety hub</h1>
						<p class="mt-0.5 text-sm text-[#586174]">Safety tools for every stop on the road.</p>
					</div>
				</div>
				<nav class="mt-5 lg:mt-0" aria-label="Safety hub sections">
					<div
						class="flex rounded-full bg-[#e9edf8] p-1 lg:inline-flex"
						role="tablist"
						aria-label="Safety hub views"
					>
						{#each tabs as tab, index (tab.id)}
							<button
								role="tab"
								id={`${tab.id}-tab`}
								aria-selected={activeTab === tab.id}
								aria-controls={`${tab.id}-panel`}
								tabindex={activeTab === tab.id ? 0 : -1}
								onclick={() => selectTab(index)}
								onkeydown={(event) => handleTabKeydown(event, index)}
								class={[
									'min-h-11 flex-1 rounded-full px-2 py-2 text-sm font-medium whitespace-nowrap transition sm:px-5',
									activeTab === tab.id
										? 'bg-white text-[#1238dd] shadow-sm'
										: 'text-[#4d596e] hover:text-[#1238dd]'
								]}
							>
								{tab.label}
							</button>
						{/each}
					</div>
				</nav>
			</header>
			<div
				class="pt-6"
				role="tabpanel"
				id="overview-panel"
				aria-labelledby="overview-tab"
				hidden={activeTab !== 'overview'}
				tabindex="0"
			>
				<div class="grid items-start gap-5 lg:grid-cols-[minmax(16rem,0.65fr)_minmax(0,1.35fr)]">
					<SosButton />
					<AICheckIn {reports} onReport={addReport} />
				</div>
			</div>
			<div
				class="pt-6"
				role="tabpanel"
				id="contacts-panel"
				aria-labelledby="contacts-tab"
				hidden={activeTab !== 'contacts'}
				tabindex="0"
			>
				<Contacts />
			</div>
			<div
				class="pt-6"
				role="tabpanel"
				id="reports-panel"
				aria-labelledby="reports-tab"
				hidden={activeTab !== 'reports'}
				tabindex="0"
			>
				<div class="grid gap-5 lg:grid-cols-[minmax(20rem,0.85fr)_minmax(0,1.15fr)]">
					<Report onSubmit={addReport} /><ReportList {reports} />
				</div>
			</div>
			<div
				class="pt-6"
				role="tabpanel"
				id="map-panel"
				aria-labelledby="map-tab"
				hidden={activeTab !== 'map'}
				tabindex="0"
			>
				{#if mapModule}
					<svelte:boundary>
						{#await mapModule}
							<p class="py-6 text-sm text-[#586174]" role="status">Loading map...</p>
						{:then { default: Map }}
							<Map {reports} active={activeTab === 'map'} />
						{:catch}
							<div class="rounded-2xl border border-[#d8dce7] bg-white p-5 sm:p-6">
								<p class="text-sm text-[#b4232d]" role="alert">
									The map could not load. Check your connection and try again.
								</p>
								<button
									type="button"
									class="mt-4 min-h-11 rounded-xl bg-[#1238dd] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0f2fb8]"
									onclick={loadMap}>Retry map download</button
								>
							</div>
						{/await}
						{#snippet failed(error, reset)}
							<div class="rounded-2xl border border-[#d8dce7] bg-white p-5 sm:p-6">
								<p class="text-sm text-[#b4232d]" role="alert">
									{error instanceof Error && /webgl/i.test(error.message)
										? 'Your browser could not start WebGL. Enable hardware acceleration or try another browser.'
										: 'The map could not start. Check your connection and try again.'}
								</p>
								<button
									type="button"
									class="mt-4 min-h-11 rounded-xl bg-[#1238dd] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0f2fb8]"
									onclick={reset}>Retry map</button
								>
							</div>
						{/snippet}
					</svelte:boundary>
				{/if}
			</div>
		</div>
	</main>
{/if}
