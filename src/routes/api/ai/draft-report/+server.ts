import { json } from '@sveltejs/kit';
import { askGemini, parseGeminiJson } from '$lib/server/gemini';

type DraftRequest = { address?: string; details?: string; platform?: string; checkinAt?: string };

export async function POST({ request }) {
	const body = (await request.json()) as DraftRequest;
	if (!body.address?.trim() || !body.details?.trim()) {
		return json({ error: 'Address and details are required.' }, { status: 400 });
	}

	try {
		const text = await askGemini(`
You are drafting a hazard report from a worker's note. Do not invent facts. Return only JSON with
the exact shape {"hazard":"...","details":"..."}. Use "Unclassified hazard" if the type is unclear.
Address: ${body.address}
Worker note: ${body.details}
Platform: ${body.platform || 'Unknown'}
Check-in started at: ${body.checkinAt || 'Unknown'}
`);
		const draft = parseGeminiJson<{ hazard?: string; details?: string }>(text);
		return json({
			draft: {
				address: body.address.trim(),
				hazard: draft.hazard?.trim() || 'Unclassified hazard',
				platform: body.platform?.trim() || 'Unknown',
				details: draft.details?.trim() || body.details.trim(),
				checkinAt: body.checkinAt || new Date().toISOString(),
				loggedAt: new Date().toISOString()
			}
		});
	} catch (error) {
		return json({ error: error instanceof Error ? error.message : 'Unable to draft report.' }, { status: 503 });
	}
}