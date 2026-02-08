<script lang="ts">
	import type { PageProps } from './$types';
	import { page } from '$app/stores';
	import Doc from '$lib/components/Doc.svelte';
	import Collection from '$lib/components/Collection.svelte';
	import CreateEditProject from '$lib/components/CreateEditProject.svelte';
	import { getFirebaseContext } from '$lib/stores/sdk.svelte';
	import type { Project, ProjectCompany, AddCompanyRequest } from '$lib/types/project';
	import {
		ArrowLeft,
		Edit,
		Archive,
		ArchiveRestore,
		Trash2,
		Building2,
		Plus,
		X,
		MapPin,
		ExternalLink,
		Calendar,
		Tag,
		FileText,
		AlertCircle,
		Loader2,
		Search,
		Sparkles,
		Play,
		CheckCircle2,
		XCircle,
		Clock,
		Bot,
		Send,
		Mic,
		ChevronRight,
		FlaskConical
	} from '@lucide/svelte';
	import { fly, fade, slide } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { Chat } from '@ai-sdk/svelte';
	import { DefaultChatTransport, type UIMessage } from 'ai';
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';
	import { useMermaid } from '$lib/actions/mermaid';
	let { data }: PageProps = $props();

	// Get Firebase context
	const { firestore } = getFirebaseContext();

	// Get project ID and build ref
	const projectId = $derived($page.params.project_id || '');
	const projectRef = $derived(`projects/${projectId}`);
	const companiesRef = $derived(`projects/${projectId}/companies`);

	// Tab state
	let activeTab = $state<'analysis' | 'companies' | 'details'>('analysis');

	// Modal state
	let showCreateEditModal = $state(false);
	let showDeleteConfirm = $state(false);
	let showAddCompanyModal = $state(false);
	let removingCompanyId = $state<string | null>(null);
	let editingProject = $state<Project | null>(null);

	// Research unresearched companies state
	let showResearchPanel = $state(false);
	let researchTopic = $state('');
	let isResearching = $state(false);
	let researchProgress = $state<{ total: number; completed: number } | null>(null);
	let researchError = $state<string | null>(null);

	// Research topic suggestions
	const topicSuggestions = [
		'Research about the company',
		'Summarize company overview and key information',
		'Find potential business opportunities',
		'Analyze competitive advantages'
	];

	// Store initial values from server data
	const initialProjectId = data.projectId;
	const initialChatMessages = (data.initialChatMessages ?? []) as UIMessage[];

	// Project analysis chat
	const projectChat = new Chat({
		transport: new DefaultChatTransport({
			api: '/api/v1/project-chat',
			body: { projectId: initialProjectId, threadId: `project_${initialProjectId}` }
		}),
		messages: initialChatMessages
	});

	let chatQuery = $state('');

	function handleChatSubmit(event: Event) {
		event.preventDefault();
		if (!chatQuery.trim()) return;
		projectChat.sendMessage({ text: chatQuery });
		chatQuery = '';
	}

	// Configure marked
	marked.setOptions({ breaks: true, gfm: true });

	function parseMarkdown(content: string): string {
		const html = marked(content) as string;
		const sanitized = DOMPurify.sanitize(html, {
			ALLOWED_TAGS: ['h1','h2','h3','h4','h5','h6','p','br','hr','ul','ol','li','strong','em','b','i','u','s','del','ins','a','code','pre','blockquote','table','thead','tbody','tr','th','td','span','div','img','svg','g','path','rect','circle','text','line','polyline','polygon','foreignObject','marker','defs'],
			ALLOWED_ATTR: ['class','href','target','rel','src','alt','title','id','name','style','viewBox','xmlns','d','fill','stroke','transform','x','y','width','height','cx','cy','r','rx','ry','x1','y1','x2','y2','points','marker-end','marker-start','text-anchor','dominant-baseline','font-size','font-family'],
			ALLOW_DATA_ATTR: true,
			ADD_ATTR: ['class']
		});
		const parser = new DOMParser();
		const doc = parser.parseFromString(sanitized, 'text/html');
		doc.querySelectorAll('a').forEach(link => {
			link.setAttribute('target', '_blank');
			link.setAttribute('rel', 'noopener noreferrer');
		});
		return doc.body.innerHTML;
	}

	function getLastAIResponse(message: UIMessage) {
		if (message.parts.length === 0) return null;
		for (let i = message.parts.length - 1; i >= 0; i--) {
			const part = message.parts[i];
			if (part.type === 'step-start') continue;
			if (part.type === 'text' && part.text.length > 0) return part.text;
		}
		return null;
	}

	function getLastAIPart(message: UIMessage) {
		for (let i = message.parts.length - 1; i >= 0; i--) {
			const part = message.parts[i];
			if (part.type === 'step-start') continue;
			if (part.type === 'text' && part.text.length === 0) continue;
			return part;
		}
		return null;
	}

	function formatToolName(toolName: string) {
		return toolName.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
	}

	// Open edit modal
	function openEditModal(proj: Project) {
		if (!proj) return;
		editingProject = { ...proj, id: projectId };
		showCreateEditModal = true;
	}

	// Toggle project status
	async function toggleStatus(proj: Project) {
		if (!proj) return;
		const newStatus = proj.status === 'active' ? 'archived' : 'active';
		try {
			await fetch(`/api/v1/project-detail?id=${projectId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: newStatus })
			});
		} catch (err) {
			console.error('Failed to toggle status:', err);
		}
	}

	// Delete project
	async function deleteProject(pid: string) {
		if (!pid) return;
		try {
			const response = await fetch(`/api/v1/project-detail?id=${pid}`, { method: 'DELETE' });
			const result = await response.json();
			if (!result.success) {
				console.error('Failed to delete project:', result.error);
				return;
			}
			goto('/app/projects');
		} catch (err) {
			console.error('Failed to delete project:', err);
		}
	}

	// Remove company from project
	async function removeCompany(companyId: string, pid: string) {
		if (!pid) return;
		try {
			const response = await fetch(`/api/v1/project-companies?projectId=${pid}&companyId=${companyId}`, {
				method: 'DELETE'
			});
			const result = await response.json();
			if (!result.success) console.error('Failed to remove company:', result.error);
			removingCompanyId = null;
		} catch (err) {
			console.error('Failed to remove company:', err);
		}
	}

	// Start research for unresearched companies
	async function startResearchUnresearched(companies: ProjectCompany[]) {
		const unresearched = companies.filter(c => !c.researchCount || c.researchCount === 0);
		if (!researchTopic.trim() || unresearched.length === 0) return;

		isResearching = true;
		researchError = null;
		researchProgress = { total: unresearched.length, completed: 0 };

		try {
			const companyIds = unresearched.map(c => c.document_id);
			const response = await fetch('/api/v1/research', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ projectId, companyIds, topic: researchTopic.trim() })
			});
			const result = await response.json();
			if (!result.success) {
				researchError = result.error || 'Failed to start research';
				return;
			}
			researchProgress = { total: result.summary.total, completed: result.summary.successful };
			researchTopic = '';
		} catch (err) {
			console.error('Failed to start research:', err);
			researchError = err instanceof Error ? err.message : 'Failed to start research';
		} finally {
			isResearching = false;
		}
	}

	function formatDate(timestamp: any): string {
		if (!timestamp) return '';
		const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
		return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
	}
</script>

<Doc ref={projectRef}>
	{#snippet children({ data: project }: { data: Project })}

<div class="flex flex-col h-[calc(100vh-64px)] bg-[#0f0f0f]">
	<!-- Header -->
	<div class="shrink-0 border-b border-slate-800/50 bg-[#0a0a0a] px-4 py-4 md:px-8">
		<div class="mx-auto max-w-7xl">
			<a href="/app/projects" class="mb-3 inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white">
				<ArrowLeft class="h-4 w-4" />
				Back to Projects
			</a>
			<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-3 mb-1">
						<h1 class="text-xl font-bold text-white md:text-2xl">{project.name}</h1>
						{#if project.status === 'active'}
							<span class="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400">Active</span>
						{:else}
							<span class="rounded-full bg-slate-500/20 px-2.5 py-0.5 text-xs font-medium text-slate-400">Archived</span>
						{/if}
					</div>
					<p class="text-sm text-slate-400">{project.description || 'No description'}</p>
				</div>
				<div class="flex flex-wrap gap-2">
					<button onclick={() => openEditModal(project)} class="flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-slate-800">
						<Edit class="h-3.5 w-3.5" /> Edit
					</button>
					<button onclick={() => toggleStatus(project)} class="flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-slate-800">
						{#if project.status === 'active'}<Archive class="h-3.5 w-3.5" /> Archive{:else}<ArchiveRestore class="h-3.5 w-3.5" /> Restore{/if}
					</button>
					<button onclick={() => (showDeleteConfirm = true)} class="flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-all hover:bg-red-500/20">
						<Trash2 class="h-3.5 w-3.5" /> Delete
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Companies collection wrapper -->
	<Collection ref={companiesRef}>
		{#snippet children({ data: companiesData, count })}
			{@const companies = (companiesData ? [...companiesData].sort((a, b) => {
				const aTime = (a as any).addedAt?.toMillis ? (a as any).addedAt.toMillis() : 0;
				const bTime = (b as any).addedAt?.toMillis ? (b as any).addedAt.toMillis() : 0;
				return bTime - aTime;
			}) : []) as ProjectCompany[]}
			{@const unresearchedCompanies = companies.filter(c => !c.researchCount || c.researchCount === 0)}
			{@const researchedCount = companies.length - unresearchedCompanies.length}

	<!-- Tabs -->
	<div class="shrink-0 border-b border-slate-800/50 bg-[#0a0a0a] px-4 md:px-8">
		<div class="mx-auto max-w-7xl">
			<div class="flex gap-6">
				<button
					onclick={() => (activeTab = 'analysis')}
					class="relative py-3 text-sm font-medium transition-colors {activeTab === 'analysis' ? 'text-violet-400' : 'text-slate-400 hover:text-white'}"
				>
					<div class="flex items-center gap-2">
						<Sparkles class="h-4 w-4" />
						<span>AI Analysis</span>
					</div>
					{#if activeTab === 'analysis'}
						<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-400" transition:fade></div>
					{/if}
				</button>
				<button
					onclick={() => (activeTab = 'companies')}
					class="relative py-3 text-sm font-medium transition-colors {activeTab === 'companies' ? 'text-violet-400' : 'text-slate-400 hover:text-white'}"
				>
					<div class="flex items-center gap-2">
						<Building2 class="h-4 w-4" />
						<span>Companies ({count})</span>
						{#if researchedCount > 0}
							<span class="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-xs text-emerald-400">{researchedCount}</span>
						{/if}
					</div>
					{#if activeTab === 'companies'}
						<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-400" transition:fade></div>
					{/if}
				</button>
				<button
					onclick={() => (activeTab = 'details')}
					class="relative py-3 text-sm font-medium transition-colors {activeTab === 'details' ? 'text-violet-400' : 'text-slate-400 hover:text-white'}"
				>
					<div class="flex items-center gap-2">
						<FileText class="h-4 w-4" />
						<span>Details</span>
					</div>
					{#if activeTab === 'details'}
						<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-400" transition:fade></div>
					{/if}
				</button>
			</div>
		</div>
	</div>

	<!-- Content -->
	<div class="flex-1 flex flex-col overflow-hidden">
		{#if activeTab === 'analysis'}
			<!-- AI Analysis Tab - Chat Interface -->
			<div class="flex flex-1 flex-col overflow-hidden">
				<!-- Research unresearched banner -->
				{#if unresearchedCompanies.length > 0}
					<div class="shrink-0 border-b border-amber-500/30 bg-amber-900/10 px-4 py-3 md:px-8">
						<div class="mx-auto max-w-7xl flex items-center justify-between gap-3">
							<div class="flex items-center gap-2 text-sm text-amber-300">
								<FlaskConical class="h-4 w-4 shrink-0" />
								<span>{unresearchedCompanies.length} of {companies.length} companies have not been researched yet</span>
							</div>
							<button
								onclick={() => (showResearchPanel = !showResearchPanel)}
								class="flex items-center gap-1.5 rounded-lg bg-amber-600/20 px-3 py-1.5 text-xs font-medium text-amber-300 transition-all hover:bg-amber-600/30"
							>
								<Play class="h-3.5 w-3.5" />
								Research Now
							</button>
						</div>

						{#if showResearchPanel}
							<div class="mx-auto max-w-7xl mt-3 rounded-lg border border-amber-500/30 bg-[#141414] p-4" transition:slide={{ duration: 200 }}>
								<div class="mb-3">
									<label for="research-topic" class="block text-sm font-medium text-slate-300 mb-1.5">Research Topic</label>
									<textarea
										id="research-topic"
										bind:value={researchTopic}
										placeholder="What should the AI research about these companies?"
										class="w-full rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none resize-none"
										rows="2"
									></textarea>
								</div>
								<div class="mb-3 flex flex-wrap gap-1.5">
									{#each topicSuggestions as suggestion}
										<button
											onclick={() => (researchTopic = suggestion)}
											class="rounded-full border border-slate-700/50 bg-slate-800/30 px-2.5 py-1 text-xs text-slate-300 transition-all hover:border-violet-500/50 hover:bg-violet-500/10"
										>
											{suggestion}
										</button>
									{/each}
								</div>
								{#if researchError}
									<div class="mb-3 rounded-lg border border-red-500/50 bg-red-500/10 p-2">
										<div class="flex items-center gap-2 text-xs text-red-400"><XCircle class="h-3.5 w-3.5" />{researchError}</div>
									</div>
								{/if}
								{#if researchProgress}
									<div class="mb-3 rounded-lg border border-violet-500/50 bg-violet-500/10 p-2">
										<div class="flex items-center gap-2 text-xs text-violet-300"><CheckCircle2 class="h-3.5 w-3.5" />Research started for {researchProgress.completed}/{researchProgress.total} companies</div>
									</div>
								{/if}
								<button
									onclick={() => startResearchUnresearched(companies)}
									disabled={!researchTopic.trim() || isResearching}
									class="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
								>
									{#if isResearching}<Loader2 class="h-4 w-4 animate-spin" />Starting...{:else}<Play class="h-4 w-4" />Research {unresearchedCompanies.length} Companies{/if}
								</button>
							</div>
						{/if}
					</div>
				{/if}

				<!-- Chat messages area -->
				<div class="flex-1 overflow-y-auto px-4 py-6 md:px-8">
					<div class="mx-auto max-w-4xl">
						{#if projectChat.messages.length === 0}
							<!-- Empty state -->
							<div class="flex flex-col items-center justify-center py-16 text-center">
								<div class="mb-4 rounded-2xl bg-linear-to-br from-violet-600/20 to-purple-600/20 p-6">
									<Sparkles class="h-12 w-12 text-violet-400" />
								</div>
								<h3 class="mb-2 text-xl font-semibold text-white">Project Analysis</h3>
								<p class="mb-2 max-w-md text-slate-400">
									Ask the AI to analyze, compare, and provide insights about the companies and their research in this project.
								</p>
								{#if researchedCount > 0}
									<p class="text-sm text-emerald-400">{researchedCount} companies with research data available</p>
								{:else if companies.length > 0}
									<p class="text-sm text-amber-400">No research data yet. Research your companies first for better analysis.</p>
								{:else}
									<p class="text-sm text-slate-500">Add companies to this project to get started.</p>
								{/if}

								<!-- Suggestion chips -->
								{#if companies.length > 0}
									<div class="mt-6 flex flex-wrap justify-center gap-2">
										{#each ['Summarize all companies in this project', 'Compare these companies', 'What are the key business opportunities?', 'Analyze market position of these companies'] as suggestion}
											<button
												onclick={() => { chatQuery = suggestion; handleChatSubmit(new Event('submit')); }}
												class="rounded-full border border-slate-700/50 bg-[#1a1a1a] px-4 py-2 text-sm text-slate-300 transition-all hover:border-violet-500/50 hover:bg-violet-500/10 hover:text-white"
											>
												{suggestion}
											</button>
										{/each}
									</div>
								{/if}
							</div>
						{:else}
							<!-- Chat messages -->
							{#each projectChat.messages as message, messageIndex (messageIndex)}
								{#if message.role === 'user'}
									{@const messageText = message.parts[0]?.type === 'text' ? message.parts[0]?.text : ''}
									<div class="mb-4 flex items-center justify-end gap-3">
										<div class="inline-flex items-center gap-2 rounded-full bg-primary border border-slate-700/50 px-4 py-2">
											<span class="text-white text-sm">{messageText}</span>
										</div>
									</div>
								{/if}
								{#if message.role === 'assistant'}
									{@const lastAIResponse = getLastAIResponse(message)}
									{@const lastPart = getLastAIPart(message)}
									<div class="prose prose-invert prose-headings:my-0 max-w-none mb-4" in:fly={{ y: 20, duration: 400 }}>
										<div class="flex items-start gap-3">
											<div class="shrink-0 rounded-xl bg-linear-to-br from-violet-600 to-purple-700 p-2.5">
												<Bot class="h-5 w-5 text-white" />
											</div>
											<div class="flex-1 w-full overflow-y-auto">
												<div class="text-slate-300 leading-relaxed space-y-3 inline-flex items-center gap-2 rounded-lg bg-[#1a1a1a] border border-slate-700/50 px-4 py-2 w-full min-h-12 overflow-y-auto">
													{#if lastPart && lastPart.type === 'dynamic-tool'}
														<span class="skeleton skeleton-text" transition:fade={{ duration: 300 }}>Using {formatToolName(lastPart.toolName)} Tool</span>
													{/if}
													{#if lastAIResponse}
														<div in:fade={{ duration: 300, delay: 300 }} use:useMermaid={lastAIResponse}>
															{@html parseMarkdown(lastAIResponse)}
														</div>
													{/if}
												</div>
											</div>
										</div>
									</div>
								{/if}
							{/each}

							{#if projectChat.status === 'submitted'}
								<div class="flex items-center gap-3 text-slate-400 mb-4">
									<div class="flex gap-1">
										<span class="h-2 w-2 rounded-full bg-violet-500 animate-bounce" style="animation-delay: 0ms"></span>
										<span class="h-2 w-2 rounded-full bg-violet-500 animate-bounce" style="animation-delay: 150ms"></span>
										<span class="h-2 w-2 rounded-full bg-violet-500 animate-bounce" style="animation-delay: 300ms"></span>
									</div>
									<span>Analyzing project data...</span>
								</div>
							{/if}
						{/if}
					</div>
				</div>

				<!-- Chat input -->
				<div class="shrink-0 border-t border-slate-800/50 bg-[#0f0f0f] px-4 py-4 md:px-8">
					<div class="mx-auto max-w-4xl">
						<form onsubmit={(e) => { e.preventDefault(); handleChatSubmit(e); }}>
							<div class="flex items-center gap-3 rounded-2xl border border-slate-700/50 bg-[#1a1a1a] px-4 py-3 transition-all focus-within:border-violet-500/50">
								<input
									type="text"
									bind:value={chatQuery}
									placeholder="Ask about your project's companies and research..."
									class="flex-1 bg-transparent text-white placeholder-slate-500 outline-none! border-none focus:outline-none! focus:ring-0 focus:border-none min-w-0"
								/>
								<button
									type="submit"
									disabled={!chatQuery.trim() || projectChat.status !== 'ready'}
									class="shrink-0 rounded-xl bg-violet-600 p-2.5 text-white transition-all hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<Send class="h-5 w-5" />
								</button>
							</div>
						</form>
					</div>
				</div>
			</div>

		{:else if activeTab === 'companies'}
			<!-- Companies Tab -->
			<div class="flex-1 overflow-y-auto px-4 py-6 md:px-8">
				<div class="mx-auto max-w-7xl space-y-6">
					<!-- Add company button -->
					<div class="flex items-center justify-between">
						<p class="text-sm text-slate-400">
							{companies.length} {companies.length === 1 ? 'company' : 'companies'} in this project
							{#if researchedCount > 0}
								<span class="text-emerald-400">({researchedCount} researched)</span>
							{/if}
						</p>
						<button
							onclick={() => (showAddCompanyModal = true)}
							class="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-violet-500"
						>
							<Plus class="h-5 w-5" />
							Add Company
						</button>
					</div>

					<!-- Companies grid -->
					{#if companies.length === 0}
						<div class="flex flex-col items-center justify-center rounded-xl border border-slate-800/50 bg-[#141414] p-12 text-center" in:fade={{ duration: 300 }}>
							<div class="mb-4 rounded-2xl bg-violet-600/10 p-6">
								<Building2 class="h-16 w-16 text-violet-400" />
							</div>
							<h3 class="mb-2 text-xl font-semibold text-white">No companies yet</h3>
							<p class="mb-6 max-w-md text-slate-400">Add companies from search results or use the button above</p>
							<button onclick={() => (showAddCompanyModal = true)} class="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-violet-500">
								<Plus class="h-5 w-5" /> Add Your First Company
							</button>
						</div>
					{:else}
						<div class="space-y-3">
							{#each companies as company, i (company.document_id)}
								{@const isResearched = (company.researchCount ?? 0) > 0}
								<div
									class="group flex items-start gap-3 rounded-lg border border-slate-800/50 bg-[#141414] p-4 transition-all hover:border-violet-500/50 hover:bg-[#1a1a1a]"
									in:fly={{ y: 20, duration: 300, delay: i * 30 }}
								>
									<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-violet-600/20 to-purple-600/20 text-sm font-semibold text-violet-400">
										{i + 1}
									</div>
									<div class="flex-1 min-w-0">
										<div class="flex items-start justify-between gap-2 mb-1">
											<div class="flex items-center gap-2 min-w-0">
												<h4 class="text-base font-medium text-white line-clamp-1 group-hover:text-violet-400 transition-colors">
													{company.name}
												</h4>
												<!-- Research status badge -->
												{#if isResearched}
													<span class="shrink-0 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400 flex items-center gap-1">
														<CheckCircle2 class="h-3 w-3" />
														{company.researchCount}
													</span>
												{:else}
													<span class="shrink-0 rounded-full bg-slate-500/20 px-2 py-0.5 text-xs text-slate-400">
														Not researched
													</span>
												{/if}
											</div>
											<div class="flex items-center gap-1 shrink-0">
												<a
													href="/app/projects/{projectId}/{company.document_id}"
													class="btn btn-sm bg-violet-600 transition-all hover:bg-violet-500"
													title="View & Research"
												>
													<Sparkles class="h-4 w-4" /> Research
												</a>
												<a href="/app/company/{company.document_id}" target="_blank" class="btn btn-sm btn-ghost" title="View company details">
													<ExternalLink class="h-4 w-4" />
												</a>
												<button onclick={() => (removingCompanyId = company.document_id)} class="btn btn-ghost btn-sm btn-error btn-square" title="Remove from project">
													<Trash2 class="h-4 w-4" />
												</button>
											</div>
										</div>
										<p class="text-sm text-slate-400 line-clamp-2 mb-2">{company.businessdomain}</p>
										{#if company.address && company.address !== 'N/A'}
											<div class="flex items-center gap-1.5 text-xs text-slate-500">
												<MapPin class="h-3 w-3 shrink-0" />
												<span class="truncate">{company.address}</span>
											</div>
										{/if}
										<div class="mt-2 text-xs text-slate-500">Added {formatDate(company.addedAt)}</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>

		{:else}
			<!-- Details Tab -->
			<div class="flex-1 overflow-y-auto px-4 py-6 md:px-8">
				<div class="mx-auto max-w-3xl space-y-6">
					<div class="rounded-xl border border-slate-800/50 bg-[#141414] p-6">
						<h3 class="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
							<FileText class="h-5 w-5 text-violet-400" /> Description
						</h3>
						<p class="text-slate-300">{project.description || 'No description provided'}</p>
					</div>
					<div class="rounded-xl border border-slate-800/50 bg-[#141414] p-6">
						<h3 class="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
							<FileText class="h-5 w-5 text-violet-400" /> Notes
						</h3>
						<p class="text-slate-300 whitespace-pre-wrap">{project.notes || 'No notes'}</p>
					</div>
					<div class="rounded-xl border border-slate-800/50 bg-[#141414] p-6">
						<h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
							<Calendar class="h-5 w-5 text-violet-400" /> Information
						</h3>
						<div class="space-y-3">
							<div class="flex items-center justify-between border-b border-slate-800/50 pb-3">
								<span class="text-sm text-slate-400">Created</span>
								<span class="text-sm text-white">{formatDate(project.createdAt)}</span>
							</div>
							<div class="flex items-center justify-between border-b border-slate-800/50 pb-3">
								<span class="text-sm text-slate-400">Last Updated</span>
								<span class="text-sm text-white">{formatDate(project.updatedAt)}</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-sm text-slate-400">Status</span>
								{#if project.status === 'active'}
									<span class="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-400">Active</span>
								{:else}
									<span class="rounded-full bg-slate-500/20 px-2.5 py-1 text-xs font-medium text-slate-400">Archived</span>
								{/if}
							</div>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
		{/snippet}

		{#snippet loading()}
			<div class="flex min-h-50 items-center justify-center">
				<div class="flex items-center gap-3 text-slate-400">
					<Loader2 class="h-6 w-6 animate-spin" />
					<span>Loading companies...</span>
				</div>
			</div>
		{/snippet}
	</Collection>
</div>
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

<!-- Edit Modal -->
<CreateEditProject bind:show={showCreateEditModal} bind:project={editingProject} />

<!-- Delete Confirmation -->
{#if showDeleteConfirm}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" transition:fade={{ duration: 150 }}>
		<button class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick={() => (showDeleteConfirm = false)} aria-label="Close modal"></button>
		<div class="relative w-full max-w-md rounded-2xl border border-slate-800/50 bg-[#141414] p-6 shadow-xl" transition:fly={{ y: 20, duration: 300 }}>
			<div class="mb-4 flex items-center gap-3">
				<div class="rounded-full bg-red-500/20 p-3"><AlertCircle class="h-6 w-6 text-red-400" /></div>
				<div>
					<h3 class="text-lg font-bold text-white">Delete Project</h3>
					<p class="text-sm text-slate-400">This action cannot be undone</p>
				</div>
			</div>
			<p class="mb-6 text-slate-300">Are you sure you want to delete this project? All companies and research will be removed.</p>
			<div class="flex gap-3">
				<button onclick={() => (showDeleteConfirm = false)} class="flex-1 rounded-lg border border-slate-700/50 bg-slate-800/50 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">Cancel</button>
				<button onclick={() => deleteProject(projectId)} class="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-500">Delete Project</button>
			</div>
		</div>
	</div>
{/if}

<!-- Remove Company Confirmation -->
{#if removingCompanyId}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" transition:fade={{ duration: 150 }}>
		<button class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick={() => (removingCompanyId = null)} aria-label="Close modal"></button>
		<div class="relative w-full max-w-md rounded-2xl border border-slate-800/50 bg-[#141414] p-6 shadow-xl" transition:fly={{ y: 20, duration: 300 }}>
			<div class="mb-4 flex items-center gap-3">
				<div class="rounded-full bg-red-500/20 p-3"><AlertCircle class="h-6 w-6 text-red-400" /></div>
				<div>
					<h3 class="text-lg font-bold text-white">Remove Company</h3>
					<p class="text-sm text-slate-400">Remove from this project</p>
				</div>
			</div>
			<p class="mb-6 text-slate-300">Are you sure you want to remove this company? All research for this company will also be deleted.</p>
			<div class="flex gap-3">
				<button onclick={() => (removingCompanyId = null)} class="flex-1 rounded-lg border border-slate-700/50 bg-slate-800/50 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">Cancel</button>
				<button onclick={() => removeCompany(removingCompanyId!, projectId)} class="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-500">Remove</button>
			</div>
		</div>
	</div>
{/if}

<!-- Add Company Modal -->
{#if showAddCompanyModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" transition:fade={{ duration: 150 }}>
		<button class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick={() => (showAddCompanyModal = false)} aria-label="Close modal"></button>
		<div class="relative w-full max-w-lg rounded-2xl border border-slate-800/50 bg-[#141414] p-6 shadow-xl" transition:fly={{ y: 20, duration: 300 }}>
			<div class="mb-6 flex items-center justify-between">
				<h2 class="text-xl font-bold text-white">Add Company</h2>
				<button onclick={() => (showAddCompanyModal = false)} class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"><X class="h-5 w-5" /></button>
			</div>
			<div class="mb-6 rounded-lg border border-violet-500/50 bg-violet-500/10 p-4">
				<div class="flex items-start gap-3">
					<AlertCircle class="h-5 w-5 shrink-0 text-violet-400" />
					<div class="text-sm text-violet-300">
						<p class="font-medium mb-1">Add companies from search results</p>
						<p class="text-violet-400/80">Use the search page to find companies, then click "Add to Project" on each card.</p>
					</div>
				</div>
			</div>
			<div class="flex gap-3">
				<button onclick={() => (showAddCompanyModal = false)} class="flex-1 rounded-lg border border-slate-700/50 bg-slate-800/50 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">Close</button>
				<a href="/app" class="flex-1 rounded-lg bg-violet-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-violet-500">Go to Search</a>
			</div>
		</div>
	</div>
{/if}

<style>
	.line-clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
	.line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
</style>
