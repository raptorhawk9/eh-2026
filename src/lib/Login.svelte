<script lang="ts">
	import { enhance } from '$app/forms';
	import logo from '$lib/assets/beacon-logo.png';
</script>

<section
	class="w-full max-w-md rounded-2xl border border-[#d8dce7] bg-white p-6 shadow-[0_16px_40px_rgba(30,42,67,0.10)] sm:p-8"
>
	<div class="flex items-center gap-3">
		<div class="login-mark"><img src={logo} alt="Beacon" class="h-11 w-11" /></div>
		<div>
			<h1 class="text-2xl font-semibold tracking-tight text-[#172033]">Welcome to Beacon</h1>
			<p class="mt-0.5 text-sm text-[#586174]">Sign in to access your safety hub.</p>
		</div>
	</div>
	<form method="POST" action="?/login" use:enhance class="mt-7 grid gap-4">
		<label class="grid gap-1.5 text-sm font-medium text-[#28344a]" for="username"
			>Username<input
				id="username"
				class="rounded-xl border-[#c8cfdd] px-3 py-2.5 text-[#172033]"
				name="username"
				type="text"
				autocomplete="username"
				required
			/></label
		><label class="grid gap-1.5 text-sm font-medium text-[#28344a]" for="password"
			>Password<input
				id="password"
				class="rounded-xl border-[#c8cfdd] px-3 py-2.5 text-[#172033]"
				name="password"
				type="password"
				autocomplete="current-password"
				required
			/></label
		><button
			class="mt-2 rounded-xl bg-[#1238dd] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f2fb8] active:translate-y-px"
			type="submit">Sign in</button
		>
	</form>
</section>

<style>
	@media (prefers-reduced-motion: no-preference) {
		.login-mark {
			animation: settle-in 500ms ease-out both;
		}
	}
	@keyframes settle-in {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
