<script lang="ts">
	type Contact = { name: string; phone_number: string };
	let contacts = $state<Contact[]>([]);
	function addContact() {
		contacts.push({ name: '', phone_number: '' });
	}
	function removeContact(contact: Contact) {
		contacts.splice(contacts.indexOf(contact), 1);
	}
</script>

<section
	class="rounded-2xl border border-[#d8dce7] bg-white p-5 shadow-[0_8px_24px_rgba(30,42,67,0.05)] sm:p-6"
>
	<div
		class="flex flex-col gap-4 border-b border-[#e5e8f0] pb-5 sm:flex-row sm:items-start sm:justify-between"
	>
		<div>
			<h2 class="text-xl font-semibold tracking-tight text-[#172033]">Emergency contacts</h2>
			<p class="mt-1 max-w-xl text-sm leading-6 text-[#586174]">
				Each contact will receive a message if an SOS event occurs.
			</p>
		</div>
		<button
			class="rounded-xl bg-[#1238dd] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f2fb8] active:translate-y-px"
			onclick={addContact}>Add contact</button
		>
	</div>
	{#if contacts.length === 0}
		<div class="py-12 text-center">
			<p class="font-medium text-[#28344a]">No emergency contacts yet</p>
			<p class="mt-1 text-sm text-[#667085]">Add someone you trust before you need help.</p>
		</div>
	{:else}
		<ul class="divide-y divide-[#e5e8f0]">
			{#each contacts as contact (contact)}
				<li class="grid gap-3 py-5 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
					<label class="grid gap-1.5 text-sm font-medium text-[#28344a]"
						>Name<input
							class="rounded-xl border-[#c8cfdd] px-3 py-2.5 text-[#172033]"
							bind:value={contact.name}
							autocomplete="name"
						/></label
					><label class="grid gap-1.5 text-sm font-medium text-[#28344a]"
						>Phone number<input
							class="rounded-xl border-[#c8cfdd] px-3 py-2.5 text-[#172033]"
							bind:value={contact.phone_number}
							autocomplete="tel"
							type="tel"
						/></label
					><button
						class="rounded-xl border border-[#e5a6aa] px-4 py-2.5 text-sm font-semibold text-[#b4232d] transition hover:bg-[#fff1f1] active:translate-y-px"
						onclick={() => removeContact(contact)}>Remove</button
					>{#if !contact.name.trim() || !contact.phone_number.trim()}<p
							class="text-sm text-[#b4232d] lg:col-span-3"
						>
							Add a name and phone number for this contact.
						</p>{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>
