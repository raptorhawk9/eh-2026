<script lang="ts">
	let props = $props();
</script>

<div class="flex min-w-1/3 flex-col justify-center gap-4">
	<h1 class="text-6xl text-white">Login</h1>
	<form class="flex flex-col justify-center gap-4" method="POST">
		<label class="text-white" for="username">Username</label>
		<input id="username" type="text" />
        <label class="text-white" for="password">Password</label>
		<input id="password" type="password" />
        <button class="text-white border-white border hover:cursor-pointer">Submit</button>
	</form>
</div>
