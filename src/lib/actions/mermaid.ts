import mermaid from 'mermaid';

let initialized = false;

function initMermaid() {
	if (initialized) return;
	mermaid.initialize({
		theme: 'dark',
		startOnLoad: false,
		securityLevel: 'loose'
	});
	initialized = true;
}

function runMermaidOnNode(node: HTMLElement) {
	const codes = node.querySelectorAll('code.language-mermaid');
	if (codes.length === 0) return;

	const runNodes: HTMLElement[] = [];
	codes.forEach((code) => {
		const pre = code.closest('pre');
		if (!pre || !(pre instanceof HTMLElement)) return;
		const text = code.textContent?.trim();
		if (!text) return;

		const wrapper = document.createElement('div');
		wrapper.className = 'mermaid';
		wrapper.textContent = text;
		pre.replaceWith(wrapper);
		runNodes.push(wrapper);
	});

	if (runNodes.length > 0) {
		mermaid.run({ nodes: runNodes, suppressErrors: true });
	}
}

/**
 * Svelte action that finds mermaid code blocks (from markdown ```mermaid) and renders them as SVG.
 * Apply to the container that holds the output of parseMarkdown(), e.g. use:useMermaid
 * Pass a key (e.g. the markdown content) as the second argument to re-run when content changes.
 */
export function useMermaid(node: HTMLElement, _key?: string) {
	initMermaid();
	runMermaidOnNode(node);

	return {
		update(_key?: string) {
			runMermaidOnNode(node);
		},
		destroy() {}
	};
}
