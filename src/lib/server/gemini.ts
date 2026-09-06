import { env } from '$env/dynamic/private';

const geminiModels = [
	'gemini-3.6-flash',
	'gemini-3.5-flash-lite',
	'gemini-3.5-flash',
	'gemini-flash-latest'
];

export async function askGemini(prompt: string): Promise<string> {
	const apiKey = env.GEMINI_API_KEY;
	if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

	let lastError = 'Gemini request failed';
	for (const model of geminiModels) {
		const response = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
			{
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					contents: [{ parts: [{ text: prompt }] }],
					generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
				})
			}
		);

		if (!response.ok) {
			const error = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
			lastError = error.error?.message || `Gemini request failed with ${response.status}`;
			if (![404, 429, 503].includes(response.status)) throw new Error(lastError);
			continue;
		}

		const payload = (await response.json()) as {
			candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
		};
		const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
		if (text) return text;
		lastError = 'Gemini returned an empty response';
	}

	throw new Error(lastError);
}

export function parseGeminiJson<T>(text: string): T {
	const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
	return JSON.parse(cleaned) as T;
}