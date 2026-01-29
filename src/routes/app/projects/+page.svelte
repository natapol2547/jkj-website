<script lang="ts">
	import { user } from '$lib/firebase.svelte';
	import Collection from '$lib/components/Collection.svelte';
	import CreateEditProject from '$lib/components/CreateEditProject.svelte';
	import { query, collection, where, orderBy, getCountFromServer } from 'firebase/firestore';
	import { getFirebaseContext } from '$lib/stores/sdk.svelte';
	import type { Project } from '$lib/types/project';
	import {
		FolderKanban,
		Plus,
		Edit,
		Trash2,
		Archive,
		ArchiveRestore,
		Building2,
		Calendar,
		Tag,
		AlertCircle,
		Loader2,
		FileText
	} from '@lucide/svelte';
	import { fade, fly } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { goto } from '$app/navigation';
	import { getCompanyCount } from '$lib';

	// Get Firebase context
	const { firestore } = getFirebaseContext();

	// Build query reactively
	const projectsQuery = $derived.by(() => {
		if (!user.current?.uid || !firestore) return null;
		return query(
			collection(firestore, 'projects') as any,
			where('userId', '==', user.current.uid),
			orderBy('updatedAt', 'desc')
		) as any;
	});

	// Modal state
	let showCreateEditModal = $state(false);
	let showDeleteConfirm = $state(false);
	let editingProject = $state<Project | null>(null);
	let deletingProject = $state<Project | null>(null);

	// Filter
	let statusFilter = $state<'all' | 'active' | 'archived'>('all');

	// Open create modal
	function openCreateModal() {
		editingProject = null;
		showCreateEditModal = true;
	}

	// Open edit modal
	function openEditModal(project: Project) {
		editingProject = project;
		showCreateEditModal = true;
	}

	// Toggle project status
	async function toggleStatus(project: Project) {
		const newStatus = project.status === 'active' ? 'archived' : 'active';

		try {
			const response = await fetch(`/api/v1/project-detail?id=${project.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: newStatus })
			});

			const result = await response.json();

			if (!result.success) {
				console.error('Failed to toggle status:', result.error);
			}
		} catch (err) {
			console.error('Failed to toggle status:', err);
		}
	}

	// Open delete confirmation
	function openDeleteConfirm(project: Project) {
		deletingProject = project;
		showDeleteConfirm = true;
	}

	// Delete project
	async function deleteProject() {
		if (!deletingProject) return;

		try {
			const response = await fetch(`/api/v1/project-detail?id=${deletingProject.id}`, {
				method: 'DELETE'
			});

			const result = await response.json();

			if (!result.success) {
				console.error('Failed to delete project:', result.error);
			}

			showDeleteConfirm = false;
			deletingProject = null;
		} catch (err) {
			console.error('Failed to delete project:', err);
		}
	}

	// Format date
	function formatDate(timestamp: any): string {
		if (!timestamp) return '';
		const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
		return date.toLocaleDateString('th-TH', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

</script>

{#if projectsQuery}
	<Collection ref={projectsQuery}>
		{#snippet children({ data: projects, count }: { data: Project[], count: number })}
			{@const activeProjects = projects.filter((p) => p.status === 'active')}
			{@const archivedProjects = projects.filter((p) => p.status === 'archived')}
			{@const filteredProjects = statusFilter === 'all' ? projects : projects.filter((p) => p.status === statusFilter)}

<div class="min-h-screen bg-[#0f0f0f] p-4 md:p-8">
	<div class="mx-auto max-w-7xl">
		<!-- Header -->
		<div class="mb-8">
			<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 class="flex items-center gap-3 text-3xl font-bold text-white">
						<FolderKanban class="h-8 w-8 text-violet-400" />
						My Projects
					</h1>
					<p class="mt-2 text-slate-400">Organize and manage your company collections</p>
				</div>
				<button
					onclick={openCreateModal}
					class="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-violet-500"
				>
					<Plus class="h-5 w-5" />
					Create Project
				</button>
			</div>

			<!-- Stats -->
			<div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
				<div class="rounded-xl border border-slate-800/50 bg-[#141414] p-4">
					<div class="flex items-center gap-3">
						<div class="rounded-lg bg-violet-600/20 p-2">
							<FolderKanban class="h-5 w-5 text-violet-400" />
						</div>
						<div>
							<p class="text-2xl font-bold text-white">{projects.length}</p>
							<p class="text-sm text-slate-400">Total Projects</p>
						</div>
					</div>
				</div>
				<div class="rounded-xl border border-slate-800/50 bg-[#141414] p-4">
					<div class="flex items-center gap-3">
						<div class="rounded-lg bg-emerald-600/20 p-2">
							<FileText class="h-5 w-5 text-emerald-400" />
						</div>
						<div>
							<p class="text-2xl font-bold text-white">{activeProjects.length}</p>
							<p class="text-sm text-slate-400">Active</p>
						</div>
					</div>
				</div>
				<div class="rounded-xl border border-slate-800/50 bg-[#141414] p-4">
					<div class="flex items-center gap-3">
						<div class="rounded-lg bg-slate-600/20 p-2">
							<Archive class="h-5 w-5 text-slate-400" />
						</div>
						<div>
							<p class="text-2xl font-bold text-white">{archivedProjects.length}</p>
							<p class="text-sm text-slate-400">Archived</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Filters -->
			<div class="mt-6 flex gap-2">
				<button
					onclick={() => (statusFilter = 'all')}
					class="rounded-lg px-4 py-2 text-sm font-medium transition-all {statusFilter === 'all'
						? 'bg-violet-600 text-white'
						: 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white'}"
				>
					All
				</button>
				<button
					onclick={() => (statusFilter = 'active')}
					class="rounded-lg px-4 py-2 text-sm font-medium transition-all {statusFilter === 'active'
						? 'bg-violet-600 text-white'
						: 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white'}"
				>
					Active
				</button>
				<button
					onclick={() => (statusFilter = 'archived')}
					class="rounded-lg px-4 py-2 text-sm font-medium transition-all {statusFilter === 'archived'
						? 'bg-violet-600 text-white'
						: 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white'}"
				>
					Archived
				</button>
			</div>
		</div>

		<!-- Projects Grid -->
		{#if filteredProjects.length === 0}
			<!-- Empty State -->
			<div
				class="flex flex-col items-center justify-center rounded-xl border border-slate-800/50 bg-[#141414] p-12 text-center"
				in:fade={{ duration: 300 }}
			>
				<div class="mb-4 rounded-2xl bg-violet-600/10 p-6">
					<FolderKanban class="h-16 w-16 text-violet-400" />
				</div>
				<h3 class="mb-2 text-xl font-semibold text-white">
					{statusFilter === 'all' ? 'No projects yet' : `No ${statusFilter} projects`}
				</h3>
				<p class="mb-6 max-w-md text-slate-400">
					{statusFilter === 'all'
						? 'Create your first project to start organizing Thai companies'
						: `You don't have any ${statusFilter} projects`}
				</p>
				{#if statusFilter === 'all'}
					<button
						onclick={openCreateModal}
						class="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-violet-500"
					>
						<Plus class="h-5 w-5" />
						Create Your First Project
					</button>
				{/if}
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#each filteredProjects as project, i (project.id)}
					<a
						href="/app/projects/{project.id}"
						class="group block rounded-xl border border-slate-800/50 bg-[#141414] p-5 transition-all hover:border-violet-500/50 hover:bg-[#1a1a1a]"
						animate:flip={{ duration: 300 }}
					>
						<!-- Header -->
						<div class="mb-3 flex items-start justify-between">
							<div class="flex-1 min-w-0">
								<h3 class="text-lg font-semibold text-white line-clamp-1 group-hover:text-violet-400 transition-colors">
									{project.name}
								</h3>
								<p class="mt-1 text-sm text-slate-400 line-clamp-2">
									{project.description || 'No description'}
								</p>
							</div>
							<div class="ml-2">
								{#if project.status === 'active'}
									<span class="rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-medium text-emerald-400">
										Active
									</span>
								{:else}
									<span class="rounded-full bg-slate-500/20 px-2 py-1 text-xs font-medium text-slate-400">
										Archived
									</span>
								{/if}
							</div>
						</div>

						<!-- Tags -->
						{#if project.tags && project.tags.length > 0}
							<div class="mb-3 flex flex-wrap gap-1.5">
								{#each project.tags.slice(0, 3) as tag}
									<span class="rounded-md bg-violet-600/20 px-2 py-0.5 text-xs text-violet-400">
										{tag}
									</span>
								{/each}
								{#if project.tags.length > 3}
									<span class="rounded-md bg-slate-700/50 px-2 py-0.5 text-xs text-slate-400">
										+{project.tags.length - 3}
									</span>
								{/if}
							</div>
						{/if}

						<!-- Companies Count -->
						<div class="mb-3 flex items-center gap-2 text-sm text-slate-400">
							<Building2 class="h-4 w-4" />
							{#await getCompanyCount(project.id)}
								<span class="text-slate-500">...</span>
							{:then count}
								<span>{count} {count === 1 ? 'company' : 'companies'}</span>
							{:catch}
								<span>0 companies</span>
							{/await}
						</div>

						<!-- Footer -->
						<div class="flex items-center justify-between border-t border-slate-800/50 pt-3">
							<div class="flex items-center gap-1.5 text-xs text-slate-500">
								<Calendar class="h-3.5 w-3.5" />
								<span>{formatDate(project.updatedAt)}</span>
							</div>

							<!-- Actions -->
							<div class="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
								<button
									onclick={(e) => {
										e.preventDefault();
										openEditModal(project);
									}}
									class="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
									title="Edit"
								>
									<Edit class="h-4 w-4" />
								</button>
								<button
									onclick={(e) => {
										e.preventDefault();
										toggleStatus(project);
									}}
									class="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
									title={project.status === 'active' ? 'Archive' : 'Restore'}
								>
									{#if project.status === 'active'}
										<Archive class="h-4 w-4" />
									{:else}
										<ArchiveRestore class="h-4 w-4" />
									{/if}
								</button>
								<button
									onclick={(e) => {
										e.preventDefault();
										openDeleteConfirm(project);
									}}
									class="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
									title="Delete"
								>
									<Trash2 class="h-4 w-4" />
								</button>
							</div>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Create/Edit Modal -->
<CreateEditProject bind:show={showCreateEditModal} bind:project={editingProject} />

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm && deletingProject}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" transition:fade={{ duration: 150 }}>
		<!-- Backdrop -->
		<button
			class="absolute inset-0 bg-black/60 backdrop-blur-sm"
			onclick={() => (showDeleteConfirm = false)}
			aria-label="Close modal"
		></button>

		<!-- Modal -->
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
				Are you sure you want to delete <strong class="text-white">{deletingProject.name}</strong>?
				All companies in this project will be removed.
			</p>

			<div class="flex gap-3">
				<button
					onclick={() => (showDeleteConfirm = false)}
					class="flex-1 rounded-lg border border-slate-700/50 bg-slate-800/50 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-slate-800"
				>
					Cancel
				</button>
				<button
					onclick={deleteProject}
					class="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-red-500"
				>
					Delete Project
				</button>
			</div>
		</div>
	</div>
{/if}
		{/snippet}

		{#snippet loading()}
			<div class="flex min-h-screen items-center justify-center bg-[#0f0f0f] p-4">
				<div class="flex items-center gap-3 text-slate-400">
					<Loader2 class="h-8 w-8 animate-spin text-violet-400" />
					<span class="text-lg">Loading projects...</span>
				</div>
			</div>
		{/snippet}
	</Collection>
{:else}
	<div class="flex min-h-screen items-center justify-center bg-[#0f0f0f] p-4">
		<div class="flex items-center gap-3 text-slate-400">
			<Loader2 class="h-8 w-8 animate-spin text-violet-400" />
			<span class="text-lg">Initializing...</span>
		</div>
	</div>
{/if}

<style>
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
</style>
