import { OPENROUTER_API_KEY } from '$env/static/private';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/embeddings';
const EMBEDDING_MODEL = 'qwen/qwen3-embedding-8b:nitro';
const EMBEDDING_DIMENSIONS = 1024;

interface EmbeddingResponse {
	object: string;
	data: Array<{
		object: string;
		embedding: number[];
		index: number;
	}>;
	model: string;
	usage: {
		prompt_tokens: number;
		total_tokens: number;
	};
}

/**
 * Generate embeddings using OpenRouter's qwen3-embedding-8b model
 * @param text - The text to generate embeddings for
 * @returns Array of embedding values
 */
export async function getEmbedding(text: string): Promise<number[]> {
	if (!text || text.trim().length === 0) {
		throw new Error('Text cannot be empty for embedding generation');
	}

	const response = await fetch(OPENROUTER_API_URL, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${OPENROUTER_API_KEY}`,
			'Content-Type': 'application/json',
			'HTTP-Referer': 'https://julist.app',
			'X-Title': 'Julist Company Search'
		},
		body: JSON.stringify({
			model: EMBEDDING_MODEL,
			input: text.trim(),
			dimensions: EMBEDDING_DIMENSIONS
		})
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
	}

	const data = (await response.json()) as EmbeddingResponse;

	if (!data.data || data.data.length === 0 || !data.data[0].embedding) {
		throw new Error('Invalid embedding response from OpenRouter');
	}

	return data.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in batch
 * @param texts - Array of texts to generate embeddings for
 * @returns Array of embedding arrays
 */
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
	if (!texts || texts.length === 0) {
		return [];
	}

	const response = await fetch(OPENROUTER_API_URL, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${OPENROUTER_API_KEY}`,
			'Content-Type': 'application/json',
			'HTTP-Referer': 'https://julist.app',
			'X-Title': 'Julist Company Search'
		},
		body: JSON.stringify({
			model: EMBEDDING_MODEL,
			input: texts.map((t) => t.trim()),
			dimensions: EMBEDDING_DIMENSIONS
		})
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
	}

	const data = (await response.json()) as EmbeddingResponse;

	if (!data.data || data.data.length === 0) {
		throw new Error('Invalid embedding response from OpenRouter');
	}

	// Sort by index to ensure correct order
	return data.data.sort((a, b) => a.index - b.index).map((item) => item.embedding);
}
