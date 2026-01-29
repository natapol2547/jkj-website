<script lang="ts">
	import type { PageProps } from './$types';
	import {
		Building2,
		MapPin,
		Phone,
		Globe,
		Mail,
		ArrowLeft,
		Calendar,
		Briefcase,
		CheckCircle,
		XCircle,
		ExternalLink,
		Copy,
		Share2,
		Banknote,
		FileText,
		Home,
		Printer,
		Check
	} from '@lucide/svelte';
	import { fly, fade } from 'svelte/transition';

	let { data }: PageProps = $props();
	let company = $derived(data.company);
	let copied = $state(false);

	// Helper to check if a value is valid
	function isValid(value: unknown): boolean {
		return value !== undefined && value !== null && value !== 'N/A' && value !== '';
	}

	// Get status info
	function getStatusInfo(status: string): { class: string; bgClass: string; textClass: string } {
		if (status?.includes('ยังดำเนินกิจการอยู่')) {
			return { 
				class: 'border-emerald-500/50 bg-emerald-500/10', 
				bgClass: 'bg-emerald-500/20',
				textClass: 'text-emerald-400' 
			};
		}
		if (status?.includes('เลิก') || status?.includes('ล้มละลาย')) {
			return { 
				class: 'border-red-500/50 bg-red-500/10', 
				bgClass: 'bg-red-500/20',
				textClass: 'text-red-400' 
			};
		}
		return { 
			class: 'border-amber-500/50 bg-amber-500/10', 
			bgClass: 'bg-amber-500/20',
			textClass: 'text-amber-400' 
		};
	}

	// Format currency
	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('th-TH', {
			style: 'currency',
			currency: 'THB',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount);
	}

	// Format date
	function formatDate(dateStr: string | { $date: string } | null): string {
		if (!dateStr) return '';
		const date = typeof dateStr === 'object' && '$date' in dateStr 
			? new Date(dateStr.$date) 
			: new Date(dateStr);
		return date.toLocaleDateString('th-TH', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	// Copy to clipboard with feedback
	async function copyToClipboard(text: string) {
		await navigator.clipboard.writeText(text);
		copied = true;
		setTimeout(() => copied = false, 2000);
	}

	// Build Google Maps query - prefer address, fall back to coordinates
	function getMapQuery(): string {
		if (company.address) {
			return encodeURIComponent(company.address);
		}
		if (company.location?.coordinates) {
			return `${company.location.coordinates[1]},${company.location.coordinates[0]}`;
		}
		return '';
	}

	// Check if map can be displayed
	function hasMapData(): boolean {
		return isValid(company.address) || (company.location?.coordinates !== undefined);
	}
</script>

<svelte:head>
	<title>{company.name} | Julist</title>
</svelte:head>

<div class="min-h-screen bg-[#0f0f0f]" data-theme="dark">
	<!-- Header -->
	<header class="sticky top-0 z-50 border-b border-slate-800/50 bg-[#0f0f0f]/80 backdrop-blur-xl">
		<div class="mx-auto max-w-6xl px-4 py-4">
			<a href="/app" class="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-white">
				<ArrowLeft class="h-4 w-4" />
				<span class="text-sm font-medium">Back to Search</span>
			</a>
		</div>
	</header>

	<!-- Main Content -->
	<main class="mx-auto max-w-6xl px-4 py-8 pb-16">
		<!-- Company Header Card -->
		<div class="rounded-2xl border border-slate-800/50 bg-linear-to-br from-[#1a1a1a] to-[#141414] p-6 md:p-8" in:fade={{ duration: 300 }}>
			<div class="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
				<div class="flex items-start gap-4 md:gap-6">
					<!-- Company Icon -->
					<div class="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-violet-600 to-purple-700 shadow-lg shadow-violet-500/20">
						<Building2 class="h-10 w-10 text-white" />
					</div>
					
					<!-- Company Name & Type -->
					<div class="min-w-0 flex-1">
						<h1 class="text-2xl font-bold text-white md:text-3xl">{company.name}</h1>
						{#if isValid(company.type_of_entity)}
							<p class="mt-2 text-sm text-slate-400">{company.type_of_entity}</p>
						{/if}
						{#if isValid(company.company_id)}
							<div class="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-800/50 px-3 py-1.5">
								<FileText class="h-3.5 w-3.5 text-slate-500" />
								<span class="text-xs text-slate-400">เลขทะเบียน: {company.company_id}</span>
							</div>
						{/if}
					</div>
				</div>

				<!-- Status Badge -->
				{#if isValid(company.operating_status)}
					{@const statusInfo = getStatusInfo(company.operating_status ?? '')}
					<div class="inline-flex items-center gap-2 rounded-xl border {statusInfo.class} px-4 py-2.5 {statusInfo.textClass}">
						{#if company.operating_status?.includes('ยังดำเนินกิจการอยู่')}
							<CheckCircle class="h-4 w-4" />
						{:else}
							<XCircle class="h-4 w-4" />
						{/if}
						<span class="text-sm font-medium">{company.operating_status}</span>
					</div>
				{/if}
			</div>

			<!-- Quick Actions -->
			<div class="mt-6 flex flex-wrap gap-3">
				<button
					onclick={() => copyToClipboard(typeof window !== 'undefined' ? window.location.href : '')}
					class="inline-flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:border-violet-500/50 hover:bg-violet-500/10 hover:text-white"
				>
					{#if copied}
						<span in:fly={{ y: -10, duration: 200 }} class="inline-flex items-center gap-2">
							<Check class="h-4 w-4" />
							<span>Copied!</span>
						</span>
					{:else}
						<Share2 class="h-4 w-4" />
						<span>Share</span>
					{/if}
				</button>
				{#if isValid(company.website)}
					<a
						href="https://{company.website}"
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex items-center gap-2 rounded-lg border border-violet-500/50 bg-violet-600/20 px-4 py-2 text-sm font-medium text-violet-400 transition-all hover:bg-violet-600/30"
					>
						<ExternalLink class="h-4 w-4" />
						<span>Visit Website</span>
					</a>
				{/if}
			</div>
		</div>

		<!-- Info Grid -->
		<div class="mt-8 grid gap-6 lg:grid-cols-2">
			<!-- Business Information -->
			<div class="rounded-xl border border-slate-800/50 bg-[#141414] p-6 transition-all hover:border-violet-500/30" in:fly={{ y: 20, duration: 400 }}>
				<div class="flex items-center gap-3 border-b border-slate-800/50 pb-4">
					<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br from-violet-600/20 to-purple-600/20">
						<Briefcase class="h-5 w-5 text-violet-400" />
					</div>
					<h2 class="text-lg font-semibold text-white">ข้อมูลธุรกิจ</h2>
				</div>
				
				<dl class="mt-6 space-y-6">
					{#if isValid(company.mission)}
						<div class="group">
							<dt class="text-xs font-medium uppercase tracking-wider text-slate-500">วัตถุประสงค์</dt>
							<dd class="mt-2 text-sm leading-relaxed text-slate-300">{company.mission}</dd>
						</div>
					{/if}

					{#if isValid(company.businessdomain)}
						<div class="group">
							<dt class="text-xs font-medium uppercase tracking-wider text-slate-500">ประเภทธุรกิจ</dt>
							<dd class="mt-2 text-sm text-slate-300">{company.businessdomain}</dd>
						</div>
					{/if}

					{#if isValid(company.typecode)}
						<div class="group">
							<dt class="text-xs font-medium uppercase tracking-wider text-slate-500">รหัสประเภท</dt>
							<dd class="mt-2 inline-flex items-center gap-2 rounded-lg bg-slate-800/50 px-3 py-1.5 text-sm text-slate-300">
								{company.typecode}
							</dd>
						</div>
					{/if}
					
					{#if isValid(company.register_capital_thb)}
						<div class="flex items-start gap-4 rounded-lg bg-linear-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 p-4">
							<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20">
								<Banknote class="h-6 w-6 text-emerald-400" />
							</div>
							<div>
								<dt class="text-xs font-medium uppercase tracking-wider text-emerald-400/70">ทุนจดทะเบียน</dt>
								<dd class="mt-1 text-2xl font-bold text-emerald-400">{formatCurrency(company.register_capital_thb ?? 0)}</dd>
							</div>
						</div>
					{/if}

					{#if isValid(company.register_date)}
						<div class="flex items-center gap-4">
							<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800/50">
								<Calendar class="h-5 w-5 text-slate-400" />
							</div>
							<div>
								<dt class="text-xs font-medium text-slate-500">วันที่จดทะเบียน</dt>
								<dd class="mt-1 text-sm text-slate-300">{formatDate(company.register_date ?? null)}</dd>
							</div>
						</div>
					{/if}

					{#if isValid(company.report_financialyear)}
						<div class="flex items-center gap-4">
							<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800/50">
								<FileText class="h-5 w-5 text-slate-400" />
							</div>
							<div>
								<dt class="text-xs font-medium text-slate-500">ปีงบการเงิน</dt>
								<dd class="mt-1 text-sm text-slate-300">{company.report_financialyear}</dd>
							</div>
						</div>
					{/if}
				</dl>
			</div>

			<!-- Contact Information -->
			<div class="rounded-xl border border-slate-800/50 bg-[#141414] p-6 transition-all hover:border-violet-500/30" in:fly={{ y: 20, duration: 400, delay: 100 }}>
				<div class="flex items-center gap-3 border-b border-slate-800/50 pb-4">
					<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br from-blue-600/20 to-cyan-600/20">
						<Phone class="h-5 w-5 text-blue-400" />
					</div>
					<h2 class="text-lg font-semibold text-white">ข้อมูลติดต่อ</h2>
				</div>
				
				<dl class="mt-6 space-y-4">
					{#if isValid(company.address)}
						<div class="flex items-start gap-3 rounded-lg bg-slate-800/30 p-3">
							<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-700/50">
								<Home class="h-5 w-5 text-slate-400" />
							</div>
							<div class="min-w-0 flex-1">
								<dt class="text-xs font-medium text-slate-500">ที่อยู่</dt>
								<dd class="mt-1 text-sm leading-relaxed text-slate-300">{company.address}</dd>
							</div>
						</div>
					{/if}

					{#if isValid(company.telephone)}
						<div class="group flex items-center justify-between rounded-lg border border-slate-800/50 bg-slate-800/30 p-3 transition-all hover:border-violet-500/50">
							<div class="flex items-center gap-3">
								<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700/50">
									<Phone class="h-5 w-5 text-slate-400" />
								</div>
								<div>
									<dt class="text-xs font-medium text-slate-500">โทรศัพท์</dt>
									<dd class="mt-1 text-sm text-slate-300">{company.telephone}</dd>
								</div>
							</div>
							<button
								onclick={() => copyToClipboard(String(company.telephone ?? ''))}
								class="rounded-lg p-2 text-slate-400 opacity-0 transition-all hover:bg-slate-700/50 hover:text-white group-hover:opacity-100"
							>
								<Copy class="h-4 w-4" />
							</button>
						</div>
					{/if}

					{#if isValid(company.fax)}
						<div class="group flex items-center justify-between rounded-lg border border-slate-800/50 bg-slate-800/30 p-3 transition-all hover:border-violet-500/50">
							<div class="flex items-center gap-3">
								<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700/50">
									<Printer class="h-5 w-5 text-slate-400" />
								</div>
								<div>
									<dt class="text-xs font-medium text-slate-500">แฟกซ์</dt>
									<dd class="mt-1 text-sm text-slate-300">{company.fax}</dd>
								</div>
							</div>
							<button
								onclick={() => copyToClipboard(String(company.fax ?? ''))}
								class="rounded-lg p-2 text-slate-400 opacity-0 transition-all hover:bg-slate-700/50 hover:text-white group-hover:opacity-100"
							>
								<Copy class="h-4 w-4" />
							</button>
						</div>
					{/if}

					{#if isValid(company.email)}
						<div class="group flex items-center justify-between rounded-lg border border-slate-800/50 bg-slate-800/30 p-3 transition-all hover:border-violet-500/50">
							<div class="flex items-center gap-3 min-w-0 flex-1">
								<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-700/50">
									<Mail class="h-5 w-5 text-slate-400" />
								</div>
								<div class="min-w-0 flex-1">
									<dt class="text-xs font-medium text-slate-500">อีเมล</dt>
									<dd class="mt-1 text-sm">
										<a href="mailto:{company.email}" class="text-violet-400 hover:text-violet-300 transition-colors truncate block">{company.email}</a>
									</dd>
								</div>
							</div>
							<button
								onclick={() => copyToClipboard(String(company.email ?? ''))}
								class="shrink-0 rounded-lg p-2 text-slate-400 opacity-0 transition-all hover:bg-slate-700/50 hover:text-white group-hover:opacity-100"
							>
								<Copy class="h-4 w-4" />
							</button>
						</div>
					{/if}

					{#if isValid(company.website)}
						<div class="group flex items-center justify-between rounded-lg border border-slate-800/50 bg-slate-800/30 p-3 transition-all hover:border-violet-500/50">
							<div class="flex items-center gap-3 min-w-0 flex-1">
								<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-700/50">
									<Globe class="h-5 w-5 text-slate-400" />
								</div>
								<div class="min-w-0 flex-1">
									<dt class="text-xs font-medium text-slate-500">เว็บไซต์</dt>
									<dd class="mt-1 text-sm">
										<a href="https://{company.website}" target="_blank" rel="noopener noreferrer" class="text-violet-400 hover:text-violet-300 transition-colors truncate block">
											{company.website}
										</a>
									</dd>
								</div>
							</div>
							<a
								href="https://{company.website}"
								target="_blank"
								rel="noopener noreferrer"
								class="shrink-0 rounded-lg p-2 text-slate-400 opacity-0 transition-all hover:bg-slate-700/50 hover:text-white group-hover:opacity-100"
							>
								<ExternalLink class="h-4 w-4" />
							</a>
						</div>
					{/if}
				</dl>
			</div>
		</div>

		<!-- Map Section -->
		{#if hasMapData()}
			<div class="mt-8 rounded-xl border border-slate-800/50 bg-[#141414] p-6 transition-all hover:border-violet-500/30" in:fly={{ y: 20, duration: 400, delay: 200 }}>
				<div class="flex items-center gap-3 border-b border-slate-800/50 pb-4">
					<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br from-red-600/20 to-pink-600/20">
						<MapPin class="h-5 w-5 text-red-400" />
					</div>
					<h2 class="text-lg font-semibold text-white">แผนที่</h2>
					<a 
						href="https://www.google.com/maps/search/?api=1&query={getMapQuery()}" 
						target="_blank" 
						rel="noopener noreferrer"
						class="ml-auto inline-flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-1.5 text-xs font-medium text-slate-300 transition-all hover:border-violet-500/50 hover:bg-violet-500/10 hover:text-white"
					>
						<ExternalLink class="h-3.5 w-3.5" />
						Open in Maps
					</a>
				</div>
				<div class="mt-6 aspect-video w-full overflow-hidden rounded-xl bg-slate-900 ring-1 ring-slate-800/50">
					<iframe
						title="Company Location"
						width="100%"
						height="100%"
						style="border:0"
						loading="lazy"
						src="https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q={getMapQuery()}&zoom=15"
					></iframe>
				</div>
			</div>
		{/if}

		<!-- Document ID Footer -->
		<div class="mt-12 flex items-center justify-center gap-2 text-xs text-slate-600">
			<FileText class="h-3 w-3" />
			<span>Document ID: {company._id}</span>
		</div>
	</main>
</div>
