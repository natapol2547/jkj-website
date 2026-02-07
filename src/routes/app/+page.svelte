<script lang="ts">
	import type { PageProps } from './$types';
	import { goto } from '$app/navigation';
	import { fade } from 'svelte/transition';
	import {
		Sparkles,
		Plus,
		Mic,
		Send,
		History
	} from '@lucide/svelte';
	import { firestore, user } from '$lib/firebase.svelte';
	import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

	let { data }: PageProps = $props();

	let searchQuery = $state('');
	let isRedirecting = $state(false);

	// Suggested searches
	const suggestedSearches = [
		'บริษัทเทคโนโลยีในกรุงเทพ',
		'โรงแรมในภูเก็ต',
		'บริษัทผลิตอุตสาหกรรมในระยอง',
		'ผู้ประกอบกิจการร้านอาหารในเชียงใหม่',
		'ธนาคารออมสิน'
	];

	async function handleSubmit(event: Event) {
		event.preventDefault();
		if (!searchQuery.trim() || isRedirecting) return;

		isRedirecting = true;

		try {
			// Generate a new session ID
			const sessionId = crypto.randomUUID();

			// Create session document in Firestore
			if (user.current?.uid && firestore) {
				const sessionRef = doc(firestore, 'chat_sessions', sessionId);
				await setDoc(sessionRef, {
					userId: user.current.uid,
					displayName: searchQuery.trim().substring(0, 100),
					firstMessage: searchQuery.trim().substring(0, 200),
					createdAt: serverTimestamp(),
					updatedAt: serverTimestamp()
				});
			}

			// Navigate to the chat session with the query
			await goto(`/app/c/${sessionId}?q=${encodeURIComponent(searchQuery.trim())}`);
		} catch (err) {
			console.error('Failed to create chat session:', err);
			isRedirecting = false;
		}
	}

	function handleSuggestedSearch(event: MouseEvent, query: string) {
		searchQuery = query;
		handleSubmit(event);
	}
</script>

<svelte:head>
	<title>Search - Operetta</title>
</svelte:head>

<div class="flex h-[calc(100vh-64px)] flex-col bg-[#0f0f0f]" data-theme="dark">
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
								disabled={isRedirecting}
							/>
						</div>
						
						<button type="button" class="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-white">
							<Mic class="h-5 w-5" />
						</button>
						<button
							type="submit"
							disabled={!searchQuery.trim() || isRedirecting}
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
							disabled={isRedirecting}
							class="rounded-full border border-slate-700/50 bg-[#1a1a1a] px-4 py-2 text-sm text-slate-300 transition-all hover:border-violet-500/50 hover:bg-violet-500/10 hover:text-white disabled:opacity-50"
						>
							{suggestion}
						</button>
					{/each}
				</div>
			</div>
		</div>
	</div>
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

	/* Prose overrides for dark theme */
	:global(.prose-invert) {
		--tw-prose-body: #cbd5e1;
		--tw-prose-headings: #f8fafc;
		--tw-prose-bold: #f8fafc;
	}
</style>
