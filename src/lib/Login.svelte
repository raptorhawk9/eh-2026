<script lang="ts">
	import { enhance } from '$app/forms';
</script>

<div class="flex min-w-1/3 flex-col justify-center gap-4">
	<div class="min-h min-w flex flex-col gap-4 border border-white p-8">
		<h1 class="text-6xl text-white">Login</h1>
		<form method="POST" action="?/login" use:enhance class="flex flex-col gap-4">
			<label class="text-white" for="username">Username</label>
			<input id="username" name="username" type="text" />
			<label class="text-white" for="password">Password</label>
			<input id="password" name="password" type="password" />
			<button
				class="border border-white py-1.5 font-semibold text-white hover:cursor-pointer"
				type="submit">Submit</button
			>
		</form>
	</div>
</div>
