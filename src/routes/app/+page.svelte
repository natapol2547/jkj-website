<script lang="ts">
	import type { PageProps } from './$types';
	import { fly, fade, slide } from 'svelte/transition';
	import {
		Search,
		Plus,
		Mic,
		Send,
		Building2,
		MapPin,
		Phone,
		Globe,
		Mail,
		ExternalLink,
		Sparkles,
		Bot,
		Clock,
		TrendingUp,
		Users,
		Briefcase,
		ChevronRight,
		X,
		History,
		Bookmark,
		Download
	} from '@lucide/svelte';

	let { data }: PageProps = $props();

	// State
	let searchQuery = $state('');
	let isSearching = $state(false);
	let hasSearched = $state(false);
	let currentQuery = $state('');

	// Mock data for demonstration
	let searchResults = $state<any[]>([]);
	let aiResponse = $state('');

	// Suggested searches
	const suggestedSearches = [
		'Find tech startups in Bangkok',
		'Hotels near Phuket beach',
		'Manufacturing companies in Rayong',
		'Restaurant suppliers in Chiang Mai',
		'Fintech companies in Thailand'
	];

	// Recent searches (mock)
	const recentSearches = [
		{ query: 'Software companies in Bangkok', time: '2 hours ago' },
		{ query: 'Hotels in Pattaya', time: 'Yesterday' },
		{ query: 'Food distributors Thailand', time: '3 days ago' }
	];

	// Mock company results
	const mockCompanies = [
		{
			name: 'TechVenture Bangkok Co., Ltd.',
			industry: 'Technology',
			location: 'Bangkok, Sukhumvit',
			employees: '50-200',
			website: 'techventure.co.th',
			phone: '+66 2 XXX XXXX',
			email: 'contact@techventure.co.th',
			description: 'Leading software development company specializing in enterprise solutions.',
			verified: true,
			score: 95
		},
		{
			name: 'Siam Digital Solutions',
			industry: 'Technology',
			location: 'Bangkok, Silom',
			employees: '20-50',
			website: 'siamdigital.com',
			phone: '+66 2 XXX XXXX',
			email: 'info@siamdigital.com',
			description: 'Full-service digital agency offering web development and marketing.',
			verified: true,
			score: 88
		},
		{
			name: 'InnovateTH',
			industry: 'Technology',
			location: 'Bangkok, Sathorn',
			employees: '100-500',
			website: 'innovateth.co',
			phone: '+66 2 XXX XXXX',
			email: 'hello@innovateth.co',
			description: 'Innovation hub connecting startups with enterprise clients.',
			verified: false,
			score: 82
		},
		{
			name: 'CloudFirst Thailand',
			industry: 'Cloud Services',
			location: 'Bangkok, Ratchada',
			employees: '50-100',
			website: 'cloudfirst.th',
			phone: '+66 2 XXX XXXX',
			email: 'sales@cloudfirst.th',
			description: 'Cloud infrastructure and managed services provider.',
			verified: true,
			score: 79
		},
		{
			name: 'DataDriven Co.',
			industry: 'Data Analytics',
			location: 'Bangkok, Phrom Phong',
			employees: '20-50',
			website: 'datadriven.co.th',
			phone: '+66 2 XXX XXXX',
			email: 'contact@datadriven.co.th',
			description: 'Business intelligence and data analytics consulting.',
			verified: true,
			score: 75
		}
	];

	const mockAiResponse = `Based on your search, I found <span class="text-violet-400 font-medium">15 technology companies</span> in Bangkok that match your criteria.

<span class="font-semibold text-white">Key Insights:</span>

• <span class="text-violet-400">TechVenture Bangkok</span> is the highest-rated company with a lead score of 95%, specializing in enterprise software solutions with 50-200 employees.

• The majority of tech companies are concentrated in <span class="text-cyan-400">Sukhumvit, Silom, and Sathorn</span> areas, which are Bangkok's main business districts.

• <span class="text-emerald-400">4 out of 5</span> top results have verified contact information, ensuring higher data accuracy for your outreach.

• Average company size ranges from <span class="text-amber-400">20-200 employees</span>, indicating a mix of established SMEs and growing startups.

Would you like me to filter by specific criteria such as company size, industry sub-sector, or location?`;

	async function handleSearch() {
		if (!searchQuery.trim()) return;

		isSearching = true;
		currentQuery = searchQuery;

		// Simulate API call
		await new Promise((resolve) => setTimeout(resolve, 1500));

		searchResults = mockCompanies;
		aiResponse = mockAiResponse;
		hasSearched = true;
		isSearching = false;
		searchQuery = '';
	}

	function handleSuggestedSearch(query: string) {
		searchQuery = query;
		handleSearch();
	}

	function resetSearch() {
		hasSearched = false;
		searchResults = [];
		aiResponse = '';
		currentQuery = '';
	}
