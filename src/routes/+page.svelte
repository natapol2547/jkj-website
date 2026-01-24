<script lang="ts">
	import {
		ArrowRight,
		Zap,
		Layers,
		Link2,
		Menu,
		X,
		Globe,
		Shield,
		Bot,
		BadgeCheck,
		CreditCard,
		MessageSquareText,
		Download,
		UserPlus,
		Sparkles,
		CheckCircle2,
		Brain,
		Check,
		X as XIcon,
		Crown,
		Building2,
		Rocket
	} from '@lucide/svelte';
	import { fly } from 'svelte/transition';
    import { auth, user } from '$lib/firebase.svelte.js';
	import { signOut } from '$lib/auth.js';

	// Pricing Tiers Data
	const pricingTiers = [
		{
			name: 'Free',
			price: '฿0',
			period: 'forever',
			description: 'Perfect for trying out Julist and small projects',
			icon: Rocket,
			gradient: 'from-slate-500 to-slate-600',
			buttonStyle: 'bg-slate-900 hover:bg-slate-800 text-white',
			popular: false,
			features: [
				{ text: '5 searches per month', included: true },
				{ text: '10 leads per search', included: true },
				{ text: 'Basic Thai NLP', included: true },
				{ text: 'CSV export', included: true },
				{ text: 'Email support', included: true },
				{ text: 'Scout Agent access', included: false },
				{ text: 'Lead verification', included: false },
				{ text: 'PDPA compliance tools', included: false },
				{ text: 'AI lead scoring', included: false }
			]
		},
		{
			name: 'Pro',
			price: '฿170',
			period: '/month',
			description: 'For growing teams who need verified, quality leads',
			icon: Crown,
			gradient: 'from-violet-500 to-purple-600',
			buttonStyle: 'btn-primary-custom text-white',
			popular: true,
			features: [
				{ text: '50 searches per month', included: true },
				{ text: 'Unlimited leads per search', included: true },
				{ text: 'Advanced Thai NLP + slang', included: true },
				{ text: 'CSV & Excel export', included: true },
				{ text: 'Priority support', included: true },
				{ text: 'Scout Agent access', included: true },
				{ text: 'Lead verification', included: true },
				{ text: 'PDPA compliance tools', included: true },
				{ text: 'AI lead scoring', included: true }
			]
		},
		{
			name: 'Enterprise',
			price: 'Custom',
			period: '',
			description: 'For organizations with advanced needs and scale',
			icon: Building2,
			gradient: 'from-amber-500 to-orange-600',
			buttonStyle: 'bg-amber-500 hover:bg-amber-600 text-white',
			popular: false,
			features: [
				{ text: 'Unlimited searches', included: true },
				{ text: 'Unlimited leads', included: true },
				{ text: 'Custom NLP training', included: true },
				{ text: 'API access', included: true },
				{ text: 'Dedicated account manager', included: true },
				{ text: 'Custom Scout Agent workflows', included: true },
				{ text: 'Team collaboration', included: true },
				{ text: 'Custom PDPA workflows', included: true },
				{ text: 'SLA guarantee', included: true }
			]
		}
	];

	// Core Features Data
	const coreFeatures = [
		{
			icon: Globe,
			title: 'Thai Language & Context NLP',
			description: 'Natural Language Processing that understands Thai slang, formal business language, and local address formats that global tools often miss.',
			gradient: 'from-emerald-500 to-teal-600',
			shadow: 'shadow-emerald-200',
			badge: 'Thai-First AI'
		},
		{
			icon: Shield,
			title: 'PDPA Compliance Engine',
			description: 'A built-in "Legitimate Interest" framework that automatically filters or processes data to ensure you stay within Thailand\'s privacy laws.',
			gradient: 'from-blue-500 to-indigo-600',
			shadow: 'shadow-blue-200',
			badge: 'Privacy-Safe'
		},
		{
			icon: Bot,
			title: 'Autonomous "Scout" Agent',
			description: 'A core AI agent that can take a broad goal (e.g., "Find all boutique hotels in Phuket") and return a list of verified leads without manual oversight.',
			gradient: 'from-violet-500 to-purple-600',
			shadow: 'shadow-violet-200',
			badge: 'AI-Powered'
		},
		{
			icon: BadgeCheck,
			title: 'Lead Verification',
			description: 'A process to ensure contact information is accurate, reducing the "Double Cost" of bad data that wastes your sales team\'s time.',
			gradient: 'from-rose-500 to-pink-600',
			shadow: 'shadow-rose-200',
			badge: 'Verified Data'
		}
	];

	// Quality of Life Features Data
	const qolFeatures = [
		{
			icon: CreditCard,
			title: 'Credit Management Dashboard',
			description: 'See how many of your 50 free credits you have left and how many leads you\'ve generated at a glance.'
		},
		{
			icon: MessageSquareText,
			title: '"No-Code" Goal Input',
			description: 'Simply type what you need in plain language. No complex forms or data parameters required.'
		},
		{
			icon: Download,
			title: 'One-Click Export',
			description: 'Download your lead list as CSV or Excel instantly. No waiting, no extra steps.'
		},
		{
			icon: UserPlus,
			title: 'Zero-Friction Onboarding',
			description: 'See your first three leads before creating an account or adding a credit card.'
		},
        {
            icon: Brain,
            title: 'AI-Powered Lead Scoring',
            description: 'Score leads based on their likelihood to convert into a sale.'
        }
	];

	let mobileMenuOpen = $state(false);

	const integrationLogos = [
		{ name: 'Google', bg: 'bg-white' },
		{ name: 'Salesforce', bg: 'bg-sky-50' },
		{ name: 'Pipedrive', bg: 'bg-emerald-500' },
		{ name: 'Robly', bg: 'bg-gray-900' },
		{ name: 'Directus', bg: 'bg-purple-600' },
		{ name: 'Stripe', bg: 'bg-indigo-50' },
		{ name: 'HubSpot', bg: 'bg-orange-50' },
		{ name: 'Gumroad', bg: 'bg-pink-50' }
	];

	const clientLogos = [
		{ name: 'willacare', style: 'font-light tracking-wide' },
		{ name: 'Groupii', style: 'font-bold' },
		{ name: 'KEYSTONE', style: 'font-bold tracking-widest text-xs' },
		{ name: 'coast+coast', style: 'font-light' },
		{ name: 'willacare', style: 'font-light tracking-wide' },
		{ name: 'Groupii', style: 'font-bold' },
		{ name: 'KEYSTONE', style: 'font-bold tracking-widest text-xs' },
		{ name: 'coast+coast', style: 'font-light' }
	];
