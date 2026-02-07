<script lang="ts">
	import type { PageProps } from './$types';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { Chat } from '@ai-sdk/svelte';
	import { DefaultChatTransport, type UIMessage } from 'ai';
	import SearchChat from '$lib/components/SearchChat.svelte';
	import SearchLanding from '$lib/components/SearchLanding.svelte';
	import { firestore, user } from '$lib/firebase.svelte';
	import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

	let { data }: PageProps = $props();

	const sessionId = $derived(data.sessionId);

	// Reactive Chat instance - recreates when session data changes (navigation between sessions)
	const chat = $derived.by(() => {
		return new Chat({
			transport: new DefaultChatTransport({
				api: '/api/v1/search',
				body: { threadId: data.sessionId }
			}),
			messages: (data.initialMessages ?? []) as UIMessage[]
		});
	});

	let searchQuery = $state('');
	// Track which session had the initial ?q= query sent to prevent double-sending
	let querySentForSession = $state('');

	function handleSubmit(event: Event) {
		event.preventDefault();
		if (!searchQuery.trim()) return;
		chat.sendMessage({ text: searchQuery });

		// Update session updatedAt in Firestore
		updateSessionTimestamp();

		searchQuery = '';
	}

	async function updateSessionTimestamp() {
		if (!user.current?.uid || !firestore || !sessionId) return;
		try {
			const sessionRef = doc(firestore, 'chat_sessions', sessionId);
			await updateDoc(sessionRef, {
				updatedAt: serverTimestamp()
			});
		} catch (err) {
			// Session doc might not exist yet if navigated directly
			console.warn('Failed to update session timestamp:', err);
		}
	}

	// Handle initial query from URL params (new chat redirect)
	onMount(() => {
		const urlQuery = $page.url.searchParams.get('q');
		if (urlQuery && querySentForSession !== data.sessionId) {
			querySentForSession = data.sessionId;

			// Remove q param from URL without navigation
			const newUrl = new URL(window.location.href);
			newUrl.searchParams.delete('q');
			window.history.replaceState({}, '', newUrl.toString());

			// Auto-send the initial query
			chat.sendMessage({ text: urlQuery });
			updateSessionTimestamp();
		}
	});
</script>

<svelte:head>
	<title>Chat - Operetta</title>
</svelte:head>

<div class="flex h-[calc(100vh-64px)] flex-col bg-[#0f0f0f]" data-theme="dark">
	{#if !chat.messages.length}
		<SearchLanding {chat} bind:searchQuery={searchQuery} {handleSubmit} />
	{:else}
		<SearchChat {chat} bind:searchQuery={searchQuery} {handleSubmit} />
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

	/* Prose overrides for dark theme */
	:global(.prose-invert) {
		--tw-prose-body: #cbd5e1;
		--tw-prose-headings: #f8fafc;
		--tw-prose-bold: #f8fafc;
	}
</style>
