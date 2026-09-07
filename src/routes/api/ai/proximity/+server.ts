import { json } from '@sveltejs/kit';
import { askGemini, parseGeminiJson } from '$lib/server/gemini';

type HazardReport = { address: string; hazard: string; platform: string; details: string };

export async function POST({ request, locals }) {
	if (!locals.user) return json({ error: 'Sign in to use BeaconAI.' }, { status: 401 });
	const body = await request.json().catch(() => null);
	if (
		!body ||
		typeof body.address !== 'string' ||
		!body.address.trim() ||
		body.address.length > 500 ||
		!Array.isArray(body.reports) ||
		body.reports.length > 100 ||
		!body.reports.every(
			(report: HazardReport) =>
				report &&
				['address', 'hazard', 'platform', 'details'].every(
					(key) =>
						typeof report[key as keyof HazardReport] === 'string' &&
						report[key as keyof HazardReport].length <= 5000
				)
		)
	)
		return json({ error: 'Provide an address and up to 100 valid reports.' }, { status: 400 });
	if (body.reports.length === 0) return json({ warning: null });

	try {
		const text = await askGemini(`
You are checking whether a worker's start address is near a previously reported dangerous area.
Use conservative reasoning: only say dangerous=true when a report clearly refers to the same place or a nearby place.
Return only JSON with the exact shape {"dangerous":boolean,"warning":"string"}.
Start address: ${body.address}
Existing reports: ${JSON.stringify(body.reports ?? [])}
`);
		const result = parseGeminiJson<{ dangerous?: boolean; warning?: string }>(text);
		if (
			!result ||
			typeof result.dangerous !== 'boolean' ||
			typeof result.warning !== 'string' ||
			(result.dangerous && !result.warning.trim())
		)
			throw new Error('Invalid advisory');
		return json({ warning: result.dangerous ? result.warning.trim() : null });
	} catch {
		return json(
			{ error: 'BeaconAI could not check nearby reports. Please try again.' },
			{ status: 503 }
		);
	}
}
