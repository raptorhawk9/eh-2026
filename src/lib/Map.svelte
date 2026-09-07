<script module lang="ts">
	import * as maplibregl from 'maplibre-gl';
	import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
	maplibregl.setWorkerUrl(maplibreWorkerUrl);
</script>

<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { MapLibre, Marker, Popup } from 'svelte-maplibre';
	import { formatReportDate, type HazardReport } from '$lib/report';
	import 'maplibre-gl/dist/maplibre-gl.css';

	let { reports, active = true }: { reports: HazardReport[]; active?: boolean } = $props();
	const MAPTILER_KEY = 'jbMPRAK1hF0YCqzyaIjN';
	const uid = $props.id();
	type Coordinates = [number, number];
	type LocationState =
		{ status: 'loading' | 'missing' | 'error' } | { status: 'ready'; coordinates: Coordinates };
	type AddressGroup = { key: string; address: string; reports: HazardReport[] };
	type ReportMarker = AddressGroup & { coordinates: Coordinates };

	let address = $state('');
	let center = $state<Coordinates>([-122.1506732, 47.6888944]);
	let zoom = $state(12);
	let map = $state.raw<maplibregl.Map>();
	const locations = new SvelteMap<string, LocationState>();
	let selectedKey = $state<string | null>(null);
	let isSearching = $state(false);
	let searchError = $state('');
	let searchNotice = $state('');
	let mapError = $state(false);
	let markerTrigger: HTMLButtonElement | undefined;
	let hasChosenView = false;
	let destroyed = false;
	const lifetime = new AbortController();
	const cache = new SvelteMap<string, Promise<Coordinates | null>>();
	const lookups = new SvelteMap<string, Promise<Coordinates | null>>();
	let requestQueue: Promise<void> = Promise.resolve();
	let lastRequestAt = 0;

	function addressKey(value: string) {
		// Extra spaces and different capitals should still count as the same address.
		return value.trim().replace(/\s+/g, ' ').toLowerCase();
	}

	let addressGroups = $derived.by(() => {
		const groups = new SvelteMap<string, AddressGroup>();
		for (const report of reports) {
			const key = addressKey(report.address);
			const group = groups.get(key);
			if (group) group.reports.push(report);
			else groups.set(key, { key, address: report.address.trim(), reports: [report] });
		}
		return [...groups.values()];
	});
	let markers = $derived.by(() => {
		// Some different addresses point to the same spot. Keep their reports in one marker.
		const groups = new SvelteMap<string, ReportMarker>();
		for (const group of addressGroups) {
			const location = locations.get(group.key);
			if (location?.status !== 'ready') continue;
			const key = location.coordinates.join(',');
			const existing = groups.get(key);
			if (existing) existing.reports.push(...group.reports);
			else
				groups.set(key, {
					...group,
					key,
					coordinates: location.coordinates,
					reports: [...group.reports]
				});
		}
		return [...groups.values()];
	});
	let pendingCount = $derived(
		addressGroups.filter(
			(group) => !locations.has(group.key) || locations.get(group.key)?.status === 'loading'
		).length
	);
	let unmapped = $derived(
		addressGroups.filter(
			(group) =>
				locations.get(group.key)?.status === 'error' ||
				locations.get(group.key)?.status === 'missing'
		)
	);
	let mappedCount = $derived(addressGroups.length - pendingCount - unmapped.length);
	let selectedMarker = $derived(markers.find((marker) => marker.key === selectedKey));

	function waitForRequestSlot() {
		return new Promise<void>((resolve, reject) => {
			if (lifetime.signal.aborted) {
				reject(new Error('Map closed'));
				return;
			}
			const timer = setTimeout(
				() => {
					lifetime.signal.removeEventListener('abort', abort);
					resolve();
				},
				Math.max(0, lastRequestAt + 1100 - Date.now())
			);
			function abort() {
				clearTimeout(timer);
				reject(new Error('Map closed'));
			}
			lifetime.signal.addEventListener('abort', abort, { once: true });
		});
	}

	function geocode(query: string): Promise<Coordinates | null> {
		const key = addressKey(query);
		const cached = cache.get(key);
		if (cached) return cached;
		if (!key) return Promise.resolve(null);
		// Both kinds of lookup wait here so we never send more than one request per second.
		const request = requestQueue.then(async () => {
			await waitForRequestSlot();
			if (lifetime.signal.aborted) throw new Error('Map closed');
			lastRequestAt = Date.now();
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), 15000);
			try {
				const response = await fetch(
					`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query.trim())}&limit=1`,
					{ signal: AbortSignal.any([lifetime.signal, controller.signal]) }
				);
				if (!response.ok) throw new Error('Geocoding unavailable');
				const results = await response.json();
				if (!Array.isArray(results)) throw new Error('Invalid geocoding response');
				if (!results.length) return null;
				const lng = Number.parseFloat(results[0]?.lon);
				const lat = Number.parseFloat(results[0]?.lat);
				if (
					!Number.isFinite(lng) ||
					!Number.isFinite(lat) ||
					Math.abs(lng) > 180 ||
					Math.abs(lat) > 90
				)
					throw new Error('Invalid coordinates');
				return [lng, lat] as Coordinates;
			} finally {
				clearTimeout(timeout);
			}
		});
		cache.set(key, request);
		requestQueue = request.then(
			() => {},
			() => {}
		);
		void request.catch(() => {
			// Save good results, but let failed requests be tried again.
			if (cache.get(key) === request) cache.delete(key);
		});
		return request;
	}

	function locateReport(group: AddressGroup) {
		if (locations.has(group.key)) return;
		locations.set(group.key, { status: 'loading' });
		const request = geocode(group.address);
		lookups.set(group.key, request);
		void request.then(
			(coordinates) => {
				if (destroyed || lookups.get(group.key) !== request) return;
				locations.set(
					group.key,
					coordinates ? { status: 'ready', coordinates } : { status: 'missing' }
				);
			},
			() => {
				if (destroyed || lookups.get(group.key) !== request) return;
				locations.set(group.key, { status: 'error' });
			}
		);
	}

	// Start browser lookups when the map UI mounts or its report addresses change.
	function locateReportAddresses(groups: AddressGroup[]) {
		return () => {
			untrack(() => {
				for (const group of groups) locateReport(group);
			});
		};
	}

	function retryUnmapped() {
		if (pendingCount) return;
		for (const group of unmapped) {
			cache.delete(group.key);
			locations.delete(group.key);
			locateReport(group);
		}
	}

	function fitReports(currentMap: maplibregl.Map, points: ReportMarker[]) {
		if (!points.length) return;
		const bounds = new maplibregl.LngLatBounds(points[0].coordinates, points[0].coordinates);
		for (const point of points) bounds.extend(point.coordinates);
		currentMap.fitBounds(bounds, { padding: 55, maxZoom: 15, duration: 0 });
	}

	function syncViewport(
		visible: boolean,
		currentMap: maplibregl.Map | undefined,
		points: ReportMarker[],
		pending: number
	) {
		return () => {
			if (!visible || !currentMap) return;
			const frame = requestAnimationFrame(() => {
				// Resize after a hidden panel is revealed before fitting any initial results.
				currentMap.resize();
				if (points.length && pending === 0 && !hasChosenView) {
					hasChosenView = true;
					fitReports(currentMap, points);
				}
			});
			return () => cancelAnimationFrame(frame);
		};
	}

	function showAllReports() {
		if (!map) return;
		hasChosenView = true;
		selectedKey = null;
		fitReports(map, markers);
	}

	async function search() {
		if (isSearching) return;
		const query = address.trim();
		if (!query) {
			searchError = 'Enter a location to search.';
			return;
		}
		isSearching = true;
		hasChosenView = true;
		searchError = '';
		searchNotice = '';
		try {
			const coordinates = await geocode(query);
			// Ignore the old result if the user changed the search while it was loading.
			if (destroyed || addressKey(address) !== addressKey(query)) return;
			if (!coordinates) {
				searchError = 'No location found. Try a more specific address.';
				return;
			}
			selectedKey = null;
			center = coordinates;
			zoom = 15;
			searchNotice = `Map centered on ${query}. Search does not add a marker.`;
		} catch {
			if (!destroyed && addressKey(address) === addressKey(query))
				searchError = 'We could not search for that location. Please try again.';
		} finally {
			if (!destroyed) isSearching = false;
		}
	}

	function openReports(marker: ReportMarker, event: MouseEvent) {
		event.stopPropagation();
		markerTrigger = event.currentTarget as HTMLButtonElement;
		hasChosenView = true;
		selectedKey = marker.key;
		map?.easeTo({ center: marker.coordinates, offset: [0, 100], duration: 0 });
	}
	function closeReports() {
		selectedKey = null;
		if (markerTrigger?.isConnected && markerTrigger.getClientRects().length) markerTrigger.focus();
	}
	function focusPopup(element: HTMLDivElement) {
		const frame = requestAnimationFrame(() => {
			if (element.getClientRects().length) element.focus();
		});
		return () => cancelAnimationFrame(frame);
	}

	onDestroy(() => {
		destroyed = true;
		lifetime.abort();
	});
