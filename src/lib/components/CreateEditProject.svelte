<script lang="ts">
	import type { Project, CreateProjectRequest, UpdateProjectRequest } from '$lib/types/project';
	import { X, AlertCircle, Loader2 } from '@lucide/svelte';
	import { fly, fade } from 'svelte/transition';

	// Props using Svelte 5 $bindable syntax
	let {
		show = $bindable(false),
		project = $bindable<Project | null>(null),
		onSuccess = () => {}
	}: {
		show: boolean;
		project: Project | null;
		onSuccess?: () => void;
	} = $props();

	// Derived mode
	const isEditMode = $derived(project !== null);
	const modalTitle = $derived(isEditMode ? 'Edit Project' : 'Create Project');
	const submitButtonText = $derived(isEditMode ? 'Save Changes' : 'Create Project');

	// Form state
	let formData = $state<CreateProjectRequest>({
		name: '',
		description: '',
		status: 'active',
		tags: [],
		notes: ''
	});
	let newTag = $state('');
	let isSubmitting = $state(false);
	let error = $state('');

	// Watch for project changes to populate form
	$effect(() => {
		if (project) {
			formData = {
				name: project.name,
				description: project.description,
				status: project.status,
				tags: [...project.tags],
				notes: project.notes
			};
		} else {
			formData = {
				name: '',
				description: '',
				status: 'active',
				tags: [],
				notes: ''
			};
		}
		error = '';
		newTag = '';
	});

	// Close modal
	function closeModal() {
		show = false;
		error = '';
	}

	// Add tag
	function addTag() {
		const tag = newTag.trim();
		if (tag && !formData.tags?.includes(tag)) {
			formData.tags = [...(formData.tags || []), tag];
			newTag = '';
		}
	}

	// Remove tag
	function removeTag(tag: string) {
		formData.tags = formData.tags?.filter((t) => t !== tag) || [];
	}

	// Submit form
	async function handleSubmit() {
		if (!formData.name.trim()) {
			error = 'Project name is required';
			return;
		}

		isSubmitting = true;
		error = '';

		try {
			if (isEditMode && project) {
				// Update existing project
				const updateData: UpdateProjectRequest = {
					name: formData.name,
					description: formData.description,
					status: formData.status,
					tags: formData.tags,
					notes: formData.notes
				};

				const response = await fetch(`/api/v1/project-detail?id=${project.id}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(updateData)
				});

				const result = await response.json();

				if (!result.success) {
					error = result.error || 'Failed to update project';
					return;
				}
			} else {
				// Create new project
				const response = await fetch('/api/v1/projects', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(formData)
				});

				const result = await response.json();

				if (!result.success) {
					error = result.error || 'Failed to create project';
					return;
				}
			}

			// Success
			closeModal();
			onSuccess();
		} catch (err) {
			error = err instanceof Error ? err.message : `Failed to ${isEditMode ? 'update' : 'create'} project`;
		} finally {
			isSubmitting = false;
		}
	}
</script>

{#if show}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		transition:fade={{ duration: 150 }}
	>
		<!-- Backdrop -->
		<button
			class="absolute inset-0 bg-black/60 backdrop-blur-sm"
			onclick={closeModal}
			aria-label="Close modal"
		></button>

		<!-- Modal -->
		<div
			class="relative w-full max-w-lg rounded-2xl border border-slate-800/50 bg-[#141414] p-6 shadow-xl"
			transition:fly={{ y: 20, duration: 300 }}
		>
			<!-- Header -->
			<div class="mb-6 flex items-center justify-between">
				<h2 class="text-xl font-bold text-white">
					{modalTitle}
				</h2>
				<button
					onclick={closeModal}
					class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
				>
					<X class="h-5 w-5" />
				</button>
			</div>

			<!-- Form -->
			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSubmit();
				}}
				class="space-y-4"
			>
				<!-- Name -->
				<div>
					<label for="name" class="mb-2 block text-sm font-medium text-slate-300">
						Project Name <span class="text-red-400">*</span>
					</label>
					<input
						id="name"
						type="text"
						bind:value={formData.name}
						placeholder="e.g., Tech Startups in Bangkok"
						class="w-full rounded-lg border border-slate-700/50 bg-[#1a1a1a] px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-all focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20"
						required
					/>
				</div>

				<!-- Description -->
				<div>
					<label for="description" class="mb-2 block text-sm font-medium text-slate-300">
						Description
					</label>
					<textarea
						id="description"
						bind:value={formData.description}
						placeholder="What is this project about?"
						rows="3"
						class="w-full rounded-lg border border-slate-700/50 bg-[#1a1a1a] px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-all focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20"
					></textarea>
				</div>

				<!-- Tags -->
				<div>
					<label for="tags" class="mb-2 block text-sm font-medium text-slate-300">
						Tags
					</label>
					<div class="mb-2 flex gap-2">
						<input
							id="tags"
							type="text"
							bind:value={newTag}
							onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
							placeholder="Add a tag..."
							class="flex-1 rounded-lg border border-slate-700/50 bg-[#1a1a1a] px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-all focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20"
						/>
						<button
							type="button"
							onclick={addTag}
							class="rounded-lg bg-slate-700/50 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-slate-700"
						>
							Add
						</button>
					</div>
					{#if formData.tags && formData.tags.length > 0}
						<div class="flex flex-wrap gap-2">
							{#each formData.tags as tag}
								<span
									class="inline-flex items-center gap-1.5 rounded-md bg-violet-600/20 px-2.5 py-1 text-sm text-violet-400"
								>
									{tag}
									<button
										type="button"
										onclick={() => removeTag(tag)}
										class="text-violet-400 hover:text-violet-300"
									>
										<X class="h-3.5 w-3.5" />
									</button>
								</span>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Notes -->
				<div>
					<label for="notes" class="mb-2 block text-sm font-medium text-slate-300">
						Notes
					</label>
					<textarea
						id="notes"
						bind:value={formData.notes}
						placeholder="Additional notes..."
						rows="2"
						class="w-full rounded-lg border border-slate-700/50 bg-[#1a1a1a] px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-all focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20"
					></textarea>
				</div>

				<!-- Status -->
				<fieldset>
					<legend class="mb-2 block text-sm font-medium text-slate-300">Status</legend>
					<div class="flex gap-3">
						<label
							class="flex flex-1 cursor-pointer items-center gap-3 rounded-lg border border-slate-700/50 bg-[#1a1a1a] p-3 transition-all {formData.status ===
							'active'
								? 'border-violet-500/50 bg-violet-500/10'
								: 'hover:border-slate-700'}"
						>
							<input
								type="radio"
								name="status"
								value="active"
								bind:group={formData.status}
								class="text-violet-600 focus:ring-violet-500"
							/>
							<span class="text-sm text-white">Active</span>
						</label>
						<label
							class="flex flex-1 cursor-pointer items-center gap-3 rounded-lg border border-slate-700/50 bg-[#1a1a1a] p-3 transition-all {formData.status ===
							'archived'
								? 'border-violet-500/50 bg-violet-500/10'
								: 'hover:border-slate-700'}"
						>
							<input
								type="radio"
								name="status"
								value="archived"
								bind:group={formData.status}
								class="text-violet-600 focus:ring-violet-500"
							/>
							<span class="text-sm text-white">Archived</span>
						</label>
					</div>
				</fieldset>

				<!-- Error -->
				{#if error}
					<div
						class="flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400"
						transition:fade
					>
						<AlertCircle class="h-4 w-4" />
						<span>{error}</span>
					</div>
				{/if}

				<!-- Actions -->
				<div class="flex gap-3 pt-2">
					<button
						type="button"
						onclick={closeModal}
						disabled={isSubmitting}
						class="flex-1 rounded-lg border border-slate-700/50 bg-slate-800/50 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if isSubmitting}
							<Loader2 class="h-4 w-4 animate-spin" />
							<span>Saving...</span>
						{:else}
							<span>{submitButtonText}</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
