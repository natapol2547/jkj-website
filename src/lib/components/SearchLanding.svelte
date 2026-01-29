<script lang="ts">
    import { fade } from 'svelte/transition';
    import { Sparkles, Plus, Mic, Send, History } from '@lucide/svelte';
    import { Chat } from '@ai-sdk/svelte';
    import { DefaultChatTransport } from 'ai';

    let { chat, searchQuery = $bindable(''), handleSubmit = $bindable(() => {}) }: { chat: Chat, searchQuery: string, handleSubmit: (e: Event) => void } = $props();

    let isSearching = $derived(chat.status != 'ready');

    // Suggested searches
	const suggestedSearches = [
		'บริษัทเทคโนโลยีในกรุงเทพ',
		'โรงแรมใกล้ชายหาดภูเก็ต',
		'บริษัทผลิตอุตสาหกรรมในระยอง',
		'ผู้ประกอบกิจการร้านอาหารในเชียงใหม่',
		'ธนาคารออมสิน'
	];

	// Recent searches (mock)
	const recentSearches = [
		{ query: 'Software companies in Bangkok', time: '2 hours ago' },
		{ query: 'Hotels in Pattaya', time: 'Yesterday' },
		{ query: 'Food distributors Thailand', time: '3 days ago' }
	];

    function handleSuggestedSearch(event: MouseEvent, query: string) {
		searchQuery = query;
		handleSubmit(event);
	}


</script>

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
        <form onsubmit={(e) => { e.preventDefault(); handleSubmit(e); }}>
            <div class="group relative">
                <div class="absolute inset-0 rounded-2xl bg-linear-to-r from-violet-600/20 to-purple-600/20 blur-xl transition-opacity group-focus-within:opacity-100 opacity-0"></div>
                <div class="relative flex items-center gap-3 rounded-2xl border border-slate-700/50 bg-[#1a1a1a] px-4 py-3 transition-all focus-within:border-violet-500/50 focus-within:ring-2 focus-within:ring-violet-500/20">
                    <div class="flex-1 flex items-center">
                        <button type="button" class="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-white">
                            <Plus class="h-5 w-5" />
                        </button>
                        <input
                            type="text"
                            bind:value={searchQuery}
                            placeholder="Ask anything about Thai businesses..."
                            class="flex-1 bg-transparent text-white placeholder-slate-500 outline-none! border-none focus:outline-none! focus:ring-0 focus:border-none"
                        />
                    </div>
                    
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
                        onclick={(e) => handleSuggestedSearch(e, suggestion)}
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
                            onclick={(e) => handleSuggestedSearch(e, recent.query)}
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