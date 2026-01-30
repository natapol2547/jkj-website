<script lang="ts">
	import type { LayoutProps } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { firestore, auth, user, storage, analytics } from '$lib/firebase.svelte.js';
	import { signOut } from '$lib/auth';
	import FirebaseApp from '$lib/components/FirebaseApp.svelte';
	import {
		Search,
		FolderKanban,
		Settings,
		LogOut,
		Zap,
		ChevronLeft,
		ChevronRight,
		Home,
		History,
		Bookmark,
		HelpCircle,
		Bell
	} from '@lucide/svelte';
	import { fade, fly } from 'svelte/transition';

	let { data, children }: LayoutProps = $props();

	// Redirect if not signed in
	$effect(() => {
		if (!data.userID) {
			goto('/login');
		}
	});

	let sidebarOpen = $state(true);
	let mobileMenuOpen = $state(false);

	const navItems = [
		{ href: '/app', icon: Search, label: 'Search', exact: true },
		{ href: '/app/projects', icon: FolderKanban, label: 'Projects' },
		// { href: '/app/saved', icon: Bookmark, label: 'Saved Leads' },
		{ href: '/app/history', icon: History, label: 'History' }
	];

	const bottomNavItems = [
		{ href: '/app/settings', icon: Settings, label: 'Settings' },
		// { href: '/app/help', icon: HelpCircle, label: 'Help & Support' }
	];

	function isActive(href: string, exact: boolean = false) {
		if (exact) {
			return $page.url.pathname === href;
		}
		return $page.url.pathname.startsWith(href);
	}

	async function handleSignOut() {
		await signOut(auth);
		goto('/');
	}
</script>