</script>

<svelte:head>
	<title>Julist V2 - Connect Your Tech Stack</title>
	<meta name="description" content="Integrate with your sales and marketing stack in under 30 seconds. Your apps deserve a real relationship without the drama." />
</svelte:head>

<div class="min-h-screen bg-grid relative">
	<!-- Subtle gradient overlay -->
	<div class="pointer-events-none absolute inset-0 bg-linear-to-br from-violet-50/50 via-transparent to-cyan-50/30"></div>

	<!-- Navigation -->
	<nav class="navbar-blur fixed top-4 left-1/2 z-50 -translate-x-1/2 transform rounded-lg md:rounded-full border border-slate-200/60 px-2 py-2 shadow-lg shadow-slate-200/50 md:px-4">
		<div class="flex flex-nowrap items-center gap-2 md:gap-6">
			<!-- Logo -->
			<a href="/" class="flex shrink-0 items-center gap-2 pl-2 md:pl-4">
				<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-violet-600 to-purple-700">
					<Zap class="h-4 w-4 text-white" />
				</div>
				<span class="font-sans text-lg font-bold text-slate-800 whitespace-nowrap">Julist V2</span>
			</a>

			<!-- Desktop Navigation -->
			<div class="hidden shrink-0 items-center gap-6 md:flex">
				<a href="#features" class="font-mono text-sm font-medium text-slate-600 transition-colors hover:text-violet-600 whitespace-nowrap">Features</a>
				<a href="#pricing" class="font-mono text-sm font-medium text-slate-600 transition-colors hover:text-violet-600 whitespace-nowrap">Pricing</a>
			</div>

			<!-- CTA Buttons -->
			<div class="flex shrink-0 items-center gap-2 md:gap-3">
				<button class="btn-primary-custom hidden rounded-full px-5 py-2.5 text-sm font-semibold text-white md:block whitespace-nowrap">
					Start Free Pro Trial
				</button>
                {#if user.current}
                <div class="dropdown dropdown-end">
                    <div tabindex="0" role="button" class="btn btn-ghost btn-circle avatar">
                      <div class="w-10 rounded-full">
                        <img
                          alt="Tailwind CSS Navbar component"
                          src={user.current.photoURL} />
                      </div>
                    </div>
                    <ul
                      tabindex="-1"
                      class="menu dropdown-content font-semibold bg-white/80 rounded-box z-1 mt-3 w-52 p-2 shadow">
                      <li>
                        <a class="justify-between" href="/app">
                          Dashboard
                        </a>
                      </li>
                      <li><button onclick={() => signOut(auth)} class="text-red-500">Logout</button></li>
                    </ul>
                  </div>
                {:else}
                    <a href="/login" class="hidden items-center gap-1 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:text-violet-600 md:flex whitespace-nowrap">
                        Sign In
                        <ArrowRight class="h-4 w-4 shrink-0" />
                    </a>
                {/if}
				<!-- Mobile menu button -->
				<button
					onclick={() => mobileMenuOpen = !mobileMenuOpen}
					class="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 md:hidden"
				>
					{#if mobileMenuOpen}
						<X class="h-5 w-5" />
					{:else}
						<Menu class="h-5 w-5" />
					{/if}
				</button>
			</div>
		</div>

		<!-- Mobile Menu -->
		{#if mobileMenuOpen}
			<div class="mt-4 border-t border-slate-200 pt-4 md:hidden" in:fly>
				<div class="flex flex-col gap-3">
					<a href="#features" class="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-violet-50 hover:text-violet-600">Features</a>
					<a href="#pricing" class="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-violet-50 hover:text-violet-600">Pricing</a>
					<a href="#integrations" class="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-violet-50 hover:text-violet-600">Integrations</a>
					<button class="btn-primary-custom mt-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white">
						Start Free Pro Trial
					</button>
				</div>
			</div>
		{/if}
	</nav>

	<!-- Hero Section -->
	<section class="relative px-4 pt-32 pb-16 md:pt-44 md:pb-24">
		<div class="mx-auto max-w-4xl text-center">
			<!-- Main Headline -->
			<h1 class="font-serif text-4xl font-medium leading-tight tracking-tight text-slate-900 md:text-6xl lg:text-7xl">
				Stop Drowning in Data<br />
				Let's Start<br />
				<span class="gradient-text font-bold overflow-visible">Closing Deals</span>
			</h1>

			<!-- Subtext -->
			<p class="mx-auto mt-6 max-w-xl text-base leading-relaxed text-slate-600 md:mt-8 md:text-lg">
				Integrate AI with your sales and marketing workflow in under <b>30 seconds</b>. Your sales team deserves to focus on what they do best.
			</p>

			<!-- CTA Button -->
			<div class="mt-8 md:mt-10">
				<button class="btn-primary-custom group inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-semibold text-white md:text-lg">
					Start Connecting
					<ArrowRight class="h-5 w-5 transition-transform group-hover:translate-x-1" />
				</button>
			</div>

			<!-- Integration Icons -->
			<div class="mt-12 md:mt-16">
				<div class="flex flex-wrap items-center justify-center gap-3 md:gap-4">
					{#each integrationLogos as logo, i}
						<div
							class="icon-hover flex h-12 w-12 items-center justify-center rounded-xl shadow-md shadow-slate-200/50 ring-1 ring-slate-100 md:h-14 md:w-14 {logo.bg} {i % 4 === 0 ? 'animate-float' : i % 4 === 1 ? 'animate-float-delay-1' : i % 4 === 2 ? 'animate-float-delay-2' : 'animate-float-delay-3'}"
						>
							{#if logo.name === 'Google'}
								<!-- Google Logo -->
								<svg class="h-6 w-6 md:h-7 md:w-7" viewBox="0 0 24 24">
									<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
									<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
									<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
									<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
								</svg>
							{:else if logo.name === 'Salesforce'}
								<!-- Salesforce Logo -->
								<svg class="h-6 w-6 md:h-7 md:w-7" viewBox="0 0 24 24">
									<path fill="#00A1E0" d="M10.006 5.415a4.195 4.195 0 0 1 3.045-1.306c1.56 0 2.954.9 3.69 2.205.63-.3 1.35-.45 2.1-.45 2.85 0 5.159 2.34 5.159 5.22s-2.31 5.22-5.16 5.22c-.45 0-.87-.06-1.29-.165a3.9 3.9 0 0 1-3.42 2.025c-.6 0-1.17-.135-1.68-.375a4.665 4.665 0 0 1-4.2 2.64 4.68 4.68 0 0 1-4.53-3.6 4.27 4.27 0 0 1-.93.105c-2.25 0-4.08-1.845-4.08-4.125 0-1.665.975-3.09 2.385-3.75a4.26 4.26 0 0 1-.285-1.53c0-2.355 1.905-4.26 4.26-4.26 1.29 0 2.43.57 3.21 1.47l-.27-.33z"/>
								</svg>
							{:else if logo.name === 'Pipedrive'}
								<!-- Pipedrive Logo -->
								<svg class="h-6 w-6 md:h-7 md:w-7" viewBox="0 0 24 24">
									<path fill="#ffffff" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm4 0h-2V7h2v10z"/>
								</svg>
							{:else if logo.name === 'Robly'}
								<!-- Robly Logo -->
								<svg class="h-6 w-6 md:h-7 md:w-7" viewBox="0 0 24 24">
									<path fill="#ffffff" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
									<path fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
								</svg>
							{:else if logo.name === 'Directus'}
								<!-- Directus Logo -->
								<svg class="h-6 w-6 md:h-7 md:w-7" viewBox="0 0 24 24">
									<path fill="#ffffff" d="M8 5v14l11-7z"/>
								</svg>
							{:else if logo.name === 'Stripe'}
								<!-- Stripe Logo -->
								<svg class="h-6 w-6 md:h-7 md:w-7" viewBox="0 0 24 24">
									<path fill="#635BFF" d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
								</svg>
							{:else if logo.name === 'HubSpot'}
								<!-- HubSpot Logo -->
								<svg class="h-6 w-6 md:h-7 md:w-7" viewBox="0 0 24 24">
									<path fill="#FF7A59" d="M18.164 7.93V5.084a2.198 2.198 0 0 0 1.267-1.984v-.066A2.198 2.198 0 0 0 17.235.836h-.066a2.198 2.198 0 0 0-2.198 2.198v.066c0 .864.501 1.61 1.227 1.967v2.862a5.052 5.052 0 0 0-2.267 1.136l-7.59-5.906a2.109 2.109 0 0 0 .104-.643 2.14 2.14 0 1 0-2.14 2.14c.313 0 .61-.069.879-.19l7.453 5.793a5.052 5.052 0 0 0-.246 1.56c0 .545.087 1.07.246 1.56l-7.453 5.793a2.122 2.122 0 0 0-.879-.19 2.14 2.14 0 1 0 2.14 2.14c0-.224-.04-.44-.104-.643l7.59-5.906a5.052 5.052 0 0 0 2.267 1.136v2.862a2.198 2.198 0 0 0-1.227 1.967v.066a2.198 2.198 0 0 0 2.198 2.198h.066a2.198 2.198 0 0 0 2.196-2.198v-.066a2.198 2.198 0 0 0-1.267-1.984V16.07a5.067 5.067 0 1 0-4.946-8.14h-.002z"/>
								</svg>
							{:else if logo.name === 'Gumroad'}
								<!-- Gumroad Logo -->
								<svg class="h-6 w-6 md:h-7 md:w-7" viewBox="0 0 24 24">
									<path fill="#FF90E8" d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.178 1.906-1.092 5.614-1.544 7.45-.192.779-.569 1.039-.933 1.064-.793.055-1.394-.524-2.163-1.027-1.204-.789-1.885-1.28-3.054-2.049-1.352-.889-.476-1.377.295-2.176.202-.21 3.709-3.4 3.778-3.69.009-.036.016-.171-.064-.243-.08-.071-.197-.047-.282-.027-.12.027-2.031 1.291-5.732 3.792-.543.373-1.034.555-1.473.545-.485-.011-1.418-.275-2.11-.501-.849-.277-1.524-.424-1.465-.896.03-.246.366-.498 1.007-.755 3.948-1.721 6.582-2.856 7.901-3.407 3.763-1.567 4.545-1.839 5.054-1.848.112-.002.362.026.524.157.137.11.175.259.192.363.018.104.04.342.022.527z"/>
								</svg>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</div>
	</section>

	<!-- Client Logos Section -->
	<section class="relative overflow-hidden border-t border-slate-200/60 bg-white/50 py-12 md:py-16">
		<div class="mb-8 text-center">
			<p class="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
				Driving pipeline and revenue for industry leaders
			</p>
		</div>

		<!-- Marquee Container -->
		<div class="relative">
			<!-- Fade edges -->
			<div class="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-linear-to-r from-white/80 to-transparent md:w-40"></div>
			<div class="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-linear-to-l from-white/80 to-transparent md:w-40"></div>

			<!-- First row -->
			<div class="mb-6 flex overflow-hidden">
				<div class="animate-marquee flex gap-12 md:gap-20">
					{#each [...clientLogos, ...clientLogos] as logo}
						<div class="logo-grayscale flex items-center whitespace-nowrap">
							<span class="text-lg text-slate-500 md:text-xl {logo.style}">{logo.name}</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Second row (reverse direction) -->
			<div class="flex overflow-hidden" style="direction: rtl;">
				<div class="animate-marquee flex gap-12 md:gap-20" style="direction: ltr;">
					{#each [...clientLogos.slice(4), ...clientLogos.slice(0, 4), ...clientLogos] as logo}
						<div class="logo-grayscale flex items-center whitespace-nowrap">
							<span class="text-lg text-slate-500 md:text-xl {logo.style}">{logo.name}</span>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</section>

	<!-- Features Preview Section -->
	<section id="features" class="relative px-4 py-16 md:py-24">
		<div class="mx-auto max-w-6xl">
			<div class="text-center">
				<span class="font-mono inline-flex items-center gap-2 rounded-full bg-violet-100 px-4 py-1.5 text-sm font-medium text-violet-700">
					<Layers class="h-4 w-4" />
					Powerful Integrations
				</span>
				<h2 class="font-serif mt-6 text-3xl font-medium text-slate-900 md:text-5xl">
					Connect everything,<br />
					<span class="gradient-text">effortlessly</span>
				</h2>
				<p class="mx-auto mt-4 max-w-2xl text-slate-600">
					From CRMs to marketing automation, payment processors to analytics — bring your entire stack together in one unified workflow.
				</p>
			</div>

			<!-- Feature Cards -->
			<div class="mt-12 grid gap-6 md:mt-16 md:grid-cols-3">
				<div class="group rounded-2xl border border-slate-200/60 bg-white/80 p-6 shadow-sm transition-all hover:border-violet-200 hover:shadow-lg hover:shadow-violet-100/50 md:p-8">
					<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-200">
						<Link2 class="h-6 w-6" />
					</div>
					<h3 class="text-lg font-semibold text-slate-900">One-Click Setup</h3>
					<p class="mt-2 text-sm leading-relaxed text-slate-600">
						Connect your favorite tools in seconds. No code, no complexity, just seamless integration.
					</p>
				</div>

				<div class="group rounded-2xl border border-slate-200/60 bg-white/80 p-6 shadow-sm transition-all hover:border-violet-200 hover:shadow-lg hover:shadow-violet-100/50 md:p-8">
					<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-200">
						<Zap class="h-6 w-6" />
					</div>
					<h3 class="text-lg font-semibold text-slate-900">Real-Time Sync</h3>
					<p class="mt-2 text-sm leading-relaxed text-slate-600">
						Keep your data flowing smoothly with instant synchronization across all connected platforms.
					</p>
				</div>

				<div class="group rounded-2xl border border-slate-200/60 bg-white/80 p-6 shadow-sm transition-all hover:border-violet-200 hover:shadow-lg hover:shadow-violet-100/50 md:p-8">
					<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-200">
						<Layers class="h-6 w-6" />
					</div>
					<h3 class="text-lg font-semibold text-slate-900">Smart Workflows</h3>
					<p class="mt-2 text-sm leading-relaxed text-slate-600">
						Automate repetitive tasks with intelligent workflows that adapt to your business needs.
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Core Features Section -->
	<section id="features" class="relative px-4 py-20 md:py-32 overflow-hidden">
		<!-- Background decoration -->
		<div class="absolute inset-0 bg-linear-to-b from-slate-50/80 via-white to-violet-50/30"></div>
		<div class="absolute top-0 left-1/2 -translate-x-1/2 w-200 h-200 bg-gradient-radial from-violet-100/40 to-transparent rounded-full blur-3xl"></div>

		<div class="relative mx-auto max-w-6xl">
			<div class="text-center mb-16">
				<span class="font-mono inline-flex items-center gap-2 rounded-full bg-linear-to-r from-violet-100 to-purple-100 px-4 py-1.5 text-sm font-medium text-violet-700 border border-violet-200/50">
					<Sparkles class="h-4 w-4" />
					Thailand-First Features
				</span>
				<h2 class="font-serif mt-6 text-3xl font-medium text-slate-900 md:text-5xl">
					Built for <span class="gradient-text">Thai Business</span>
				</h2>
				<p class="mx-auto mt-4 max-w-2xl text-slate-600 text-lg">
					Core features designed specifically for the Thai market, with local language understanding and compliance built-in.
				</p>
			</div>

			<!-- Core Features Grid -->
			<div class="grid gap-6 md:grid-cols-2 lg:gap-8">
				{#each coreFeatures as feature, i}
					<div class="group relative rounded-3xl border border-slate-200/60 bg-white/90 backdrop-blur-sm p-8 shadow-sm transition-all duration-300 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-100/50 hover:-translate-y-1">
						<!-- Badge -->
						<div class="absolute top-6 right-6">
							<span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
								<CheckCircle2 class="h-3 w-3 text-emerald-500" />
								{feature.badge}
							</span>
						</div>

						<!-- Icon -->
						<div class="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br {feature.gradient} text-white shadow-lg {feature.shadow} transition-transform group-hover:scale-110">
							<feature.icon class="h-7 w-7" />
						</div>

						<!-- Content -->
						<h3 class="text-xl font-semibold text-slate-900 mb-3">{feature.title}</h3>
						<p class="text-slate-600 leading-relaxed">{feature.description}</p>

						<!-- Hover indicator -->
						<div class="mt-6 flex items-center gap-2 text-sm font-medium text-violet-600 opacity-0 transition-opacity group-hover:opacity-100">
							Learn more
							<ArrowRight class="h-4 w-4" />
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Quality of Life Features Section -->
	<section class="relative px-4 py-20 md:py-28 bg-linear-to-b from-violet-50/30 via-white to-slate-50/50">
		<div class="mx-auto max-w-6xl">
			<div class="text-center mb-16">
				<span class="font-mono inline-flex items-center gap-2 rounded-full bg-linear-to-r from-cyan-100 to-blue-100 px-4 py-1.5 text-sm font-medium text-cyan-700 border border-cyan-200/50">
					<Zap class="h-4 w-4" />
					Time-to-Value: Under 5 Minutes
				</span>
				<h2 class="font-serif mt-6 text-3xl font-medium text-slate-900 md:text-5xl">
					The <span class="gradient-text">Friction Reducers</span>
				</h2>
				<p class="mx-auto mt-4 max-w-2xl text-slate-600 text-lg">
					Quality of life features that don't change what the tool does — they change how it feels to use.
				</p>
			</div>

			<!-- QoL Features - Bento Grid Style -->
			<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{#each qolFeatures as feature, i}
					<div class="group relative rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm p-6 shadow-sm transition-all duration-300 hover:border-cyan-200 hover:shadow-lg hover:shadow-cyan-100/50 {i === 1 ? 'md:col-span-2' : ''} {i >= 3 ? 'md:col-span-2' : ''}">
						<!-- Icon with subtle animation -->
						<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-slate-100 to-slate-50 text-slate-600 ring-1 ring-slate-200/50 transition-all group-hover:from-cyan-100 group-hover:to-blue-50 group-hover:text-cyan-600 group-hover:ring-cyan-200/50">
							<feature.icon class="h-6 w-6" />
						</div>

						<h3 class="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
						<p class="text-sm text-slate-600 leading-relaxed">{feature.description}</p>
					</div>
				{/each}
			</div>

			<!-- CTA Banner -->
			<div class="mt-16 relative overflow-hidden rounded-3xl bg-linear-to-r from-violet-600 via-purple-600 to-indigo-600 p-8 md:p-12 text-center shadow-2xl shadow-violet-500/25">
				<!-- Background pattern -->
				<div class="absolute inset-0 opacity-10">
					<div class="absolute inset-0" style="background-image: url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E');"></div>
				</div>

				<div class="relative">
					<h3 class="font-serif text-2xl md:text-4xl font-medium text-white mb-4">
						Ready to get your first 3 leads for free?
					</h3>
					<p class="text-violet-100 text-lg mb-8 max-w-xl mx-auto">
						No credit card required. No account needed. See real results in under 5 minutes.
					</p>
					<div class="flex flex-col sm:flex-row gap-4 justify-center">
						<button class="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-base font-semibold text-violet-700 shadow-lg transition-all hover:bg-violet-50 hover:shadow-xl hover:scale-105">
							<Bot class="h-5 w-5" />
							Try Scout Agent Free
						</button>
						<button class="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/30 bg-white/10 backdrop-blur-sm px-8 py-4 text-base font-semibold text-white transition-all hover:bg-white/20 hover:border-white/50">
							Watch Demo
							<ArrowRight class="h-5 w-5" />
						</button>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Pricing Section -->
	<section id="pricing" class="relative px-4 py-20 md:py-32 overflow-hidden">
		<!-- Background -->
		<div class="absolute inset-0 bg-linear-to-b from-slate-50/50 via-white to-violet-50/30"></div>

		<div class="relative mx-auto max-w-6xl">
			<div class="text-center mb-16">
				<span class="font-mono inline-flex items-center gap-2 rounded-full bg-linear-to-r from-amber-100 to-orange-100 px-4 py-1.5 text-sm font-medium text-amber-700 border border-amber-200/50">
					<Crown class="h-4 w-4" />
					Simple Pricing
				</span>
				<h2 class="font-serif mt-6 text-3xl font-medium text-slate-900 md:text-5xl">
					Choose your <span class="gradient-text">plan</span>
				</h2>
				<p class="mx-auto mt-4 max-w-2xl text-slate-600 text-lg">
					Start free, upgrade when you need more. No hidden fees, no surprises.
				</p>
			</div>

			<!-- Pricing Cards -->
			<div class="grid gap-8 md:grid-cols-3">
				{#each pricingTiers as tier, i}
					<div class="group relative rounded-3xl border {tier.popular ? 'border-violet-300 bg-white shadow-xl shadow-violet-100/50' : 'border-slate-200/60 bg-white/80'} p-8 transition-all duration-300 hover:shadow-xl {tier.popular ? 'md:-translate-y-2' : 'hover:-translate-y-1'}">
						<!-- Popular Badge -->
						{#if tier.popular}
							<div class="absolute -top-4 left-1/2 -translate-x-1/2">
								<span class="inline-flex items-center gap-1.5 rounded-full bg-linear-to-r from-violet-600 to-purple-600 px-4 py-1.5 text-sm font-semibold text-white shadow-lg">
									<Sparkles class="h-4 w-4" />
									Most Popular
								</span>
							</div>
						{/if}

						<!-- Header -->
						<div class="text-center mb-8">
							<div class="mb-4 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br {tier.gradient} text-white shadow-lg">
								<tier.icon class="h-7 w-7" />
							</div>
							<h3 class="text-xl font-bold text-slate-900">{tier.name}</h3>
							<div class="mt-4 flex items-baseline justify-center gap-1">
								<span class="text-4xl font-bold text-slate-900">{tier.price}</span>
								{#if tier.period}
									<span class="text-slate-500">{tier.period}</span>
								{/if}
							</div>
							<p class="mt-3 text-sm text-slate-600">{tier.description}</p>
						</div>

						<!-- Features List -->
						<ul class="space-y-4 mb-8">
							{#each tier.features as feature}
								<li class="flex items-start gap-3">
									{#if feature.included}
										<div class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
											<Check class="h-3 w-3" />
										</div>
										<span class="text-sm text-slate-700">{feature.text}</span>
									{:else}
										<div class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
											<XIcon class="h-3 w-3" />
										</div>
										<span class="text-sm text-slate-400">{feature.text}</span>
									{/if}
								</li>
							{/each}
						</ul>

						<!-- CTA Button -->
						<button class="w-full rounded-full px-6 py-3.5 text-sm font-semibold transition-all {tier.buttonStyle} {tier.popular ? 'shadow-lg shadow-violet-200/50' : ''}">
							{#if tier.name === 'Enterprise'}
								Contact Sales
							{:else if tier.name === 'Free'}
								Get Started Free
							{:else}
								Start Pro Trial
							{/if}
						</button>
					</div>
				{/each}
			</div>

			<!-- FAQ/Trust Section -->
			<div class="mt-16 text-center">
				<p class="text-slate-600">
					<span class="font-semibold text-slate-900">30-day money-back guarantee</span> on all paid plans.
					<span class="mx-2 text-slate-300">•</span>
					Cancel anytime, no questions asked.
				</p>
				<div class="mt-6 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
					<div class="flex items-center gap-2">
						<Shield class="h-4 w-4 text-emerald-500" />
						PDPA Compliant
					</div>
					<div class="flex items-center gap-2">
						<BadgeCheck class="h-4 w-4 text-blue-500" />
						Verified Leads
					</div>
					<div class="flex items-center gap-2">
						<Globe class="h-4 w-4 text-violet-500" />
						Thai Language First
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Footer -->
	<footer class="border-t border-slate-200/60 bg-white/50 px-4 py-12">
		<div class="mx-auto max-w-6xl">
			<div class="flex flex-col items-center justify-between gap-6 md:flex-row">
				<div class="flex items-center gap-2">
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-violet-600 to-purple-700">
						<Zap class="h-4 w-4 text-white" />
					</div>
					<span class="text-lg font-bold text-slate-800">Julist V2</span>
				</div>
				<div class="flex gap-6 text-sm text-slate-500">
					<a href="#privacy" class="transition-colors hover:text-violet-600">Privacy</a>
					<a href="#terms" class="transition-colors hover:text-violet-600">Terms</a>
					<a href="#contact" class="transition-colors hover:text-violet-600">Contact</a>
				</div>
				<p class="font-mono text-sm text-slate-400">© 2026 Julist V2. All rights reserved.</p>
			</div>
		</div>
	</footer>
</div>
