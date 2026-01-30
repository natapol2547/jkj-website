<script lang="ts">
	import { page } from '$app/state';
	import Doc from '$lib/components/Doc.svelte';
	import Collection from '$lib/components/Collection.svelte';
	import { getFirebaseContext } from '$lib/stores/sdk.svelte';
	import type { Project, ProjectCompany, ResearchDocument } from '$lib/types/project';
	import {
		ArrowLeft,
		Building2,
		MapPin,
		ExternalLink,
		Sparkles,
		Play,
		Loader2,
		CheckCircle2,
		XCircle,
		Clock,
		FileText,
		Calendar,
		RefreshCw,
		Trash2,
		ChevronDown,
		ChevronUp
	} from '@lucide/svelte';
	import { fly, fade, slide } from 'svelte/transition';
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';

	// Get Firebase context
	const { firestore } = getFirebaseContext();

	// Get IDs from URL
	const projectId = $derived(page.params.project_id || '');
	const companyId = $derived(page.params.company_id || '');
	
	// Build refs
	const projectRef = $derived(`projects/${projectId}`);
	const companyRef = $derived(`projects/${projectId}/companies/${companyId}`);
	const researchRef = $derived(`projects/${projectId}/companies/${companyId}/research`);

	// Research state
	let researchTopic = $state('');
	let isResearching = $state(false);
	let researchError = $state<string | null>(null);
	let expandedResearch = $state<Set<string>>(new Set());

	// Research topic suggestions
	const topicSuggestions = [
		'Research about the company',
		'Write a professional email introducing our services',
		'Analyze competitive advantages',
		'Summarize company overview and key information',
		'Find potential business opportunities',
		'Research market position and competitors'
	];

	// Start research for this company
	async function startResearch() {
		if (!researchTopic.trim()) return;

		isResearching = true;
		researchError = null;

		try {
			const response = await fetch('/api/v1/research', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					projectId,
					companyIds: [companyId],
					topic: researchTopic.trim()
				})
			});

			const result = await response.json();

			if (!result.success) {
				researchError = result.error || 'Failed to start research';
				return;
			}

			// Check if any research failed to start
			const failedResults = result.results.filter((r: any) => !r.success);
			if (failedResults.length > 0) {
				researchError = failedResults[0].error || 'Failed to start research';
				return;
			}

			// Clear the topic input on success
			// Research is running in background via waitUntil - results will appear via Firestore listener
			researchTopic = '';

		} catch (err) {
			console.error('Failed to start research:', err);
			researchError = err instanceof Error ? err.message : 'Failed to start research';
		} finally {
			isResearching = false;
		}
	}

	// Select a topic suggestion
	function selectSuggestion(suggestion: string) {
		researchTopic = suggestion;
	}

	// Toggle research expansion
	function toggleExpanded(researchId: string) {
		const newSet = new Set(expandedResearch);
		if (newSet.has(researchId)) {
			newSet.delete(researchId);
		} else {
			newSet.add(researchId);
		}
		expandedResearch = newSet;
	}

	// Render markdown to HTML
	function renderMarkdown(content: string): string {
		if (!content) return '';
		const html = marked.parse(content) as string;
		return DOMPurify.sanitize(html);
	}

	// Format date
	function formatDate(timestamp: any): string {
		if (!timestamp) return '';
		const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
		return date.toLocaleDateString('th-TH', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Get status color and icon
	function getStatusInfo(status: string): { color: string; bgColor: string; icon: any } {
		switch (status) {
			case 'running':
				return { color: 'text-blue-400', bgColor: 'bg-blue-500/20', icon: Loader2 };
			case 'completed':
				return { color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', icon: CheckCircle2 };
			case 'failed':
				return { color: 'text-red-400', bgColor: 'bg-red-500/20', icon: XCircle };
			default:
				return { color: 'text-slate-400', bgColor: 'bg-slate-500/20', icon: Clock };
		}
	}
</script>

<Doc ref={projectRef}>
	{#snippet children({ data: project }: { data: Project })}
		<Doc ref={companyRef}>
			{#snippet children({ data: company }: { data: ProjectCompany })}

<div class="min-h-screen bg-[#0f0f0f]">
	<!-- Header -->
	<div class="border-b border-slate-800/50 bg-[#0a0a0a] px-4 py-6 md:px-8">
		<div class="mx-auto max-w-5xl">
			<!-- Breadcrumb -->
			<div class="mb-4 flex items-center gap-2 text-sm text-slate-400">
				<a href="/app/projects" class="transition-colors hover:text-white">Projects</a>
				<span>/</span>
				<a href="/app/projects/{projectId}" class="transition-colors hover:text-white">{project.name}</a>
				<span>/</span>
				<span class="text-white">{company.name}</span>
			</div>

			<!-- Back button -->
			<a
				href="/app/projects/{projectId}"
				class="mb-4 inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
			>
				<ArrowLeft class="h-4 w-4" />
				Back to Project
			</a>

			<!-- Company Info -->
			<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-3 mb-2">
						<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-violet-600/30 to-purple-600/30">
							<Building2 class="h-6 w-6 text-violet-400" />
						</div>
						<div>
							<h1 class="text-2xl font-bold text-white md:text-3xl">
								{company.name}
							</h1>
							<p class="text-slate-400">{company.businessdomain || 'No business domain'}</p>
						</div>
					</div>
					
					{#if company.address && company.address !== 'N/A'}
						<div class="mt-3 flex items-center gap-2 text-sm text-slate-400">
							<MapPin class="h-4 w-4 shrink-0" />
							<span>{company.address}</span>
						</div>
					{/if}
				</div>

				<!-- External Link -->
				<a
					href="/app/company/{companyId}"
					target="_blank"
					class="flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/50 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-slate-800"
				>
					<ExternalLink class="h-4 w-4" />
					View Full Details
				</a>
			</div>
		</div>
	</div>

	<!-- Content -->
	<div class="px-4 py-6 md:px-8">
		<div class="mx-auto max-w-5xl space-y-6">
			<!-- Start Research Section -->
			<div class="rounded-xl border border-violet-500/30 bg-linear-to-br from-violet-900/20 to-purple-900/20 p-6">
				<div class="flex items-center gap-3 mb-4">
					<div class="rounded-lg bg-violet-500/20 p-2">
						<Sparkles class="h-5 w-5 text-violet-400" />
					</div>
					<div>
						<h2 class="text-lg font-semibold text-white">AI Research</h2>
						<p class="text-sm text-slate-400">Research this company with AI</p>
					</div>
				</div>

				<!-- Topic Input -->
				<div class="mb-4">
					<label for="research-topic" class="block text-sm font-medium text-slate-300 mb-2">
						Research Topic
					</label>
					<textarea
						id="research-topic"
						bind:value={researchTopic}
						placeholder="Enter what you want the AI to research about this company..."
						class="w-full rounded-lg border border-slate-700/50 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
						rows="2"
					></textarea>
				</div>

				<!-- Topic Suggestions -->
				<div class="mb-4">
					<p class="text-xs text-slate-400 mb-2">Suggestions:</p>
					<div class="flex flex-wrap gap-2">
						{#each topicSuggestions as suggestion}
							<button
								onclick={() => selectSuggestion(suggestion)}
								class="rounded-full border border-slate-700/50 bg-slate-800/30 px-3 py-1.5 text-xs text-slate-300 transition-all hover:border-violet-500/50 hover:bg-violet-500/10 hover:text-violet-300"
							>
								{suggestion}
							</button>
						{/each}
					</div>
				</div>

				<!-- Research Error -->
				{#if researchError}
					<div class="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 p-3">
						<div class="flex items-center gap-2 text-sm text-red-400">
							<XCircle class="h-4 w-4" />
							{researchError}
						</div>
					</div>
				{/if}

				<!-- Start Research Button -->
				<button
					onclick={startResearch}
					disabled={!researchTopic.trim() || isResearching}
					class="flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#if isResearching}
						<Loader2 class="h-4 w-4 animate-spin" />
						Researching...
					{:else}
						<Play class="h-4 w-4" />
						Start Research
					{/if}
				</button>
			</div>

			<!-- Research History -->
			<div>
				<h2 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
					<FileText class="h-5 w-5 text-violet-400" />
					Research History
				</h2>

				<Collection ref={researchRef}>
					{#snippet children({ data: researches, count })}
						{@const sortedResearches = researches ? [...researches].sort((a: any, b: any) => {
							const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
							const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
							return bTime - aTime;
						}) : []}

						{#if count === 0}
							<div class="rounded-xl border border-slate-800/50 bg-[#141414] p-12 text-center" in:fade>
								<div class="mb-4 inline-flex rounded-2xl bg-slate-800/50 p-6">
									<FileText class="h-12 w-12 text-slate-500" />
								</div>
								<h3 class="mb-2 text-lg font-semibold text-white">No research yet</h3>
								<p class="text-slate-400">
									Start your first research using the form above
								</p>
							</div>
						{:else}
							<div class="space-y-4">
								{#each sortedResearches as research, i (research.id)}
									{@const statusInfo = getStatusInfo(research.status)}
									{@const isExpanded = expandedResearch.has(research.id)}
									
									<div
										class="rounded-xl border border-slate-800/50 bg-[#141414] overflow-hidden transition-all hover:border-slate-700/50"
										in:fly={{ y: 20, duration: 300, delay: i * 50 }}
									>
										<!-- Research Header -->
										<button
											onclick={() => toggleExpanded(research.id)}
											class="w-full flex items-start gap-4 p-4 text-left"
										>
											<!-- Status Icon -->
											<div class="shrink-0 rounded-lg {statusInfo.bgColor} p-2">
												{#if research.status === 'running'}
													<Loader2 class="h-5 w-5 {statusInfo.color} animate-spin" />
												{:else if research.status === 'completed'}
													<CheckCircle2 class="h-5 w-5 {statusInfo.color}" />
												{:else if research.status === 'failed'}
													<XCircle class="h-5 w-5 {statusInfo.color}" />
												{:else}
													<Clock class="h-5 w-5 {statusInfo.color}" />
												{/if}
											</div>

											<div class="flex-1 min-w-0">
												<div class="flex items-start justify-between gap-2">
													<div>
														<h3 class="font-medium text-white line-clamp-2">
															{research.topic}
														</h3>
														<div class="mt-1 flex items-center gap-3 text-xs text-slate-500">
															<span class="flex items-center gap-1">
																<Calendar class="h-3 w-3" />
																{formatDate(research.createdAt)}
															</span>
															<span class="capitalize {statusInfo.color}">
																{research.status}
															</span>
														</div>
													</div>
													<div class="shrink-0">
														{#if isExpanded}
															<ChevronUp class="h-5 w-5 text-slate-400" />
														{:else}
															<ChevronDown class="h-5 w-5 text-slate-400" />
														{/if}
													</div>
												</div>
											</div>
										</button>

										<!-- Research Content (Expanded) -->
										{#if isExpanded}
											<div class="border-t border-slate-800/50" transition:slide={{ duration: 200 }}>
												{#if research.status === 'running'}
													<div class="p-6">
														<div class="flex items-center gap-3 text-slate-400">
															<Loader2 class="h-5 w-5 animate-spin" />
															<span>Research in progress... Results will appear here.</span>
														</div>
														{#if research.content}
															<div class="mt-4 prose prose-invert prose-sm max-w-none">
																{@html renderMarkdown(research.content)}
															</div>
														{/if}
													</div>
												{:else if research.status === 'failed'}
													<div class="p-6">
														<div class="rounded-lg border border-red-500/50 bg-red-500/10 p-4">
															<div class="flex items-center gap-2 text-red-400">
																<XCircle class="h-5 w-5" />
																<span class="font-medium">Research Failed</span>
															</div>
															{#if research.error}
																<p class="mt-2 text-sm text-red-300">{research.error}</p>
															{/if}
														</div>
													</div>
												{:else if research.content}
													<div class="p-6">
														<div class="prose prose-invert prose-sm max-w-none">
															{@html renderMarkdown(research.content)}
														</div>
														{#if research.completedAt}
															<div class="mt-4 pt-4 border-t border-slate-800/50 text-xs text-slate-500">
																Completed {formatDate(research.completedAt)}
															</div>
														{/if}
													</div>
												{:else}
													<div class="p-6 text-slate-400">
														No content available
													</div>
												{/if}
											</div>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					{/snippet}

					{#snippet loading()}
						<div class="flex items-center justify-center py-12">
							<div class="flex items-center gap-3 text-slate-400">
								<Loader2 class="h-6 w-6 animate-spin" />
								<span>Loading research history...</span>
							</div>
						</div>
					{/snippet}
				</Collection>
			</div>
		</div>
	</div>
</div>
			{/snippet}

			{#snippet loading()}
				<div class="flex min-h-screen items-center justify-center bg-[#0f0f0f]">
					<div class="flex items-center gap-3 text-slate-400">
						<Loader2 class="h-6 w-6 animate-spin" />
						<span>Loading company...</span>
					</div>
				</div>
			{/snippet}
		</Doc>
	{/snippet}

	{#snippet loading()}
		<div class="flex min-h-screen items-center justify-center bg-[#0f0f0f]">
			<div class="flex items-center gap-3 text-slate-400">
				<Loader2 class="h-6 w-6 animate-spin" />
				<span>Loading project...</span>
			</div>
		</div>
	{/snippet}
</Doc>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
