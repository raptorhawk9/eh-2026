<script lang="ts">
	type Contact = {
		name: String;
		phone_number: String;
	};

	let contacts: Contact[] = $state([]);

	function addContact() {
		contacts.push({ name: '', phone_number: '' });
	}

	function removeContact(contact: Contact) {
		contacts.splice(contacts.indexOf(contact), 1);
	}
</script>

<div
	class="flex w-full flex-col items-center justify-center gap-4 border border-white p-4 align-middle"
>
	<div class="w-fit flex flex-col items-center justify-center gap-4">
		<div class="flex flex-col items-center justify-center">
			<h1 class="text-2xl">Contacts</h1>
			<p>Each contact will receive a message if an SOS event occurs</p>
		</div>
		<button class="w-full bg-green-700 p-1 text-xl hover:cursor-pointer" onclick={addContact}
			>Add</button
		>
		{#if contacts.length === 0}
			<div>No contacts! Add one using the button</div>
		{/if}
		{#each contacts as contact}
			<li class="flex flex-row gap-4 text-black">
				<input placeholder="Name" bind:value={contact.name} />
				<input placeholder="Phone Number" bind:value={contact.phone_number} />
				<button
					class="bg-red-700 p-4 text-white hover:cursor-pointer"
					onclick={() => removeContact(contact)}>Remove</button
				>
			</li>
			{#if contact.name === '' || contact.phone_number === ''}
				<div class="text-red-700">One or more fields are empty!</div>
			{/if}
		{/each}
	</div>
</div>
