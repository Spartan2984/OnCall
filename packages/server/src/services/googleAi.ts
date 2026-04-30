/**
 * Google Generative AI client for @ai-sdk/google.
 * The SDK defaults to GOOGLE_GENERATIVE_AI_API_KEY; we also accept GOOGLE_GEMINI_API_KEY
 * (and GEMINI_API_KEY) so local .env matches README and still works.
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";

function resolveGoogleApiKey(): string {
	return (
		process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
		process.env.GOOGLE_GEMINI_API_KEY?.trim() ||
		process.env.GEMINI_API_KEY?.trim() ||
		""
	);
}

let cachedProvider: ReturnType<typeof createGoogleGenerativeAI> | null = null;
let cachedKey = "";

export function getGoogleGenerativeAI(): ReturnType<typeof createGoogleGenerativeAI> {
	const apiKey = resolveGoogleApiKey();
	if (!apiKey) {
		throw new Error(
			"Missing Google AI API key. Set GOOGLE_GENERATIVE_AI_API_KEY (recommended) or GOOGLE_GEMINI_API_KEY in packages/server/.env"
		);
	}
	if (!cachedProvider || cachedKey !== apiKey) {
		cachedProvider = createGoogleGenerativeAI({ apiKey });
		cachedKey = apiKey;
	}
	return cachedProvider;
}
