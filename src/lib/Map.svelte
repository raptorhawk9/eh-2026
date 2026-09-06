<script module lang="ts">
	import * as maplibregl from 'maplibre-gl';
	import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

	maplibregl.setWorkerUrl(maplibreWorkerUrl);
</script>

<script lang="ts">
	import { MapLibre, Marker, Popup } from 'svelte-maplibre';
	import 'maplibre-gl/dist/maplibre-gl.css';
	const MAPTILER_KEY = 'jbMPRAK1hF0YCqzyaIjN';

	let address = $state('');
	let foundLocation: { lat: number; lng: number } | null = $state(null);
	let isHovering = $state(false);

	async function search() {
		const response = await fetch(
			`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
		);
		const results = await response.json();

		if (results.length > 0) {
			foundLocation = {
				lat: parseFloat(results[0].lat),
				lng: parseFloat(results[0].lon)
			};
		}
	}
</script>

<div class="max-w-2xl mx-auto p-4">
	<div class="flex items-center gap-3 mb-4">
<input
		type="text"
		placeholder="Search location..."
		bind:value={address}
		class="flex-1 rounded border px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
		onkeydown={(e) => e.key === 'Enter' && search()}
	/>
		<button
			onclick={search}
			class="rounded bg-blue-600 px-4 py-2 text-white hover:opacity-90 transition-opacity"
		>
			Search
		</button>
	</div>

	<div class="rounded-lg overflow-hidden shadow-lg border">
		<MapLibre
			center={[foundLocation?.lng ?? -122.1506732, foundLocation?.lat ?? 47.6888944]}
			zoom={foundLocation ? 15 : 16}
			class="h-64 w-full"
			standardControls
			style={`https://api.maptiler.com/maps/streets-v4/style.json?key=${MAPTILER_KEY}`}
		>
			{#if foundLocation}
				<Marker
					lngLat={[foundLocation.lng, foundLocation.lat]}
					onmouseenter={() => (isHovering = true)}
					onmouseleave={() => (isHovering = false)}
				>
					<div class="h-5 w-5 rounded-full border-2 border-white bg-red-600 shadow" aria-label="Selected location"></div>
					{#if isHovering}
						<Popup>
							<span class="text-black">{foundLocation.lat.toFixed(4)}, {foundLocation.lng.toFixed(4)}</span>
						</Popup>
					{/if}
				</Marker>
			{/if}
		</MapLibre>
	</div>
</div>
