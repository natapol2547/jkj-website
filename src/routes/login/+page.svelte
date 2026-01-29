<script lang="ts">
	import { goto } from '$app/navigation';
	import { signInWithGoogle } from '$lib/auth';
	import { auth, user } from '$lib/firebase.svelte';
	import { Zap, ArrowLeft, Loader2 } from '@lucide/svelte';

	let loading = $state(false);
	let error = $state<string | null>(null);

	// Redirect if already signed in
	$effect(() => {
		if (user.current) {
			goto('/');
		}
	});

	async function handleGoogleSignIn() {
		if (!auth) {
			error = 'Authentication is not available. Please refresh the page.';
			return;
		}

		loading = true;
		error = null;

		try {
			await signInWithGoogle(auth);
			// Redirect will happen automatically via the $effect above
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to sign in. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Sign In - Operetta</title>
	<meta name="description" content="Sign in to Operetta to start generating verified leads" />
</svelte:head>

<div class="min-h-screen bg-grid relative flex items-center justify-center px-4 py-12" data-theme="light">
	<!-- Background gradient overlay -->
	<div class="pointer-events-none absolute inset-0 bg-linear-to-br from-violet-50/50 via-transparent to-cyan-50/30"></div>

	<!-- Back to home link -->
	<a 
		href="/" 
		class="absolute top-6 left-6 flex items-center gap-2 text-slate-600 transition-colors hover:text-violet-600 md:top-8 md:left-8"
	>
		<ArrowLeft class="h-5 w-5" />
		<span class="text-sm font-medium">Back to home</span>
	</a>

	<!-- Login Card -->
	<div class="relative w-full max-w-md">
		<!-- Decorative background blur -->
		<div class="absolute -inset-4 bg-linear-to-r from-violet-600/10 via-purple-600/10 to-indigo-600/10 rounded-3xl blur-2xl"></div>

		<div class="relative rounded-3xl border border-slate-200/60 bg-white/90 backdrop-blur-sm p-8 shadow-xl shadow-slate-200/50 md:p-10">
			<!-- Logo and Header -->
			<div class="text-center mb-8">
				<div class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-violet-600 to-purple-700 mb-4 shadow-lg shadow-violet-200">
					<Zap class="h-7 w-7 text-white" />
				</div>
				<h1 class="font-serif text-3xl font-medium text-slate-900 mb-2">
					Welcome!
				</h1>
				<p class="text-slate-600">
					Sign in to start generating verified leads
				</p>
			</div>

			<!-- Error Message -->
			{#if error}
				<div 
					class="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700"
					role="alert"
				>
					{error}
				</div>
			{/if}

			<!-- Google Sign In Button -->
			<button
				onclick={handleGoogleSignIn}
				disabled={loading}
				class="w-full group relative flex items-center justify-center gap-3 rounded-full bg-white border-2 border-slate-200 px-6 py-4 text-base font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{#if loading}
					<Loader2 class="h-5 w-5 animate-spin text-slate-600" />
					<span>Signing in...</span>
				{:else}
					<!-- Google Logo SVG -->
					<svg class="h-5 w-5" viewBox="0 0 24 24">
						<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
						<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
						<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
						<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
					</svg>
					<span>Continue with Google</span>
				{/if}
			</button>

			<!-- Divider -->
			<div class="my-8 flex items-center gap-4">
				<div class="flex-1 h-px bg-slate-200"></div>
				<span class="text-xs font-medium text-slate-500 uppercase tracking-wider">Secure</span>
				<div class="flex-1 h-px bg-slate-200"></div>
			</div>

			<!-- Features List -->
			<div class="space-y-3 text-sm text-slate-600">
				<div class="flex items-start gap-3">
					<div class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100">
						<svg class="h-3 w-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
						</svg>
					</div>
					<span>One-click sign in with your Google account</span>
				</div>
				<div class="flex items-start gap-3">
					<div class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100">
						<svg class="h-3 w-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
						</svg>
					</div>
					<span>No password required</span>
				</div>
				<div class="flex items-start gap-3">
					<div class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100">
						<svg class="h-3 w-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
						</svg>
					</div>
					<span>Start generating leads in under 5 minutes</span>
				</div>
			</div>

			<!-- Footer Text -->
			<p class="mt-8 text-center text-xs text-slate-500">
				By signing in, you agree to our{' '}
				<a href="#terms" class="text-violet-600 hover:text-violet-700 font-medium">Terms of Service</a>
				{' '}and{' '}
				<a href="#privacy" class="text-violet-600 hover:text-violet-700 font-medium">Privacy Policy</a>
			</p>
		</div>
	</div>
</div>
