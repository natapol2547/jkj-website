<script lang="ts">
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
		Download,
		FolderPlus,
		Check,
		Loader2,
		CheckSquare,
		Square
	} from '@lucide/svelte';
	import { Chat } from '@ai-sdk/svelte';
	import { DefaultChatTransport, type UIMessage } from 'ai';
	import { browser } from '$app/environment';
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';
	import SearchLanding from '$lib/components/SearchLanding.svelte';
	import { useMermaid } from '$lib/actions/mermaid';
	import { firestore, user } from '$lib/firebase.svelte';
	import Collection from '$lib/components/Collection.svelte';
	import { query, collection, where, orderBy } from 'firebase/firestore';
	import { getFirebaseContext } from '$lib/stores/sdk.svelte';
	import type { AddCompanyRequest, BatchAddCompaniesRequest, BatchApiResponse } from '$lib/types/project';
	import { getCompanyCount } from '$lib';

	let {
		chat,
		searchQuery = $bindable(''),
		handleSubmit = $bindable(() => {})
	}: { chat: Chat; searchQuery: string; handleSubmit: (e: Event) => void } = $props();

	let isSearching = $derived(chat.status != 'ready');

	// Add to project state
	let showAddToProjectModal = $state(false);
	let selectedCompany = $state<CompanyResult | null>(null);
	let addingToProject = $state(false);
	let selectedProjectId = $state<string | null>(null);
	let addToProjectSuccess = $state(false);

	// Multi-select state
	let selectedCompanyIds = $state<Set<string>>(new Set());
	let selectedProjectIds = $state<Set<string>>(new Set());
	let batchProgress = $state<{
		show: boolean;
		current: number;
		total: number;
		results?: BatchApiResponse;
	}>({ show: false, current: 0, total: 0 });

	// Get Firebase context (with fallback to imported firestore)
	const contextFirebase = getFirebaseContext();
	const firestoreInstance = $derived(contextFirebase?.firestore || firestore);

	// Build query for active projects
	const projectsQuery = $derived.by(() => {
		if (!user.current?.uid || !firestoreInstance) return null;
		return query(
			collection(firestoreInstance, 'projects') as any,
			where('userId', '==', user.current.uid),
			where('status', '==', 'active'),
			orderBy('updatedAt', 'desc')
		) as any;
	});

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

		// During SSR, skip browser-only APIs (DOMPurify, DOMParser)
		// The client will hydrate and re-render with full sanitization
		if (!browser) return html;

		// Sanitize HTML but allow safe classes and elements
		const sanitized = DOMPurify.sanitize(html, {
			ALLOWED_TAGS: [
				'h1',
				'h2',
				'h3',
				'h4',
				'h5',
				'h6',
				'p',
				'br',
				'hr',
				'ul',
				'ol',
				'li',
				'strong',
				'em',
				'b',
				'i',
				'u',
				's',
				'del',
				'ins',
				'a',
				'code',
				'pre',
				'blockquote',
				'table',
				'thead',
				'tbody',
				'tr',
				'th',
				'td',
				'span',
				'div',
				'img',
				'svg',
				'g',
				'path',
				'rect',
				'circle',
				'text',
				'line',
				'polyline',
				'polygon',
				'foreignObject',
				'marker',
				'defs'
			],
			ALLOWED_ATTR: [
				'class',
				'href',
				'target',
				'rel',
				'src',
				'alt',
				'title',
				'id',
				'name',
				'style',
				'viewBox',
				'xmlns',
				'd',
				'fill',
				'stroke',
				'transform',
				'x',
				'y',
				'width',
				'height',
				'cx',
				'cy',
				'r',
				'rx',
				'ry',
				'x1',
				'y1',
				'x2',
				'y2',
				'points',
				'marker-end',
				'marker-start',
				'text-anchor',
				'dominant-baseline',
				'font-size',
				'font-family'
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

		links.forEach((link) => {
			link.setAttribute('target', '_blank');
			link.setAttribute('rel', 'noopener noreferrer');
		});

		return doc.body.innerHTML;
	}

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

	function getCompanySearchResults(message: UIMessage) {
		if (!message) return null;

		// Find dynamic-tool parts with company_search
		for (const part of message.parts) {
			if (
				part.type === 'dynamic-tool' &&
				part.toolName === 'company_search' &&
				part.state === 'output-available' &&
				part.output
			) {
				try {
					const output: SearchOutput = JSON.parse(part.output as string);
					if (output.success && output.results) {
						return {
							query: output.query,
							searchType: output.searchType,
							totalResults: output.totalResults,
							executionTimeMs: output.executionTimeMs,
							results: output.results
						};
					}
				} catch (e) {
					console.error('Failed to parse company search output:', e);
				}
			}
		}
		return null;
	}

	// Derived state to extract company results from dynamic-tool parts
	const companySearchResults = $derived.by(() => {
		const messages = chat.messages;
		if (!messages.length) return null;

		// Find the last assistant message
		let results: CompanyResult[] = [];
		let latestQuery = '';
		let latestSearchType = '';
		let latestExecutionTimeMs = 0;

		// Find dynamic-tool parts with company_search
		for (const message of messages) {
			const searchResults = getCompanySearchResults(message);
			if (searchResults) {
				results.push(...searchResults.results);
				latestQuery = searchResults.query;
				latestSearchType = searchResults.searchType;
				latestExecutionTimeMs = searchResults.executionTimeMs;
			}
		}
		if (results.length === 0) return null;

		// Remove duplicates and reorder
		const uniqueResults = results.filter(
			(result, index, self) => index === self.findIndex((t) => t.document_id === result.document_id)
		);
		const reorderedResults = uniqueResults.sort((a, b) => a.rank - b.rank);
		return {
			query: latestQuery,
			searchType: latestSearchType,
			totalResults: reorderedResults.length,
			executionTimeMs: latestExecutionTimeMs,
			results: reorderedResults
		};
	});

	function getLastAIPart(message: UIMessage) {
		if (message.parts.length === 0) return null;
		for (let i = message.parts.length - 1; i >= 0; i -= 1) {
			const part = message.parts[i];
			if (part.type === 'step-start') continue;
			if (part.type === 'text' && part.text.length === 0) continue;
			return part;
		}
	}

	function isIndexArrayText(text: string): boolean {
		return /^\s*\[\s*(\d+\s*(,\s*\d+\s*)*)?\]\s*$/.test(text);
	}

	function getLastAIResponse(message: UIMessage) {
		if (message.parts.length === 0) return null;
		const lastPart = getLastAIPart(message);
		if (lastPart?.type === 'text' && lastPart.text.length > 0 && !isIndexArrayText(lastPart.text)) {
			return lastPart.text;
		}
		return null;
	}

	function formatToolName(toolName: string) {
		return toolName.replace('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
	}

	// Multi-select functions
	function toggleCompanySelection(companyId: string) {
		const newSet = new Set(selectedCompanyIds);
		if (newSet.has(companyId)) {
			newSet.delete(companyId);
		} else {
			newSet.add(companyId);
		}
		selectedCompanyIds = newSet;
	}

	function selectAllCompanies() {
		if (!companySearchResults?.results) return;
		selectedCompanyIds = new Set(companySearchResults.results.map(c => c.document_id));
	}

	function deselectAllCompanies() {
		selectedCompanyIds = new Set();
	}

	function toggleProjectSelection(projectId: string) {
		const newSet = new Set(selectedProjectIds);
		if (newSet.has(projectId)) {
			newSet.delete(projectId);
		} else {
			newSet.add(projectId);
		}
		selectedProjectIds = newSet;
	}

	// Open add to project modal (single company)
	function openAddToProject(company: CompanyResult) {
		selectedCompany = company;
		selectedProjectId = null;
		selectedProjectIds = new Set();
		addToProjectSuccess = false;
		showAddToProjectModal = true;
	}

	// Open bulk add modal (multiple companies)
	function openBulkAddToProjects() {
		selectedCompany = null;
		selectedProjectId = null;
		selectedProjectIds = new Set();
		addToProjectSuccess = false;
		showAddToProjectModal = true;
	}

	// Add company to selected project (single)
	async function addCompanyToProject() {
		if (!selectedCompany || !selectedProjectId) return;

		addingToProject = true;

		try {
			const companyData: AddCompanyRequest = {
				document_id: selectedCompany.document_id,
				name: selectedCompany.name,
				businessdomain: selectedCompany.businessdomain || '',
				address: selectedCompany.address || ''
			};

			const response = await fetch(`/api/v1/project-companies?projectId=${selectedProjectId}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(companyData)
			});

			const result = await response.json();

			if (result.success) {
				addToProjectSuccess = true;
				setTimeout(() => {
					showAddToProjectModal = false;
					selectedCompany = null;
					selectedProjectId = null;
					addToProjectSuccess = false;
				}, 1500);
			} else {
				console.error('Failed to add company:', result.error);
			}
		} catch (err) {
			console.error('Failed to add company:', err);
		} finally {
			addingToProject = false;
		}
	}

	// Batch add companies to projects
	async function batchAddCompaniesToProjects() {
		if (selectedCompanyIds.size === 0 || selectedProjectIds.size === 0) return;

		addingToProject = true;
		batchProgress = {
			show: true,
			current: 0,
			total: selectedCompanyIds.size * selectedProjectIds.size
		};

		try {
			// Get selected companies data
			const companies: AddCompanyRequest[] = [];
			if (companySearchResults?.results) {
				for (const company of companySearchResults.results) {
					if (selectedCompanyIds.has(company.document_id)) {
						companies.push({
							document_id: company.document_id,
							name: company.name,
							businessdomain: company.businessdomain || '',
							address: company.address || ''
						});
					}
				}
			}

			const requestData: BatchAddCompaniesRequest = {
				companies: companies,
				projectIds: Array.from(selectedProjectIds)
			};

			const response = await fetch('/api/v1/project-companies-batch', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestData)
			});

			const result: BatchApiResponse = await response.json();

			if (result.success) {
				batchProgress = { ...batchProgress, results: result };
				addToProjectSuccess = true;
				setTimeout(() => {
					showAddToProjectModal = false;
					selectedCompanyIds = new Set();
					selectedProjectIds = new Set();
					addToProjectSuccess = false;
					batchProgress = { show: false, current: 0, total: 0 };
				}, 3000);
			} else {
				console.error('Batch add failed:', result);
			}
		} catch (err) {
			console.error('Failed to batch add companies:', err);
		} finally {
			addingToProject = false;
		}
	}
</script>

<!-- Search Results State -->
<div class="flex flex-1 overflow-hidden" in:fade={{ duration: 300 }}>
	<!-- Main Content Area -->
	<div class="flex flex-1 flex-col overflow-hidden">
		<!-- Scrollable Content -->
		<div class="flex-1 overflow-y-auto px-4 py-6 md:px-8">
			<!-- Current Query Pill -->
			{#each chat.messages as message, messageIndex (messageIndex)}
				{#if message.role === 'user'}
					{@const messageText = message.parts[0]?.type === 'text' ? message.parts[0]?.text : ''}
					<div class="mb-6 flex items-center justify-end gap-3">
						<!-- <button
                            onclick={resetSearch}
                            class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                        >
                            <X class="h-5 w-5" />
                        </button> -->
						<div
							class="inline-flex items-center gap-2 rounded-full bg-primary border border-slate-700/50 px-4 py-2"
						>
							<Search class="h-4 w-4 text-slate-400" />
							<span class="text-white">{messageText}</span>
						</div>
					</div>
				{/if}

				{#if message.role === 'assistant'}
					{@const lastAIResponse = getLastAIResponse(message)}
					{@const lastPart = getLastAIPart(message)}
					{@const companies = getCompanySearchResults(message)}

					<!-- AI Response -->
					<div
						class="prose prose-invert prose-headings:my-0 max-w-none"
						in:fly={{ y: 20, duration: 400 }}
					>
						<div class="flex items-start gap-3 mb-4">
							<div class="shrink-0 rounded-xl bg-linear-to-br from-violet-600 to-purple-700 p-2.5">
								<Bot class="h-5 w-5 text-white" />
							</div>
							<div class="flex-1 w-full overflow-y-auto">
								<!-- <pre>{JSON.stringify(message, null, 2)}</pre> -->
								<div
									class="text-slate-300 leading-relaxed space-y-3 inline-flex items-center gap-2 rounded-lg bg-[#1a1a1a] border border-slate-700/50 px-4 py-2 w-full min-h-16 overflow-y-auto"
								>
								<!-- Tool (only show for active/in-progress calls, not completed ones) -->
								{#if lastPart && lastPart.type === 'dynamic-tool' && lastPart.state !== 'output-available'}
									<span class="skeleton skeleton-text" transition:fade={{ duration: 300 }}
										>Using {formatToolName(lastPart.toolName)} Tool</span
									>
								{/if}
									<!-- End AI Response -->
									{#if lastAIResponse}
										{#if !lastAIResponse || lastAIResponse == ''}
											<span class="skeleton skeleton-text">Thinking...</span>
										{/if}
										<div in:fade={{ duration: 300, delay: 300 }} use:useMermaid={lastAIResponse}>
											{@html parseMarkdown(lastAIResponse)}
											{#if companies}
												<details
													class="group mt-4 rounded-xl border border-slate-700/50 bg-[#141414] overflow-hidden transition-all hover:border-violet-500/30"
													name="data-accordion"
												>
													<summary
														class="flex cursor-pointer items-center justify-between px-4 py-3 font-medium text-slate-300 transition-colors hover:bg-[#1a1a1a] hover:text-white"
													>
														<div class="flex items-center gap-2">
															<Building2 class="h-4 w-4 text-violet-400" />
															<span>ดูผลการค้นหาทั้งหมด</span>
															<span
																class="ml-2 rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-400"
																>{companies.totalResults}</span
															>
														</div>
														<ChevronRight
															class="h-4 w-4 text-slate-500 transition-transform group-open:rotate-90"
														/>
													</summary>
													<div class="border-t border-slate-700/30 bg-[#0f0f0f] p-3">
														<div class="space-y-2">
															{#each companies.results as company, i}
																<div
																	class="group/item flex items-start gap-3 rounded-lg border border-slate-800/50 bg-[#141414] p-3 transition-all hover:border-violet-500/50 hover:bg-[#1a1a1a] {selectedCompanyIds.has(company.document_id) ? 'border-violet-500/50 bg-violet-500/10' : ''}"
																>
																	<!-- Checkbox -->
																	<button
																		onclick={(e) => {
																			e.stopPropagation();
																			toggleCompanySelection(company.document_id);
																		}}
																		class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors {selectedCompanyIds.has(company.document_id) ? 'bg-violet-600 text-white' : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'}"
																	>
																		{#if selectedCompanyIds.has(company.document_id)}
																			<CheckSquare class="h-4 w-4" />
																		{:else}
																			<Square class="h-4 w-4" />
																		{/if}
																	</button>

																	<!-- Rank Badge -->
																	<div
																		class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-violet-600/20 to-purple-600/20 text-xs font-semibold text-violet-400"
																	>
																		{i + 1}
																	</div>

																	<!-- Company Info (clickable) -->
																	<a
																		href="/app/company/{company.document_id}"
																		class="flex-1 min-w-0 no-underline"
																		target="_blank"
																	>
																		<div class="flex items-start justify-between gap-2">
																			<h4
																				class="text-sm font-medium text-white line-clamp-1 group-hover/item:text-violet-400 transition-colors"
																			>
																				{company.name}
																			</h4>
																			<div class="flex items-center gap-1 shrink-0">
																				<button
																					onclick={(e) => {
																						e.preventDefault();
																						openAddToProject(company);
																					}}
																					class="rounded p-1 text-slate-500 opacity-0 transition-all hover:bg-violet-500/20 hover:text-violet-400 group-hover/item:opacity-100"
																					title="Add to project"
																				>
																					<FolderPlus class="h-3.5 w-3.5" />
																				</button>
																				<ExternalLink
																					class="h-3.5 w-3.5 text-slate-500 opacity-0 transition-opacity group-hover/item:opacity-100"
																				/>
																			</div>
																		</div>
																		<p class="mt-1 text-xs text-slate-400 line-clamp-2">
																			{company.businessdomain}
																		</p>
																		{#if company.address && company.address !== 'N/A'}
																			<div
																				class="mt-2 flex items-center gap-1.5 text-xs text-slate-500"
																			>
																				<MapPin class="h-3 w-3 shrink-0" />
																				<span class="truncate">{company.address}</span>
																			</div>
																		{/if}
																	</a>
																</div>
															{/each}
														</div>
													</div>
												</details>
											{/if}
										</div>
									{/if}
								</div>
							</div>
						</div>
						<!-- Action Buttons -->
						<!-- <div class="mt-6 flex flex-wrap gap-2">
                            <button class="inline-flex items-center gap-2 rounded-lg border border-slate-700/50 bg-[#1a1a1a] px-4 py-2 text-sm text-slate-300 transition-all hover:border-violet-500/50 hover:bg-violet-500/10">
                                <Download class="h-4 w-4" />
                                Export Results
                            </button>
                            <button class="inline-flex items-center gap-2 rounded-lg border border-slate-700/50 bg-[#1a1a1a] px-4 py-2 text-sm text-slate-300 transition-all hover:border-violet-500/50 hover:bg-violet-500/10">
                                <Bookmark class="h-4 w-4" />
                                Save Search
                            </button>
                        </div> -->
					</div>
				{/if}
			{/each}

			{#if chat.status === 'submitted'}
				<div class="flex items-center gap-3 text-slate-400">
					<div class="flex gap-1">
						<span
							class="h-2 w-2 rounded-full bg-violet-500 animate-bounce"
							style="animation-delay: 0ms"
						></span>
						<span
							class="h-2 w-2 rounded-full bg-violet-500 animate-bounce"
							style="animation-delay: 150ms"
						></span>
						<span
							class="h-2 w-2 rounded-full bg-violet-500 animate-bounce"
							style="animation-delay: 300ms"
						></span>
					</div>
					<span>Searching across Thai business databases...</span>
				</div>
			{/if}
		</div>
		<!-- Bottom Search Input -->
		<div class="border-t border-slate-800/50 bg-[#0f0f0f] px-4 py-4 md:px-8">
			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSubmit(e);
				}}
				class="w-full"
			>
				<div
					class="flex items-center gap-3 rounded-2xl border border-slate-700/50 bg-[#1a1a1a] px-4 py-3 transition-all focus-within:border-violet-500/50"
				>
					<button
						type="button"
						class="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-white"
					>
						<Plus class="h-5 w-5" />
					</button>
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Ask a follow-up question..."
						class="flex-1 bg-transparent text-white placeholder-slate-500 outline-none! border-none focus:outline-none! focus:ring-0 focus:border-none min-w-0 max-w-full"
					/>
					<button
						type="button"
						class="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-white"
					>
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
	<div
		class="hidden w-96 shrink-0 border-l border-slate-800/50 bg-[#0a0a0a] overflow-y-auto lg:block"
	>
		<div class="p-4">
			{#if companySearchResults}
				<!-- Header -->
				<div class="mb-4 space-y-3">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<Building2 class="h-4 w-4 text-slate-400" />
							<span class="text-sm font-medium text-slate-300"
								>{companySearchResults.totalResults} companies found</span
							>
						</div>
						<div class="flex items-center gap-3">
							<span class="text-xs text-slate-500">{companySearchResults.executionTimeMs}ms</span>
							<button class="text-xs text-violet-400 hover:text-violet-300"> Export </button>
						</div>
					</div>

					<!-- Selection Controls -->
					<div class="flex items-center justify-between gap-2">
						<div class="flex items-center gap-2">
							{#if selectedCompanyIds.size > 0}
								<span class="text-xs text-slate-400">{selectedCompanyIds.size} selected</span>
							{/if}
						</div>
						<div class="flex items-center gap-2">
							{#if selectedCompanyIds.size === companySearchResults.totalResults && selectedCompanyIds.size > 0}
								<button
									onclick={deselectAllCompanies}
									class="text-xs text-slate-400 hover:text-white transition-colors"
								>
									Deselect All
								</button>
							{:else}
								<button
									onclick={selectAllCompanies}
									class="text-xs text-violet-400 hover:text-violet-300 transition-colors"
								>
									Select All
								</button>
							{/if}
						</div>
					</div>

					<!-- Bulk Actions Toolbar -->
					{#if selectedCompanyIds.size > 0}
						<div
							class="flex items-center gap-2 rounded-lg border border-violet-500/50 bg-violet-500/10 p-3"
							transition:slide={{ duration: 200 }}
						>
							<button
								onclick={openBulkAddToProjects}
								class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500"
							>
								<FolderPlus class="h-4 w-4" />
								Add to Projects ({selectedCompanyIds.size})
							</button>
						</div>
					{/if}
				</div>

				<!-- Company Cards -->
				<div class="space-y-3">
					{#each companySearchResults.results as company, i}
						{@const isActive = company.operating_status === 'ยังดำเนินกิจการอยู่'}
						<div
							class="group rounded-xl border border-slate-800/50 bg-[#141414] p-4 transition-all hover:border-slate-700 hover:bg-[#1a1a1a] {selectedCompanyIds.has(company.document_id) ? 'border-violet-500/50 bg-violet-500/10' : ''}"
							in:fly={{ y: 20, duration: 300, delay: i * 50 }}
						>
							<div class="flex items-start justify-between mb-2">
								<!-- Checkbox -->
								<button
									onclick={(e) => {
										e.stopPropagation();
										toggleCompanySelection(company.document_id);
									}}
									class="btn btn-xs btn-square btn-ghost transition-colors mr-2 {selectedCompanyIds.has(company.document_id) ? 'bg-violet-600' : 'text-slate-400'}"
								>
									{#if selectedCompanyIds.has(company.document_id)}
										<CheckSquare class="h-5 w-5" />
									{:else}
										<Square class="h-5 w-5" />
									{/if}
								</button>

								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2 flex-wrap">
										<h3 class="font-medium text-white text-sm line-clamp-1">{company.name}</h3>
										{#if isActive}
											<span
												class="shrink-0 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400"
											>
												ดำเนินกิจการ
											</span>
										{:else}
											<span
												class="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400"
											>
												{company.operating_status}
											</span>
										{/if}
									</div>
									<p class="text-xs text-slate-500 mt-1">{company.type_of_entity}</p>
								</div>
								<div class="shrink-0 ml-2">
									<div
										class="flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br from-violet-600/20 to-purple-600/20"
									>
										<span class="text-xs font-semibold text-violet-400">#{company.rank}</span>
									</div>
								</div>
							</div>

							<p class="text-xs text-slate-400 line-clamp-2 mb-3">{company.businessdomain}</p>

							<div class="space-y-1.5 text-xs text-slate-500">
								{#if company.address && company.address !== 'N/A'}
									<div class="overflow-hidden">
										<p class="truncate">{company.address}</p>
									</div>
									<div class="flex items-center gap-2">
										<MapPin class="h-3 w-3 shrink-0" />
										<a
											href="https://www.google.com/maps/search/?api=1&query={encodeURIComponent(
												company.name + ' ' + company.address
											)}"
											target="_blank"
											rel="noopener noreferrer"
											class="text-violet-400 hover:underline"
										>
											ดูแผนที่
										</a>
									</div>
								{/if}
								{#if company.phone && company.phone !== 'N/A'}
									<div class="flex items-center gap-2">
										<Phone class="h-3 w-3 shrink-0" />
										<a href="tel:{company.phone}" class="hover:text-violet-400 transition-colors"
											>{company.phone}</a
										>
									</div>
								{/if}
								{#if company.email && company.email !== 'N/A'}
									<div class="flex items-center gap-2">
										<Mail class="h-3 w-3 shrink-0" />
										<a
											href="mailto:{company.email}"
											class="text-violet-400 hover:underline truncate">{company.email}</a
										>
									</div>
								{/if}
								{#if company.website && company.website !== 'N/A'}
									<div class="flex items-center gap-2">
										<Globe class="h-3 w-3 shrink-0" />
										<a
											href="https://{company.website}"
											target="_blank"
											rel="noopener noreferrer"
											class="text-violet-400 hover:underline truncate">{company.website}</a
										>
									</div>
								{/if}
							</div>

							<!-- Relevance Score & Match Type -->
							<div class="mt-3 flex items-center justify-between">
								<div class="flex items-center gap-2">
									<span class="text-xs text-slate-500"
										>Relevance: {(company.relevance_score * 100).toFixed(1)}%</span
									>
									<span class="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400"
										>{company.match_type}</span
									>
								</div>
							</div>

							<!-- Hover Actions -->
							<div
								class="mt-3 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100"
							>
								<button
									onclick={() => openAddToProject(company)}
									class="rounded-lg bg-violet-600/20 p-1.5 text-violet-400 transition-colors hover:bg-violet-600/30"
									title="Add to project"
								>
									<FolderPlus class="h-3.5 w-3.5" />
								</button>
								<a
									href="/app/company/{company.document_id}"
									class="flex-1 rounded-lg bg-slate-700/20 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700/30 text-center"
								>
									View Details
								</a>
								<a
									href="/app/company/{company.document_id}"
									target="_blank"
									rel="noopener noreferrer"
									class="rounded-lg bg-slate-700/50 p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
								>
									<ExternalLink class="h-3.5 w-3.5" />
								</a>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<!-- Empty State -->
				<div class="flex flex-col items-center justify-center py-12 text-center">
					<Building2 class="h-12 w-12 text-slate-600 mb-4" />
					<p class="text-sm text-slate-500">No company results yet</p>
					<p class="text-xs text-slate-600 mt-1">Search results will appear here</p>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Add to Project Modal -->
{#if showAddToProjectModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		transition:fade={{ duration: 150 }}
	>
		<!-- Backdrop -->
		<button
			class="absolute inset-0 bg-black/60 backdrop-blur-sm"
			onclick={() => (showAddToProjectModal = false)}
			aria-label="Close modal"
		></button>

		<!-- Modal -->
		<div
			class="relative w-full max-w-md rounded-2xl border border-slate-800/50 bg-[#141414] p-6 shadow-xl"
			transition:fly={{ y: 20, duration: 300 }}
		>
			{#if addToProjectSuccess}
				<!-- Success State -->
				<div class="flex flex-col items-center justify-center py-8 text-center">
					<div class="mb-4 rounded-full bg-emerald-500/20 p-4">
						<Check class="h-8 w-8 text-emerald-400" />
					</div>
					{#if batchProgress.results}
						<h3 class="text-lg font-bold text-white">Batch Operation Complete!</h3>
						<p class="mt-2 text-sm text-slate-400">
							{batchProgress.results.summary.successful} of {batchProgress.results.summary.total} operations successful
						</p>
						{#if batchProgress.results.summary.failed > 0}
							<p class="mt-1 text-xs text-amber-400">
								{batchProgress.results.summary.failed} failed (duplicates or errors)
							</p>
						{/if}
					{:else}
						<h3 class="text-lg font-bold text-white">Added to Project!</h3>
						<p class="mt-2 text-sm text-slate-400">Company successfully added to your project</p>
					{/if}
				</div>
			{:else}
				<!-- Header -->
				<div class="mb-6 flex items-center justify-between">
					<h2 class="text-xl font-bold text-white">
						{selectedCompanyIds.size > 0 ? `Add ${selectedCompanyIds.size} Companies` : 'Add to Project'}
					</h2>
					<button
						onclick={() => (showAddToProjectModal = false)}
						class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
					>
						<X class="h-5 w-5" />
					</button>
				</div>

				<!-- Company Info (Single Mode) -->
				{#if selectedCompany}
					<div class="mb-6 rounded-lg border border-slate-700/50 bg-[#1a1a1a] p-4">
						<h3 class="font-medium text-white line-clamp-1">{selectedCompany.name}</h3>
						<p class="mt-1 text-xs text-slate-400 line-clamp-1">{selectedCompany.businessdomain}</p>
					</div>
				{/if}

				<!-- Selected Companies Summary (Bulk Mode) -->
				{#if selectedCompanyIds.size > 0 && !selectedCompany}
					<div class="mb-6 rounded-lg border border-violet-500/50 bg-violet-500/10 p-4">
						<div class="flex items-center gap-2 text-sm text-violet-300">
							<Building2 class="h-4 w-4" />
							<span>{selectedCompanyIds.size} companies selected</span>
						</div>
					</div>
				{/if}

				<!-- Projects List -->
				<div class="mb-6">
					<label class="mb-3 block text-sm font-medium text-slate-300">
						{selectedCompanyIds.size > 0 && !selectedCompany ? 'Select projects (multiple allowed)' : 'Select a project'}
					</label>

					{#if projectsQuery}
						<Collection ref={projectsQuery}>
							{#snippet children({ data: userProjects })}
								{#if userProjects.length === 0}
									<div class="rounded-lg border border-slate-700/50 bg-[#1a1a1a] p-6 text-center">
										<p class="mb-4 text-sm text-slate-400">You don't have any projects yet</p>
										<a
											href="/app/projects"
											class="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-violet-500"
										>
											<Plus class="h-4 w-4" />
											Create Project
										</a>
									</div>
								{:else}
									<div class="max-h-64 space-y-2 overflow-y-auto">
										{#each userProjects as project}
											{@const isSelected = selectedCompanyIds.size > 0 && !selectedCompany 
												? selectedProjectIds.has(project.id)
												: selectedProjectId === project.id}
											<button
												onclick={() => {
													if (selectedCompanyIds.size > 0 && !selectedCompany) {
														// Multi-select mode
														toggleProjectSelection(project.id);
													} else {
														// Single-select mode
														selectedProjectId = project.id;
													}
												}}
												class="w-full rounded-lg border p-3 text-left transition-all {isSelected
													? 'border-violet-500/50 bg-violet-500/10'
													: 'border-slate-700/50 bg-[#1a1a1a] hover:border-slate-700'}"
											>
												<div class="flex items-center justify-between">
													<div class="flex-1 min-w-0">
														<h4 class="text-sm font-medium text-white line-clamp-1">
															{project.name}
														</h4>
														<p class="mt-0.5 text-xs text-slate-400 line-clamp-1">
															{#await getCompanyCount(project.id)}
																<span class="text-slate-500">...</span>
															{:then count}
																<span>{count} {count === 1 ? 'company' : 'companies'}</span>
															{:catch}
																<span>0 companies</span>
															{/await}
														</p>
													</div>
													{#if isSelected}
														<div class="ml-2 rounded-full bg-violet-500/20 p-1">
															<Check class="h-4 w-4 text-violet-400" />
														</div>
													{/if}
												</div>
											</button>
										{/each}
									</div>

									<a
										href="/app/projects"
										class="mt-3 block text-center text-sm text-violet-400 hover:text-violet-300"
									>
										Create new project
									</a>
								{/if}
							{/snippet}

							{#snippet loading()}
								<div class="rounded-lg border border-slate-700/50 bg-[#1a1a1a] p-6 text-center">
									<div class="flex items-center justify-center gap-2">
										<Loader2 class="h-4 w-4 animate-spin text-violet-400" />
										<span class="text-sm text-slate-400">Loading projects...</span>
									</div>
								</div>
							{/snippet}
						</Collection>
					{:else}
						<div class="rounded-lg border border-slate-700/50 bg-[#1a1a1a] p-6 text-center">
							<div class="flex items-center justify-center gap-2">
								<Loader2 class="h-4 w-4 animate-spin text-violet-400" />
								<span class="text-sm text-slate-400">Initializing...</span>
							</div>
						</div>
					{/if}
				</div>

				<!-- Actions -->
				<div class="flex gap-3">
					<button
						onclick={() => (showAddToProjectModal = false)}
						disabled={addingToProject}
						class="flex-1 rounded-lg border border-slate-700/50 bg-slate-800/50 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Cancel
					</button>
					<button
						onclick={() => {
							if (selectedCompanyIds.size > 0 && !selectedCompany) {
								// Batch mode
								batchAddCompaniesToProjects();
							} else {
								// Single mode
								addCompanyToProject();
							}
						}}
						disabled={(selectedCompanyIds.size > 0 && !selectedCompany) 
							? (selectedProjectIds.size === 0 || addingToProject)
							: (!selectedProjectId || addingToProject)}
						class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{#if addingToProject}
							<Loader2 class="h-4 w-4 animate-spin" />
							<span>Adding...</span>
						{:else if selectedCompanyIds.size > 0 && !selectedCompany}
							<span>Add to {selectedProjectIds.size} Project{selectedProjectIds.size !== 1 ? 's' : ''}</span>
						{:else}
							<span>Add to Project</span>
						{/if}
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<!-- Batch Progress Indicator -->
{#if batchProgress.show && !addToProjectSuccess}
	<div
		class="fixed bottom-4 right-4 z-50 rounded-xl border border-slate-800/50 bg-[#141414] p-4 shadow-xl"
		transition:fly={{ y: 20, duration: 300 }}
	>
		<div class="flex items-center gap-3">
			<Loader2 class="h-5 w-5 animate-spin text-violet-400" />
			<div>
				<p class="text-sm font-medium text-white">Adding companies to projects...</p>
				<p class="text-xs text-slate-400">
					Processing {batchProgress.current} of {batchProgress.total}
				</p>
			</div>
		</div>
	</div>
{/if}

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
