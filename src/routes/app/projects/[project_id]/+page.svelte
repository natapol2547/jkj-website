<script lang="ts">
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
		Clock
	} from '@lucide/svelte';
	import { fly, fade } from 'svelte/transition';
	import { goto } from '$app/navigation';

	// Get Firebase context
	const { firestore } = getFirebaseContext();

	// Get project ID and build ref
	const projectId = $derived($page.params.project_id || '');
	const projectRef = $derived(`projects/${projectId}`);
	const companiesRef = $derived(`projects/${projectId}/companies`);

	// Tab state
	let activeTab = $state<'companies' | 'details'>('companies');

	// Modal state
	let showCreateEditModal = $state(false);
	let showDeleteConfirm = $state(false);
	let showAddCompanyModal = $state(false);
	let removingCompanyId = $state<string | null>(null);
	let editingProject = $state<Project | null>(null);

	// Research state
	let researchTopic = $state('');
	let isResearching = $state(false);
	let researchProgress = $state<{ total: number; completed: number } | null>(null);
	let researchError = $state<string | null>(null);

	// Research topic suggestions
	const topicSuggestions = [
		'Research about the company',
		'Write a professional email introducing our services',
		'Analyze competitive advantages',
		'Summarize company overview and key information',
		'Find potential business opportunities',
		'Research market position and competitors'
	];

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
			const response = await fetch(`/api/v1/project-detail?id=${projectId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: newStatus })
			});

			if (!response.ok) {
				console.error('Failed to toggle status');
			}
		} catch (err) {
			console.error('Failed to toggle status:', err);
		}
	}

	// Delete project
	async function deleteProject(projectId: string) {
		if (!projectId) return;

		try {
			const response = await fetch(`/api/v1/project-detail?id=${projectId}`, {
				method: 'DELETE'
			});

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
	async function removeCompany(companyId: string, projectId: string) {
		if (!projectId) return;

		try {
			const response = await fetch(`/api/v1/project-companies?projectId=${projectId}&companyId=${companyId}`, {
				method: 'DELETE'
			});

			const result = await response.json();

			if (!result.success) {
				console.error('Failed to remove company:', result.error);
			}

			removingCompanyId = null;
		} catch (err) {
			console.error('Failed to remove company:', err);
		}
	}

	// Start research for all companies
	async function startResearchAll(companies: ProjectCompany[]) {
		if (!researchTopic.trim() || companies.length === 0) return;

		isResearching = true;
		researchError = null;
		researchProgress = { total: companies.length, completed: 0 };

		try {
			const companyIds = companies.map(c => c.document_id);

			const response = await fetch('/api/v1/research', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					projectId,
					companyIds,
					topic: researchTopic.trim()
				})
			});

			const result = await response.json();

			if (!result.success) {
				researchError = result.error || 'Failed to start research';
				return;
			}

			// Research started - progress will be tracked through Firestore real-time updates
			researchProgress = {
				total: result.summary.total,
				completed: result.summary.successful
			};

			// Clear the topic input on success
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

	// Format date
	function formatDate(timestamp: any): string {
		if (!timestamp) return '';
		const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
		return date.toLocaleDateString('th-TH', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<Doc ref={projectRef}>
	{#snippet children({ data: project }: { data: Project })}

<div class="min-h-screen bg-[#0f0f0f]">
	<!-- Header -->
	<div class="border-b border-slate-800/50 bg-[#0a0a0a] px-4 py-6 md:px-8">
		<div class="mx-auto max-w-7xl">
			<!-- Back button -->
			<a
				href="/app/projects"
				class="mb-4 inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
			>
				<ArrowLeft class="h-4 w-4" />
				Back to Projects
			</a>

			<!-- Title and actions -->
			<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-3 mb-2">
						<h1 class="text-2xl font-bold text-white md:text-3xl">
							{project.name}
						</h1>
						{#if project.status === 'active'}
							<span class="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400">
								Active
							</span>
						{:else}
							<span class="rounded-full bg-slate-500/20 px-3 py-1 text-xs font-medium text-slate-400">
								Archived
							</span>
						{/if}
					</div>
					<p class="text-slate-400">{project.description || 'No description'}</p>
					
					<!-- Tags -->
					{#if project.tags && project.tags.length > 0}
						<div class="mt-3 flex flex-wrap gap-2">
							{#each project.tags as tag}
								<span class="inline-flex items-center gap-1.5 rounded-md bg-violet-600/20 px-2.5 py-1 text-sm text-violet-400">
									<Tag class="h-3 w-3" />
									{tag}
								</span>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Actions -->
				<div class="flex flex-wrap gap-2">
					<button
						onclick={() => openEditModal(project)}
						class="flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/50 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-slate-800"
					>
						<Edit class="h-4 w-4" />
						Edit
					</button>
					<button
						onclick={() => toggleStatus(project)}
						class="flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/50 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-slate-800"
					>
						{#if project.status === 'active'}
							<Archive class="h-4 w-4" />
							Archive
						{:else}
							<ArchiveRestore class="h-4 w-4" />
							Restore
						{/if}
					</button>
					<button
						onclick={() => (showDeleteConfirm = true)}
						class="flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-all hover:bg-red-500/20"
					>
						<Trash2 class="h-4 w-4" />
						Delete
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Use Collection component to get companies from subcollection -->
	<Collection ref={companiesRef}>
		{#snippet children({ data: companiesData, count })}
			{@const companies = (companiesData ? [...companiesData].sort((a: any, b: any) => {
				const aTime = a.addedAt?.toMillis ? a.addedAt.toMillis() : 0;
				const bTime = b.addedAt?.toMillis ? b.addedAt.toMillis() : 0;
				return bTime - aTime;
			}) : []) as ProjectCompany[]}

	<!-- Tabs -->
	<div class="border-b border-slate-800/50 bg-[#0a0a0a] px-4 md:px-8">
		<div class="mx-auto max-w-7xl">
			<div class="flex gap-6">
				<button
					onclick={() => (activeTab = 'companies')}
					class="relative py-4 text-sm font-medium transition-colors {activeTab === 'companies'
						? 'text-violet-400'
						: 'text-slate-400 hover:text-white'}"
				>
					<div class="flex items-center gap-2">
						<Building2 class="h-4 w-4" />
						<span>Companies ({count})</span>
					</div>
					{#if activeTab === 'companies'}
						<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-400" transition:fade></div>
					{/if}
				</button>
				<button
					onclick={() => (activeTab = 'details')}
					class="relative py-4 text-sm font-medium transition-colors {activeTab === 'details'
						? 'text-violet-400'
						: 'text-slate-400 hover:text-white'}"
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
	<div class="px-4 py-6 md:px-8">
		<div class="mx-auto max-w-7xl">
			{#if activeTab === 'companies'}
				<!-- Companies Tab -->
				<div class="space-y-6">
					<!-- Research All Companies Section -->
					{#if companies.length > 0}
						<div class="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-900/20 to-purple-900/20 p-6">
							<div class="flex items-center gap-3 mb-4">
								<div class="rounded-lg bg-violet-500/20 p-2">
									<Sparkles class="h-5 w-5 text-violet-400" />
								</div>
								<div>
									<h3 class="text-lg font-semibold text-white">AI Research</h3>
									<p class="text-sm text-slate-400">Research all {companies.length} companies with AI</p>
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
									placeholder="Enter the topic you want the AI to research..."
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

							<!-- Research Progress -->
							{#if researchProgress}
								<div class="mb-4 rounded-lg border border-violet-500/50 bg-violet-500/10 p-3">
									<div class="flex items-center gap-2 text-sm text-violet-300">
										<CheckCircle2 class="h-4 w-4" />
										Research started for {researchProgress.completed}/{researchProgress.total} companies
									</div>
								</div>
							{/if}

							<!-- Start Research Button -->
							<button
								onclick={() => startResearchAll(companies)}
								disabled={!researchTopic.trim() || isResearching}
								class="flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{#if isResearching}
									<Loader2 class="h-4 w-4 animate-spin" />
									Starting Research...
								{:else}
									<Play class="h-4 w-4" />
									Start Research for All Companies
								{/if}
							</button>
						</div>
					{/if}

					<!-- Add company button -->
					<div class="flex items-center justify-between">
						<p class="text-sm text-slate-400">
							{companies.length} {companies.length === 1 ? 'company' : 'companies'} in this project
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
						<div
							class="flex flex-col items-center justify-center rounded-xl border border-slate-800/50 bg-[#141414] p-12 text-center"
							in:fade={{ duration: 300 }}
						>
							<div class="mb-4 rounded-2xl bg-violet-600/10 p-6">
								<Building2 class="h-16 w-16 text-violet-400" />
							</div>
							<h3 class="mb-2 text-xl font-semibold text-white">No companies yet</h3>
							<p class="mb-6 max-w-md text-slate-400">
								Add companies to this project from search results or use the Add Company button above
							</p>
							<button
								onclick={() => (showAddCompanyModal = true)}
								class="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-violet-500"
							>
								<Plus class="h-5 w-5" />
								Add Your First Company
							</button>
						</div>
					{:else}
						<div class="space-y-3">
							{#each companies as company, i (company.document_id)}
								<div
									class="group flex items-start gap-3 rounded-lg border border-slate-800/50 bg-[#141414] p-4 transition-all hover:border-violet-500/50 hover:bg-[#1a1a1a]"
									in:fly={{ y: 20, duration: 300, delay: i * 30 }}
								>
									<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600/20 to-purple-600/20 text-sm font-semibold text-violet-400">
										{i + 1}
									</div>
									<div class="flex-1 min-w-0">
										<div class="flex items-start justify-between gap-2 mb-1">
											<h4 class="text-base font-medium text-white line-clamp-1 group-hover:text-violet-400 transition-colors">
												{company.name}
											</h4>
											<div class="flex items-center gap-1 shrink-0">
												<a
													href="/app/projects/{projectId}/{company.document_id}"
													class="btn btn-sm bg-violet-600 transition-all hover:bg-violet-500"
													title="View & Research"
												>
													<Sparkles class="h-4 w-4" />
                                                    Research
												</a>
												<a
													href="/app/company/{company.document_id}"
													target="_blank"
													class="btn btn-sm btn-ghost"
													title="View company details"
												>
													<ExternalLink class="h-4 w-4" />
												</a>
												<button
													onclick={() => (removingCompanyId = company.document_id)}
													class="btn btn-ghost btn-sm btn-error btn-square"
													title="Remove from project"
												>
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
										<div class="mt-2 text-xs text-slate-500">
											Added {formatDate(company.addedAt)}
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{:else}
				<!-- Details Tab -->
				<div class="max-w-3xl space-y-6">
					<!-- Description -->
					<div class="rounded-xl border border-slate-800/50 bg-[#141414] p-6">
						<h3 class="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
							<FileText class="h-5 w-5 text-violet-400" />
							Description
						</h3>
						<p class="text-slate-300">{project.description || 'No description provided'}</p>
					</div>

					<!-- Notes -->
					<div class="rounded-xl border border-slate-800/50 bg-[#141414] p-6">
						<h3 class="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
							<FileText class="h-5 w-5 text-violet-400" />
							Notes
						</h3>
						<p class="text-slate-300 whitespace-pre-wrap">{project.notes || 'No notes'}</p>
					</div>

					<!-- Metadata -->
					<div class="rounded-xl border border-slate-800/50 bg-[#141414] p-6">
						<h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
							<Calendar class="h-5 w-5 text-violet-400" />
							Information
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
									<span class="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-400">
										Active
									</span>
								{:else}
									<span class="rounded-full bg-slate-500/20 px-2.5 py-1 text-xs font-medium text-slate-400">
										Archived
									</span>
								{/if}
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
		{/snippet}

		{#snippet loading()}
			<div class="flex min-h-[200px] items-center justify-center">
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
		<button
			class="absolute inset-0 bg-black/60 backdrop-blur-sm"
			onclick={() => (showDeleteConfirm = false)}
			aria-label="Close modal"
		></button>

		<div
			class="relative w-full max-w-md rounded-2xl border border-slate-800/50 bg-[#141414] p-6 shadow-xl"
			transition:fly={{ y: 20, duration: 300 }}
		>
			<div class="mb-4 flex items-center gap-3">
				<div class="rounded-full bg-red-500/20 p-3">
					<AlertCircle class="h-6 w-6 text-red-400" />
				</div>
				<div>
					<h3 class="text-lg font-bold text-white">Delete Project</h3>
					<p class="text-sm text-slate-400">This action cannot be undone</p>
				</div>
			</div>

			<p class="mb-6 text-slate-300">
				Are you sure you want to delete this project? All companies and research will be removed.
			</p>

			<div class="flex gap-3">
				<button
					onclick={() => (showDeleteConfirm = false)}
					class="flex-1 rounded-lg border border-slate-700/50 bg-slate-800/50 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
				>
					Cancel
				</button>
				<button
					onclick={() => deleteProject(projectId)}
					class="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-500"
				>
					Delete Project
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Remove Company Confirmation -->
{#if removingCompanyId}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" transition:fade={{ duration: 150 }}>
		<button
			class="absolute inset-0 bg-black/60 backdrop-blur-sm"
			onclick={() => (removingCompanyId = null)}
			aria-label="Close modal"
		></button>

		<div
			class="relative w-full max-w-md rounded-2xl border border-slate-800/50 bg-[#141414] p-6 shadow-xl"
			transition:fly={{ y: 20, duration: 300 }}
		>
			<div class="mb-4 flex items-center gap-3">
				<div class="rounded-full bg-red-500/20 p-3">
					<AlertCircle class="h-6 w-6 text-red-400" />
				</div>
				<div>
					<h3 class="text-lg font-bold text-white">Remove Company</h3>
					<p class="text-sm text-slate-400">Remove from this project</p>
				</div>
			</div>

			<p class="mb-6 text-slate-300">
				Are you sure you want to remove this company from the project? All research for this company will also be deleted.
			</p>

			<div class="flex gap-3">
				<button
					onclick={() => (removingCompanyId = null)}
					class="flex-1 rounded-lg border border-slate-700/50 bg-slate-800/50 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
				>
					Cancel
				</button>
				<button
					onclick={() => removeCompany(removingCompanyId!, projectId)}
					class="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-500"
				>
					Remove
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Add Company Modal -->
{#if showAddCompanyModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" transition:fade={{ duration: 150 }}>
		<button
			class="absolute inset-0 bg-black/60 backdrop-blur-sm"
			onclick={() => (showAddCompanyModal = false)}
			aria-label="Close modal"
		></button>

		<div
			class="relative w-full max-w-lg rounded-2xl border border-slate-800/50 bg-[#141414] p-6 shadow-xl"
			transition:fly={{ y: 20, duration: 300 }}
		>
			<div class="mb-6 flex items-center justify-between">
				<h2 class="text-xl font-bold text-white">Add Company</h2>
				<button
					onclick={() => (showAddCompanyModal = false)}
					class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
				>
					<X class="h-5 w-5" />
				</button>
			</div>

			<div class="mb-6 rounded-lg border border-violet-500/50 bg-violet-500/10 p-4">
				<div class="flex items-start gap-3">
					<AlertCircle class="h-5 w-5 shrink-0 text-violet-400" />
					<div class="text-sm text-violet-300">
						<p class="font-medium mb-1">Add companies from search results</p>
						<p class="text-violet-400/80">
							Use the search page to find companies, then click the "Add to Project" button on each company card.
						</p>
					</div>
				</div>
			</div>

			<div class="flex gap-3">
				<button
					onclick={() => (showAddCompanyModal = false)}
					class="flex-1 rounded-lg border border-slate-700/50 bg-slate-800/50 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
				>
					Close
				</button>
				<a
					href="/app"
					class="flex-1 rounded-lg bg-violet-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-violet-500"
				>
					Go to Search
				</a>
			</div>
		</div>
	</div>
{/if}

<style>
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
</style>