</script>

<svelte:head>
	<title>Search - Julist V2</title>
</svelte:head>

<div class="flex h-[calc(100vh-64px)] flex-col bg-[#0f0f0f]" data-theme="dark">
	{#if !hasSearched}
		<!-- Initial Search State -->
		<div class="flex flex-1 flex-col items-center justify-center px-4" in:fade={{ duration: 300 }}>
			<!-- Logo and Welcome -->
			<div class="mb-8 text-center">
				<div class="mb-4 inline-flex items-center justify-center rounded-2xl bg-linear-to-br from-violet-600 to-purple-700 p-4 shadow-lg shadow-violet-500/20">
					<Sparkles class="h-8 w-8 text-white" />
				</div>
				<h1 class="text-3xl font-semibold text-white md:text-4xl">
					What would you like to find?
				</h1>
				<p class="mt-2 text-slate-400">
					Search for companies, contacts, and business leads across Thailand
				</p>
			</div>

			<!-- Search Input -->
			<div class="w-full max-w-2xl">
				<form onsubmit={(e) => { e.preventDefault(); handleSearch(); }}>
					<div class="group relative">
						<div class="absolute inset-0 rounded-2xl bg-linear-to-r from-violet-600/20 to-purple-600/20 blur-xl transition-opacity group-focus-within:opacity-100 opacity-0"></div>
						<div class="relative flex items-center gap-3 rounded-2xl border border-slate-700/50 bg-[#1a1a1a] px-4 py-3 transition-all focus-within:border-violet-500/50 focus-within:ring-2 focus-within:ring-violet-500/20">
							<button type="button" class="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-white">
								<Plus class="h-5 w-5" />
							</button>
							<input
								type="text"
								bind:value={searchQuery}
								placeholder="Ask anything about Thai businesses..."
								class="flex-1 bg-transparent text-white placeholder-slate-500 outline-none! border-none focus:outline-none! focus:ring-0 focus:border-none"
							/>
							<button type="button" class="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-white">
								<Mic class="h-5 w-5" />
							</button>
							<button
								type="submit"
								disabled={!searchQuery.trim() || isSearching}
								class="shrink-0 rounded-xl bg-violet-600 p-2.5 text-white transition-all hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<Send class="h-5 w-5" />
							</button>
						</div>
					</div>
				</form>

				<!-- Suggested Searches -->
				<div class="mt-6">
					<p class="mb-3 text-sm text-slate-500">Try searching for:</p>
					<div class="flex flex-wrap gap-2">
						{#each suggestedSearches as suggestion}
							<button
								onclick={() => handleSuggestedSearch(suggestion)}
								class="rounded-full border border-slate-700/50 bg-[#1a1a1a] px-4 py-2 text-sm text-slate-300 transition-all hover:border-violet-500/50 hover:bg-violet-500/10 hover:text-white"
							>
								{suggestion}
							</button>
						{/each}
					</div>
				</div>

				<!-- Recent Searches -->
				{#if recentSearches.length > 0}
					<div class="mt-8">
						<div class="flex items-center gap-2 mb-3">
							<History class="h-4 w-4 text-slate-500" />
							<p class="text-sm text-slate-500">Recent searches</p>
						</div>
						<div class="space-y-2">
							{#each recentSearches as recent}
								<button
									onclick={() => handleSuggestedSearch(recent.query)}
									class="flex w-full items-center justify-between rounded-xl border border-slate-800/50 bg-[#141414] px-4 py-3 text-left transition-all hover:border-slate-700 hover:bg-[#1a1a1a]"
								>
									<span class="text-slate-300">{recent.query}</span>
									<span class="text-xs text-slate-500">{recent.time}</span>
								</button>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<!-- Search Results State -->
		<div class="flex flex-1 overflow-hidden" in:fade={{ duration: 300 }}>
			<!-- Main Content Area -->
			<div class="flex flex-1 flex-col overflow-hidden">
				<!-- Scrollable Content -->
				<div class="flex-1 overflow-y-auto px-4 py-6 md:px-8">
					<!-- Current Query Pill -->
					<div class="mb-6 flex items-center gap-3">
						<button
							onclick={resetSearch}
							class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
						>
							<X class="h-5 w-5" />
						</button>
						<div class="inline-flex items-center gap-2 rounded-full bg-[#1a1a1a] border border-slate-700/50 px-4 py-2">
							<Search class="h-4 w-4 text-slate-400" />
							<span class="text-white">{currentQuery}</span>
						</div>
					</div>

					<!-- AI Response -->
					<div class="max-w-3xl">
						{#if isSearching}
							<div class="flex items-center gap-3 text-slate-400">
								<div class="flex gap-1">
									<span class="h-2 w-2 rounded-full bg-violet-500 animate-bounce" style="animation-delay: 0ms"></span>
									<span class="h-2 w-2 rounded-full bg-violet-500 animate-bounce" style="animation-delay: 150ms"></span>
									<span class="h-2 w-2 rounded-full bg-violet-500 animate-bounce" style="animation-delay: 300ms"></span>
								</div>
								<span>Searching across Thai business databases...</span>
							</div>
						{:else}
							<div class="prose prose-invert max-w-none" in:fly={{ y: 20, duration: 400 }}>
								<div class="flex items-start gap-3 mb-4">
									<div class="shrink-0 rounded-xl bg-linear-to-br from-violet-600 to-purple-700 p-2.5">
										<Bot class="h-5 w-5 text-white" />
									</div>
									<div class="flex-1">
										<p class="text-sm text-slate-400 mb-2">Julist AI</p>
										<div class="text-slate-300 leading-relaxed space-y-3">
											{@html aiResponse}
										</div>
									</div>
								</div>

								<!-- Action Buttons -->
								<div class="mt-6 flex flex-wrap gap-2">
									<button class="inline-flex items-center gap-2 rounded-lg border border-slate-700/50 bg-[#1a1a1a] px-4 py-2 text-sm text-slate-300 transition-all hover:border-violet-500/50 hover:bg-violet-500/10">
										<Download class="h-4 w-4" />
										Export Results
									</button>
									<button class="inline-flex items-center gap-2 rounded-lg border border-slate-700/50 bg-[#1a1a1a] px-4 py-2 text-sm text-slate-300 transition-all hover:border-violet-500/50 hover:bg-violet-500/10">
										<Bookmark class="h-4 w-4" />
										Save Search
									</button>
								</div>
							</div>
						{/if}
					</div>
				</div>

				<!-- Bottom Search Input -->
				<div class="border-t border-slate-800/50 bg-[#0f0f0f] px-4 py-4 md:px-8">
					<form onsubmit={(e) => { e.preventDefault(); handleSearch(); }} class="max-w-3xl">
						<div class="flex items-center gap-3 rounded-2xl border border-slate-700/50 bg-[#1a1a1a] px-4 py-3 transition-all focus-within:border-violet-500/50">
							<button type="button" class="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-white">
								<Plus class="h-5 w-5" />
							</button>
							<input
								type="text"
								bind:value={searchQuery}
								placeholder="Ask a follow-up question..."
								class="flex-1 bg-transparent text-white placeholder-slate-500 outline-none! border-none focus:outline-none! focus:ring-0 focus:border-none"
							/>
							<button type="button" class="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-white">
								<Mic class="h-5 w-5" />
							</button>
							<button
								type="submit"
								disabled={!searchQuery.trim() || isSearching}
								class="shrink-0 rounded-xl bg-violet-600 p-2.5 text-white transition-all hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<Send class="h-5 w-5" />
							</button>
						</div>
					</form>
				</div>
			</div>

			<!-- Right Sidebar - Company Results -->
			<div class="hidden w-96 shrink-0 border-l border-slate-800/50 bg-[#0a0a0a] overflow-y-auto lg:block">
				<div class="p-4">
					<!-- Header -->
					<div class="flex items-center justify-between mb-4">
						<div class="flex items-center gap-2">
							<Building2 class="h-4 w-4 text-slate-400" />
							<span class="text-sm font-medium text-slate-300">{searchResults.length} companies found</span>
						</div>
						<button class="text-xs text-violet-400 hover:text-violet-300">
							View all
						</button>
					</div>

					<!-- Company Cards -->
					<div class="space-y-3">
						{#each searchResults as company, i}
							<div
								class="group rounded-xl border border-slate-800/50 bg-[#141414] p-4 transition-all hover:border-slate-700 hover:bg-[#1a1a1a] cursor-pointer"
								in:fly={{ y: 20, duration: 300, delay: i * 100 }}
							>
								<div class="flex items-start justify-between mb-2">
									<div class="flex-1">
										<div class="flex items-center gap-2">
											<h3 class="font-medium text-white text-sm line-clamp-1">{company.name}</h3>
											{#if company.verified}
												<span class="shrink-0 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">
													Verified
												</span>
											{/if}
										</div>
										<p class="text-xs text-slate-500 mt-1">{company.industry}</p>
									</div>
									<div class="shrink-0 ml-2">
										<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br from-violet-600/20 to-purple-600/20">
											<span class="text-sm font-semibold text-violet-400">{company.score}</span>
										</div>
									</div>
								</div>

								<p class="text-xs text-slate-400 line-clamp-2 mb-3">{company.description}</p>

								<div class="space-y-1.5 text-xs text-slate-500">
									<div class="flex items-center gap-2">
										<MapPin class="h-3 w-3" />
										<span>{company.location}</span>
									</div>
									<div class="flex items-center gap-2">
										<Users class="h-3 w-3" />
										<span>{company.employees} employees</span>
									</div>
									<div class="flex items-center gap-2">
										<Globe class="h-3 w-3" />
										<span class="text-violet-400 hover:underline">{company.website}</span>
									</div>
								</div>

								<!-- Hover Actions -->
								<div class="mt-3 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
									<button class="flex-1 rounded-lg bg-violet-600/20 py-1.5 text-xs font-medium text-violet-400 transition-colors hover:bg-violet-600/30">
										View Details
									</button>
									<button class="rounded-lg bg-slate-700/50 p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white">
										<ExternalLink class="h-3.5 w-3.5" />
									</button>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Loading Overlay -->
	{#if isSearching && !hasSearched}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" transition:fade={{ duration: 200 }}>
			<div class="flex flex-col items-center gap-4">
				<div class="relative">
					<div class="h-16 w-16 rounded-full border-4 border-violet-500/30"></div>
					<div class="absolute inset-0 h-16 w-16 rounded-full border-4 border-violet-500 border-t-transparent animate-spin"></div>
				</div>
				<p class="text-white font-medium">Searching Thai businesses...</p>
				<p class="text-slate-400 text-sm">Analyzing databases and verifying leads</p>
			</div>
		</div>
	{/if}
</div>

<style>
	/* Custom scrollbar for dark theme */
	:global(.overflow-y-auto::-webkit-scrollbar) {
		width: 6px;
	}

	:global(.overflow-y-auto::-webkit-scrollbar-track) {
		background: transparent;
	}

	:global(.overflow-y-auto::-webkit-scrollbar-thumb) {
		background: rgba(100, 100, 100, 0.3);
		border-radius: 3px;
	}

	:global(.overflow-y-auto::-webkit-scrollbar-thumb:hover) {
		background: rgba(100, 100, 100, 0.5);
	}

	/* Line clamp utilities */
	.line-clamp-1 {
		display: -webkit-box;
		-webkit-line-clamp: 1;
		line-clamp: 1;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	/* Prose overrides for dark theme */
	:global(.prose-invert) {
		--tw-prose-body: #cbd5e1;
		--tw-prose-headings: #f8fafc;
		--tw-prose-bold: #f8fafc;
	}
</style>
