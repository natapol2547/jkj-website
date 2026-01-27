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
		Printer
	} from '@lucide/svelte';

	let { data }: PageProps = $props();
	let company = $derived(data.company);

	// Helper to check if a value is valid
	function isValid(value: unknown): boolean {
		return value !== undefined && value !== null && value !== 'N/A' && value !== '';
	}

	// Get status badge class
	function getStatusBadgeClass(status: string): string {
		if (status?.includes('ยังดำเนินกิจการอยู่')) return 'badge-success';
		if (status?.includes('เลิก') || status?.includes('ล้มละลาย')) return 'badge-error';
		return 'badge-warning';
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

	// Copy to clipboard
	async function copyToClipboard(text: string) {
		await navigator.clipboard.writeText(text);
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

<div class="min-h-full">
	<!-- Header -->
	<header class="sticky top-0 z-50 border-b border-base-300 bg-base-200/80 backdrop-blur-xl">
		<div class="mx-auto max-w-5xl px-4 py-4">
			<a href="/app" class="btn btn-ghost btn-sm gap-2">
				<ArrowLeft class="h-4 w-4" />
				Back to Search
			</a>
		</div>
	</header>

	<!-- Main Content -->
	<main class="mx-auto max-w-5xl px-4 py-8 pb-16">
		<!-- Company Header Card -->
		<div class="card bg-base-200 border border-base-300">
			<div class="card-body">
				<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div class="flex items-start gap-4">
						<!-- Company Icon -->
						<div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary">
							<Building2 class="h-8 w-8 text-primary-content" />
						</div>
						
						<!-- Company Name & Type -->
						<div class="min-w-0 flex-1">
							<h1 class="text-xl font-bold sm:text-2xl">{company.name}</h1>
							{#if isValid(company.type_of_entity)}
								<p class="mt-1 text-sm opacity-70">{company.type_of_entity}</p>
							{/if}
							{#if isValid(company.company_id)}
								<p class="mt-1 text-xs opacity-50">เลขทะเบียน: {company.company_id}</p>
							{/if}
						</div>
					</div>

					<!-- Status Badge -->
					{#if isValid(company.operating_status)}
						<div class="badge {getStatusBadgeClass(company.operating_status ?? '')} gap-2 py-3">
							{#if company.operating_status?.includes('ยังดำเนินกิจการอยู่')}
								<CheckCircle class="h-4 w-4" />
							{:else}
								<XCircle class="h-4 w-4" />
							{/if}
							{company.operating_status}
						</div>
					{/if}
				</div>

				<!-- Quick Actions -->
				<div class="card-actions mt-4">
					<button
						onclick={() => copyToClipboard(typeof window !== 'undefined' ? window.location.href : '')}
						class="btn btn-sm btn-neutral gap-2"
					>
						<Share2 class="h-4 w-4" />
						Share
					</button>
					{#if isValid(company.website)}
						<a
							href="https://{company.website}"
							target="_blank"
							rel="noopener noreferrer"
							class="btn btn-sm btn-primary btn-outline gap-2"
						>
							<ExternalLink class="h-4 w-4" />
							Visit Website
						</a>
					{/if}
				</div>
			</div>
		</div>

		<!-- Info Grid -->
		<div class="mt-6 grid gap-6 lg:grid-cols-2">
			<!-- Business Information -->
			<div class="card bg-base-200 border border-base-300">
				<div class="card-body">
					<h2 class="card-title text-lg">
						<Briefcase class="h-5 w-5 text-success" />
						ข้อมูลธุรกิจ
					</h2>
					
					<dl class="mt-4 space-y-4">
						{#if isValid(company.mission)}
							<div>
								<dt class="text-xs font-medium uppercase tracking-wider opacity-50">วัตถุประสงค์</dt>
								<dd class="mt-1 text-sm">{company.mission}</dd>
							</div>
						{/if}

						{#if isValid(company.businessdomain)}
							<div>
								<dt class="text-xs font-medium uppercase tracking-wider opacity-50">ประเภทธุรกิจ</dt>
								<dd class="mt-1 text-sm">{company.businessdomain}</dd>
							</div>
						{/if}

						{#if isValid(company.typecode)}
							<div>
								<dt class="text-xs font-medium uppercase tracking-wider opacity-50">รหัสประเภท</dt>
								<dd class="mt-1 text-sm">{company.typecode}</dd>
							</div>
						{/if}
						
						{#if isValid(company.register_capital_thb)}
							<div class="flex items-start gap-3">
								<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success/20">
									<Banknote class="h-5 w-5 text-success" />
								</div>
								<div>
									<dt class="text-xs font-medium opacity-50">ทุนจดทะเบียน</dt>
									<dd class="text-lg font-semibold text-success">{formatCurrency(company.register_capital_thb ?? 0)}</dd>
								</div>
							</div>
						{/if}

						{#if isValid(company.register_date)}
							<div class="flex items-center gap-3">
								<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-base-300">
									<Calendar class="h-5 w-5 opacity-70" />
								</div>
								<div>
									<dt class="text-xs font-medium opacity-50">วันที่จดทะเบียน</dt>
									<dd class="text-sm">{formatDate(company.register_date ?? null)}</dd>
								</div>
							</div>
						{/if}

						{#if isValid(company.report_financialyear)}
							<div class="flex items-center gap-3">
								<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-base-300">
									<FileText class="h-5 w-5 opacity-70" />
								</div>
								<div>
									<dt class="text-xs font-medium opacity-50">ปีงบการเงิน</dt>
									<dd class="text-sm">{company.report_financialyear}</dd>
								</div>
							</div>
						{/if}
					</dl>
				</div>
			</div>

			<!-- Contact Information -->
			<div class="card bg-base-200 border border-base-300">
				<div class="card-body">
					<h2 class="card-title text-lg">
						<Phone class="h-5 w-5 text-warning" />
						ข้อมูลติดต่อ
					</h2>
					
					<dl class="mt-4 space-y-4">
						{#if isValid(company.address)}
							<div class="flex items-start gap-3">
								<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-base-300">
									<Home class="h-5 w-5 opacity-70" />
								</div>
								<div class="min-w-0 flex-1">
									<dt class="text-xs font-medium opacity-50">ที่อยู่</dt>
									<dd class="mt-1 text-sm">{company.address}</dd>
								</div>
							</div>
						{/if}

						{#if isValid(company.telephone)}
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-3">
									<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-base-300">
										<Phone class="h-5 w-5 opacity-70" />
									</div>
									<div>
										<dt class="text-xs font-medium opacity-50">โทรศัพท์</dt>
										<dd class="text-sm">{company.telephone}</dd>
									</div>
								</div>
								<button
									onclick={() => copyToClipboard(String(company.telephone ?? ''))}
									class="btn btn-ghost btn-sm btn-square"
								>
									<Copy class="h-4 w-4" />
								</button>
							</div>
						{/if}

						{#if isValid(company.fax)}
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-3">
									<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-base-300">
										<Printer class="h-5 w-5 opacity-70" />
									</div>
									<div>
										<dt class="text-xs font-medium opacity-50">แฟกซ์</dt>
										<dd class="text-sm">{company.fax}</dd>
									</div>
								</div>
								<button
									onclick={() => copyToClipboard(String(company.fax ?? ''))}
									class="btn btn-ghost btn-sm btn-square"
								>
									<Copy class="h-4 w-4" />
								</button>
							</div>
						{/if}

						{#if isValid(company.email)}
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-3">
									<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-base-300">
										<Mail class="h-5 w-5 opacity-70" />
									</div>
									<div>
										<dt class="text-xs font-medium opacity-50">อีเมล</dt>
										<dd class="text-sm">
											<a href="mailto:{company.email}" class="link link-primary">{company.email}</a>
										</dd>
									</div>
								</div>
								<button
									onclick={() => copyToClipboard(String(company.email ?? ''))}
									class="btn btn-ghost btn-sm btn-square"
								>
									<Copy class="h-4 w-4" />
								</button>
							</div>
						{/if}

						{#if isValid(company.website)}
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-3">
									<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-base-300">
										<Globe class="h-5 w-5 opacity-70" />
									</div>
									<div>
										<dt class="text-xs font-medium opacity-50">เว็บไซต์</dt>
										<dd class="text-sm">
											<a href="https://{company.website}" target="_blank" rel="noopener noreferrer" class="link link-primary">
												{company.website}
											</a>
										</dd>
									</div>
								</div>
								<a
									href="https://{company.website}"
									target="_blank"
									rel="noopener noreferrer"
									class="btn btn-ghost btn-sm btn-square"
								>
									<ExternalLink class="h-4 w-4" />
								</a>
							</div>
						{/if}
					</dl>
				</div>
			</div>
		</div>

		<!-- Map Section -->
		{#if hasMapData()}
			<div class="card bg-base-200 border border-base-300 mt-6">
				<div class="card-body">
					<h2 class="card-title text-lg">
						<MapPin class="h-5 w-5 text-error" />
						แผนที่
					</h2>
					<div class="aspect-video w-full overflow-hidden rounded-xl bg-base-300 mt-4">
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
			</div>
		{/if}

		<!-- Document ID Footer -->
		<div class="mt-8 text-center text-xs opacity-40">
			Document ID: {company._id}
		</div>
	</main>
</div>