<FirebaseApp {firestore} {auth} {storage} {analytics}>
<div class="flex h-screen bg-[#0f0f0f]" data-theme="jsj-dark">
	<!-- Sidebar -->
	<aside
		class="hidden lg:flex flex-col border-r border-slate-800/50 bg-[#0a0a0a] transition-all duration-300 {sidebarOpen ? 'w-64' : 'w-20'}"
	>
		<!-- Logo -->
		<div class="flex h-16 items-center justify-between border-b border-slate-800/50 px-4">
			<a href="/app" class="flex items-center gap-3">
				<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-violet-600 to-purple-700">
					<Zap class="h-5 w-5 text-white" />
				</div>
				{#if sidebarOpen}
					<span class="text-lg font-bold text-white">Operetta</span>
				{/if}
			</a>
		</div>

		<!-- Navigation -->
		<nav class="flex-1 overflow-y-auto p-3">
			<ul class="space-y-1">
				{#each navItems as item}
					<li>
						<a
							href={item.href}
							class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all
								{isActive(item.href, item.exact) 
									? 'bg-violet-600/20 text-violet-400' 
									: 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}"
							title={!sidebarOpen ? item.label : undefined}
						>
							<item.icon class="h-5 w-5 shrink-0" />
							{#if sidebarOpen}
								<span>{item.label}</span>
							{/if}
						</a>
					</li>
				{/each}
			</ul>

			<!-- Divider -->
			<div class="my-4 border-t border-slate-800/50"></div>

			<ul class="space-y-1">
				{#each bottomNavItems as item}
					<li>
						<a
							href={item.href}
							class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all
								{isActive(item.href) 
									? 'bg-violet-600/20 text-violet-400' 
									: 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}"
							title={!sidebarOpen ? item.label : undefined}
						>
							<item.icon class="h-5 w-5 shrink-0" />
							{#if sidebarOpen}
								<span>{item.label}</span>
							{/if}
						</a>
					</li>
				{/each}
			</ul>
		</nav>

		<!-- User Section -->
		<div class="border-t border-slate-800/50 p-3">
			{#if user.current}
				<div class="flex items-center gap-3 rounded-xl px-3 py-2 {sidebarOpen ? '' : 'justify-center'}">
					<div class="h-9 w-9 shrink-0 overflow-hidden rounded-full ring-2 ring-slate-700">
						<img
							src={user.current.photoURL}
							alt="Profile"
							class="h-full w-full object-cover"
						/>
					</div>
					{#if sidebarOpen}
						<div class="flex-1 min-w-0">
							<p class="text-sm font-medium text-white truncate">
								{user.current.displayName || 'User'}
							</p>
							<p class="text-xs text-slate-500 truncate">
								{user.current.email}
							</p>
						</div>
						<button
							onclick={handleSignOut}
							class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
							title="Sign out"
						>
							<LogOut class="h-4 w-4" />
						</button>
					{/if}
				</div>
			{/if}
		</div>
	</aside>

	<!-- Main Content -->
	<div class="flex flex-1 flex-col overflow-hidden">
		<!-- Top Navbar (Mobile & Desktop) -->
		<header class="flex h-16 items-center justify-between border-b border-slate-800/50 bg-[#0a0a0a] px-2 lg:px-3 gap-2">
			<!-- Mobile Menu Button -->
            <div class="flex items-center gap-2">
			<button
				onclick={() => mobileMenuOpen = !mobileMenuOpen}
				class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white lg:hidden"
				aria-label="Toggle mobile menu"
			>
				<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
				</svg>
			</button>

			<!-- Mobile Logo -->
			<a href="/app" class="flex items-center gap-2 lg:hidden">
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-violet-600 to-purple-700">
					<Zap class="h-4 w-4 text-white" />
				</div>
				<span class="text-lg font-bold text-white">Operetta</span>
			</a>
            </div>

			<!-- Credits / Subscription Status -->
			<button
                onclick={() => sidebarOpen = !sidebarOpen}
                class="hidden lg:block rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            >
                {#if sidebarOpen}
                    <ChevronLeft class="h-5 w-5" />
                {:else}
                    <ChevronRight class="h-5 w-5" />
                {/if}
            </button>
			<div class="hidden items-center gap-2 rounded-full bg-slate-800/50 px-4 py-1.5 lg:flex">
				<div class="h-2 w-2 rounded-full bg-emerald-500"></div>
				<span class="text-sm text-slate-300"><span class="font-semibold text-white">45</span> / 50 credits</span>
			</div>

			<!-- Spacer for desktop -->
			<div class="hidden flex-1 lg:block"></div>

			<!-- Right Actions -->
			<div class="flex items-center gap-2">
				<!-- Notifications -->
				<button class="relative rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white">
					<Bell class="h-5 w-5" />
					<span class="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-violet-500"></span>
				</button>

				<!-- Mobile User Avatar -->
				{#if user.current}
					<div class="lg:hidden">
						<div class="dropdown dropdown-end">
							<button class="h-9 w-9 overflow-hidden rounded-full ring-2 ring-slate-700">
								<img
									src={user.current.photoURL}
									alt="Profile"
									class="h-full w-full object-cover"
								/>
							</button>
							<ul class="dropdown-content menu z-50 mt-2 w-52 rounded-xl border border-slate-700 bg-slate-800 p-2 shadow-xl">
								<li>
									<a href="/app/settings" class="text-slate-300 hover:bg-slate-700 hover:text-white">
										<Settings class="h-4 w-4" />
										Settings
									</a>
								</li>
								<li>
									<button onclick={handleSignOut} class="text-red-400 hover:bg-red-500/20">
										<LogOut class="h-4 w-4" />
										Sign Out
									</button>
								</li>
							</ul>
						</div>
					</div>
				{/if}

				<!-- Upgrade Button -->
				<a
					href="/app/upgrade"
					class="hidden items-center gap-2 rounded-full bg-linear-to-r from-violet-600 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-violet-500/20 transition-all hover:shadow-xl hover:shadow-violet-500/30 md:flex"
				>
					<Zap class="h-4 w-4" />
					Upgrade
				</a>
			</div>
		</header>

		<!-- Mobile Navigation Drawer -->
		{#if mobileMenuOpen}
			<div class="fixed inset-0 z-50 lg:hidden" transition:fade={{duration:150}}>
				<!-- Backdrop -->
				<button
					class="absolute inset-0 bg-black/60 backdrop-blur-sm"
					onclick={() => mobileMenuOpen = false}
					aria-label="Close mobile menu"
				></button>

				<!-- Drawer -->
				<div class="absolute left-0 top-0 h-full w-72 bg-[#0a0a0a] p-4">
					<!-- Close Button -->
					<div class="flex items-center justify-between mb-6">
						<a href="/app" class="flex items-center gap-2">
							<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-violet-600 to-purple-700">
								<Zap class="h-5 w-5 text-white" />
							</div>
							<span class="text-lg font-bold text-white">Operetta</span>
						</a>
						<button
							onclick={() => mobileMenuOpen = false}
							class="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
							aria-label="Close menu"
						>
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>

					<!-- Navigation Links -->
					<nav class="space-y-1">
						{#each navItems as item}
							<a
								href={item.href}
								onclick={() => mobileMenuOpen = false}
								class="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all
									{isActive(item.href, item.exact) 
										? 'bg-violet-600/20 text-violet-400' 
										: 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}"
							>
								<item.icon class="h-5 w-5" />
								<span>{item.label}</span>
							</a>
						{/each}
					</nav>

					<div class="my-4 border-t border-slate-800/50"></div>

					<nav class="space-y-1">
						{#each bottomNavItems as item}
							<a
								href={item.href}
								onclick={() => mobileMenuOpen = false}
								class="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all text-slate-400 hover:bg-slate-800/50 hover:text-white"
							>
								<item.icon class="h-5 w-5" />
								<span>{item.label}</span>
							</a>
						{/each}
					</nav>
				</div>
			</div>
		{/if}

		<!-- Page Content -->
		<main class="flex-1 overflow-y-auto">
			{@render children()}
		</main>
	</div>
</div>
</FirebaseApp>