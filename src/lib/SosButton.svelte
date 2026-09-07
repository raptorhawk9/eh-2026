<script lang="ts">
	function confirmSOS() {
		confirm('SOS message sent, police notified');
	}
</script>

<section
	class="rounded-2xl border border-[#f1c7ca] bg-[#fffafa] p-5 shadow-[0_8px_24px_rgba(77,35,40,0.06)]"
>
	<h2 class="text-lg font-semibold text-[#172033]">Need urgent help?</h2>
	<p class="mt-1 text-sm leading-6 text-[#5d5360]">
		Send an SOS alert to your contacts and notify police.
	</p>
	<button
		class="mt-5 w-full rounded-xl bg-[#b4232d] px-5 py-3 text-base font-semibold text-white transition hover:bg-[#951d26] active:translate-y-px"
		onclick={confirmSOS}>Send SOS</button
	>
</section>
