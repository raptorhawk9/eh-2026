import { json } from '@sveltejs/kit';
import { askGemini, parseGeminiJson } from '$lib/server/gemini';

type HazardReport = { address: string; hazard: string; platform: string; details: string };

export async function POST({ request }) {
	const body = (await request.json()) as { address?: string; reports?: HazardReport[] };
	if (!body.address?.trim()) return json({ warning: null });

	try {
		const text = await askGemini(`
You are checking whether a worker's start address is near a previously reported dangerous area.
Use conservative reasoning: only say dangerous=true when a report clearly refers to the same place or a nearby place.
Return only JSON with the exact shape {"dangerous":boolean,"warning":"string"}.
Start address: ${body.address}
Existing reports: ${JSON.stringify(body.reports ?? [])}
`);
		const result = parseGeminiJson<{ dangerous?: boolean; warning?: string }>(text);
		return json({ warning: result.dangerous && result.warning ? result.warning.trim() : null });
	} catch {
		return json({ warning: null });
	}
}