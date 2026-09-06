<script lang="ts">
    function confirmSOS() {
        confirm("SOS Message Sent");
    }
</script>

<div class="fixed top-6 right-6 z-50 flex items-center justify-center">
	<div class="border border-white p-4 bg-neutral-900">
		<button class="bg-red-700 p-4 text-2xl hover:cursor-pointer" onclick={confirmSOS}>SOS</button>
	</div>
</div>
