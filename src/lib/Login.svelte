<script lang="ts">
	let props = $props();
	const onSubmit = () => {
		props.onSubmit?.();
	};
</script>

<div class="flex min-w-1/3 flex-col justify-center gap-4">
<div class="min-h min-w border border-white p-8 flex flex-col gap-4">
	<h1 class="text-6xl text-white">Login</h1>
	<form class="flex flex-col justify-center gap-4" method="POST" onsubmit={onSubmit}>
		<label class="text-white" for="username">Username</label>
		<input id="username" name="username" type="text" />
		<label class="text-white" for="password">Password</label>
		<input id="password" name="username" type="password" />
		<button class="border border-white text-white font-semibold py-1.5 hover:cursor-pointer" type="submit">Submit</button
		>
	</form>
    </div>
</div>