</script>

<section
	class="report-map rounded-2xl border border-[#d8dce7] bg-white p-5 shadow-[0_8px_24px_rgba(30,42,67,0.05)] sm:p-6"
	aria-labelledby={`${uid}-heading`}
	{@attach locateReportAddresses(addressGroups)}
	{@attach syncViewport(active, map, markers, pendingCount)}
>
	<h2 id={`${uid}-heading`} class="text-xl font-semibold tracking-tight text-[#172033]">
		Report map
	</h2>
	<p class="mt-1 text-sm leading-6 text-[#586174]">
		Markers show submitted reports. Search an address to move the map, then select a marker to read
		its reports.
	</p>
	<p class="mt-1 text-xs leading-5 text-[#586174]">
		Report and search addresses are sent to OpenStreetMap's geocoding service. Locations are
		approximate; missing markers do not mean an area is safe.
	</p>
	<form
		class="mt-5 flex flex-col gap-3 sm:flex-row"
		onsubmit={(event) => {
			event.preventDefault();
			void search();
		}}
	>
		<label class="sr-only" for={`${uid}-search`}>Location</label>
		<input
			id={`${uid}-search`}
			class="min-w-0 flex-1 rounded-xl border-[#c8cfdd] px-3 py-2.5 text-[#172033]"
			placeholder="Street address or place"
			bind:value={address}
			oninput={() => {
				searchError = '';
				searchNotice = '';
			}}
		/>
		<button
			class="rounded-xl bg-[#1238dd] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f2fb8] active:translate-y-px disabled:cursor-wait disabled:opacity-70"
			type="submit"
			disabled={isSearching}>{isSearching ? 'Searching…' : 'Search'}</button
		>
	</form>
	{#if searchError}<p class="mt-2 text-sm font-medium text-[#b4232d]" role="alert">
			{searchError}
		</p>{/if}
	<p class="mt-2 text-sm text-[#586174]" role="status">
		{isSearching
			? 'Finding your location. Searches and report lookups run one at a time.'
			: searchNotice}
	</p>
	<div class="mt-4 flex flex-wrap items-center justify-between gap-3">
		<p class="text-sm text-[#586174]" role="status">
			{#if !reports.length}No reports yet. Submit a report to add a marker.
			{:else if pendingCount}Mapping {pendingCount} report {pendingCount === 1
					? 'address'
					: 'addresses'}...
			{:else}{mappedCount} of {addressGroups.length} report {addressGroups.length === 1
					? 'address'
					: 'addresses'} mapped.{/if}
		</p>
		<button
			type="button"
			class="min-h-11 rounded-xl border border-[#c8cfdd] px-4 py-2 text-sm font-semibold text-[#28344a] hover:bg-[#edf1ff] disabled:cursor-not-allowed disabled:opacity-60"
			disabled={!markers.length || !map}
			onclick={showAllReports}>Show all reports</button
		>
	</div>
	{#if unmapped.length}
		<div class="mt-4 rounded-xl bg-[#fff5df] p-4 text-sm text-[#754510]">
			<h3 class="font-semibold">Reports not shown on the map</h3>
			<ul class="mt-2 space-y-2">
				{#each unmapped as group (group.key)}<li class="break-words">
						<strong>{group.address || 'Missing address'}:</strong>
						{locations.get(group.key)?.status === 'missing'
							? 'No location found. A more specific address may be needed.'
							: 'Location lookup unavailable. Try again.'}
					</li>{/each}
			</ul>
			<button
				type="button"
				class="mt-3 min-h-11 rounded-xl border border-[#754510] px-3 py-2 font-semibold hover:bg-[#ffebc2] disabled:cursor-wait disabled:opacity-60"
				disabled={pendingCount > 0}
				onclick={retryUnmapped}>Retry unmapped locations</button
			>
		</div>
	{/if}
	{#if mapError}<p class="mt-3 text-sm text-[#b4232d]" role="alert">
			Some map tiles could not load. Check your connection or try reloading the page. Your reports
			are still available in Reports.
		</p>{/if}
	<div class="mt-5 overflow-hidden rounded-xl border border-[#d8dce7]">
		<MapLibre
			bind:map
			bind:center
			bind:zoom
			class="h-96 w-full sm:h-[28rem]"
			standardControls
			style={`https://api.maptiler.com/maps/streets-v4/style.json?key=${MAPTILER_KEY}`}
			onerror={() => (mapError = true)}
			onload={() => (mapError = false)}
		>
			{#each markers as marker (marker.key)}
				<Marker lngLat={marker.coordinates}>
					<button
						type="button"
						class="report-marker"
						aria-label={`View ${marker.reports.length} ${marker.reports.length === 1 ? 'report' : 'reports'} at ${marker.address}`}
						aria-haspopup="dialog"
						aria-expanded={selectedKey === marker.key}
						aria-controls={selectedKey === marker.key ? `${uid}-report-details` : undefined}
						onclick={(event) => openReports(marker, event)}>{marker.reports.length}</button
					>
				</Marker>
			{/each}
			{#if selectedMarker}
				<Popup
					lngLat={selectedMarker.coordinates}
					openOn="manual"
					open
					closeButton={false}
					closeOnClickOutside={false}
					focusAfterOpen={false}
					anchor="bottom"
					offset={26}
					maxWidth="min(320px, calc(100vw - 64px))"
					popupClass="beacon-report-popup"
				>
					<div
						id={`${uid}-report-details`}
						class="report-details"
						role="dialog"
						aria-label={`Reports at ${selectedMarker.address}`}
						tabindex="-1"
						{@attach focusPopup}
						onkeydown={(event) => {
							if (event.key === 'Escape') {
								event.preventDefault();
								event.stopPropagation();
								closeReports();
							}
						}}
					>
						<div class="flex items-start justify-between gap-3">
							<h3 class="text-base font-semibold text-[#172033]">Report details</h3>
							<button type="button" class="close-reports" onclick={closeReports}
								>Close report details</button
							>
						</div>
						<ul class="mt-2 divide-y divide-[#e5e8f0]">
							{#each selectedMarker.reports as report (report)}
								<li class="py-3 break-words">
									<p class="font-semibold text-[#172033]">{report.address}</p>
									<p class="mt-1 font-medium text-[#b4232d]">{report.hazard}</p>
									<p class="mt-1 text-[#586174]">Platform: {report.platform}</p>
									<p class="mt-2 whitespace-pre-wrap text-[#28344a]">
										{report.details || 'No additional details.'}
									</p>
									<p class="mt-2 text-xs text-[#586174]">
										Logged: <time datetime={report.loggedAt}
											>{formatReportDate(report.loggedAt)}</time
										>
									</p>
								</li>
							{/each}
						</ul>
					</div>
				</Popup>
			{/if}
		</MapLibre>
	</div>
</section>

<style>
	.report-map {
		min-width: 0;
	}
	.report-marker {
		display: grid;
		place-items: center;
		min-width: 44px;
		height: 44px;
		padding: 6px;
		border: 2px solid white;
		border-radius: 50%;
		background: #b4232d;
		color: white;
		font-family: 'Geist', system-ui, sans-serif;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		box-shadow: 0 3px 8px rgb(30 42 67 / 20%);
	}
	.report-marker:hover {
		background: #8f1c25;
	}
	.report-details {
		max-height: 260px;
		overflow-y: auto;
		padding: 4px;
		font-family: 'Geist', system-ui, sans-serif;
		font-size: 0.875rem;
		line-height: 1.5;
	}
	.close-reports {
		min-height: 44px;
		padding: 4px 8px;
		border-radius: 8px;
		font-size: 0.75rem;
		font-weight: 600;
		color: #1238dd;
		background: #edf1ff;
		cursor: pointer;
	}
	.close-reports:hover {
		background: #dde5ff;
	}
	.report-map :global(.beacon-report-popup .maplibregl-popup-content) {
		border-radius: 12px;
		padding: 12px;
		box-shadow: 0 8px 24px rgb(30 42 67 / 16%);
	}
</style>
