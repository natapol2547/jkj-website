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
    import { Chat } from '@ai-sdk/svelte';
    import { DefaultChatTransport, type UIMessage } from 'ai';
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';
	import SearchLanding from '$lib/components/SearchLanding.svelte';
	import SearchChat from '$lib/components/SearchChat.svelte';

	// Configure marked to allow HTML (for Tailwind/DaisyUI styled content)
	marked.setOptions({
		breaks: true,
		gfm: true
	});

	/**
	 * Parse markdown and sanitize HTML for safe rendering
	 * Allows Tailwind CSS classes and DaisyUI components
	 * All links will open in a new tab
	 */
	function parseMarkdown(content: string): string {
		// First parse markdown to HTML
		const html = marked(content) as string;
		
		// Sanitize HTML but allow safe classes and elements
		const sanitized = DOMPurify.sanitize(html, {
			ALLOWED_TAGS: [
				'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
				'p', 'br', 'hr',
				'ul', 'ol', 'li',
				'strong', 'em', 'b', 'i', 'u', 's', 'del', 'ins',
				'a', 'code', 'pre', 'blockquote',
				'table', 'thead', 'tbody', 'tr', 'th', 'td',
				'span', 'div',
				'img'
			],
			ALLOWED_ATTR: [
				'class', 'href', 'target', 'rel', 'src', 'alt', 'title',
				'id', 'name', 'style'
			],
			// Allow data attributes for potential future use
			ALLOW_DATA_ATTR: true,
			// Allow class attributes with any value (for Tailwind classes)
			ADD_ATTR: ['class']
		});
		
		// Parse the sanitized HTML and modify all links to open in new tab
		const parser = new DOMParser();
		const doc = parser.parseFromString(sanitized, 'text/html');
		const links = doc.querySelectorAll('a');
		
		links.forEach(link => {
			link.setAttribute('target', '_blank');
			link.setAttribute('rel', 'noopener noreferrer');
		});
		
		return doc.body.innerHTML;
	}

	let { data }: PageProps = $props();

	// Types for parsed company data
	interface CompanyResult {
		rank: number;
		document_id: string;
		company_id: string;
		name: string;
		businessdomain: string;
		location: {
			type: string;
			coordinates: [number, number];
		};
		operating_status: string;
		type_of_entity: string;
		website: string;
		phone: string;
		email: string;
		relevance_score: number;
		match_type: string;
        address: string;
	}

	interface SearchOutput {
		success: boolean;
		query: string;
		searchType: string;
		totalResults: number;
		executionTimeMs: number;
		results: CompanyResult[];
	}

	// State
	let searchQuery = $state('');
	let isSearching = $state(false);
	let hasSearched = $state(false);

    const chat = new Chat({ transport: new DefaultChatTransport({ api: '/api/v1/search' })})

    function handleSubmit(event: Event) {
        event.preventDefault();
        chat.sendMessage({ text: searchQuery });
        searchQuery = '';
    }
</script>

<svelte:head>
	<title>Search - Operetta</title>
</svelte:head>

<div class="flex h-[calc(100vh-64px)] flex-col bg-[#0f0f0f]" data-theme="dark">
	{#if !chat.messages.length}
        <SearchLanding {chat} bind:searchQuery={searchQuery} handleSubmit={handleSubmit} />
	{:else}
		<SearchChat {chat} bind:searchQuery={searchQuery} handleSubmit={handleSubmit} />
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
