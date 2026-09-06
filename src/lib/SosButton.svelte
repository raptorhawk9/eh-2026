<script lang="ts">
    function confirmSOS() {
        confirm("SOS message sent, police notified");
    }
</script>

<div class="w-full flex items-center justify-center">
	<div class="w-full border border-white p-4 bg-neutral-900">
		<button class="w-full bg-red-700 p-4 text-2xl hover:cursor-pointer" onclick={confirmSOS}>SOS</button>
	</div>
</div>
