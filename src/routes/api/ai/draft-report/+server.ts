import { json } from '@sveltejs/kit';
import { askGemini, parseGeminiJson } from '$lib/server/gemini';

export async function POST({ request, locals }) {
	if (!locals.user) return json({ error: 'Sign in to use BeaconAI.' }, { status: 401 });
	const body = await request.json().catch(() => null);
	if (
		!body ||
		typeof body.address !== 'string' ||
		!body.address.trim() ||
		body.address.length > 500 ||
		typeof body.details !== 'string' ||
		!body.details.trim() ||
		body.details.length > 5000 ||
		(body.platform !== undefined &&
			(typeof body.platform !== 'string' || body.platform.length > 100)) ||
		(body.checkinAt !== undefined &&
			(typeof body.checkinAt !== 'string' || !Number.isFinite(Date.parse(body.checkinAt))))
	) {
		return json(
			{ error: 'Provide a valid address, note, platform, and check-in time.' },
			{ status: 400 }
		);
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
		if (
			!draft ||
			(draft.hazard !== undefined && typeof draft.hazard !== 'string') ||
			(draft.details !== undefined && typeof draft.details !== 'string')
		)
			throw new Error('Invalid draft');
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
	} catch {
		return json(
			{ error: 'BeaconAI could not draft your report. Please try again.' },
			{ status: 503 }
		);
	}
}
