import { expect, test, type Locator, type Page } from '@playwright/test';

const origin = 'http://localhost:4173';
const address = '123 King Street, Toronto';
const workerNote = 'Broken glass by the east entrance. I used the west entrance instead.';
const checkinAt = '2026-09-06T14:00:00.000Z';
const loggedAt = '2026-09-06T14:07:00.000Z';
const draft = {
	address,
	platform: 'Uber',
	hazard: 'Broken glass',
	details: 'Broken glass was reported by the east entrance.',
	checkinAt,
	loggedAt
};

test.use({ baseURL: origin, locale: 'en-US', timezoneId: 'UTC' });

async function startCheckin(page: Page) {
	const checkin = page.getByRole('region', { name: 'AI check-in', exact: true });
	await checkin.getByLabel('Start address', { exact: true }).fill(address);
	await checkin.getByLabel('Platform', { exact: true }).selectOption({ label: 'Uber' });
	await checkin.getByLabel('Duration (minutes)', { exact: true }).fill('15');
	await checkin.getByRole('button', { name: 'Start AI check-in', exact: true }).click();
	await expect(checkin.getByRole('button', { name: /finish AI check-in/ })).toBeVisible();
	return checkin;
}

async function finishWithNote(checkin: Locator) {
	await checkin.getByRole('button', { name: /finish AI check-in/ }).click();
	await checkin.getByLabel('Worker note', { exact: true }).fill(workerNote);
	await checkin.getByRole('button', { name: 'Draft report with Gemini', exact: true }).click();
}

async function expectNoHorizontalOverflow(page: Page) {
	const dimensions = await page.evaluate(() => ({
		viewport: document.documentElement.clientWidth,
		content: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
	}));
	expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
}

for (const viewport of [
	{ name: 'desktop', width: 1280, height: 900 },
	{ name: 'mobile', width: 390, height: 844 }
]) {
	test.describe(`AI check-in (${viewport.name})`, () => {
		test.use({ viewport: { width: viewport.width, height: viewport.height } });

		test.beforeEach(async ({ context, page }) => {
			await context.addCookies([{ name: 'sessionid', value: 'ai-e2e-session', url: origin }]);
			// Browser scenarios never reach Gemini, even when a test overrides one endpoint.
			await page.route('**/api/ai/**', async (route) => {
				const pathname = new URL(route.request().url()).pathname;
				if (pathname === '/api/ai/proximity') {
					await route.fulfill({ json: { warning: null } });
				} else if (pathname === '/api/ai/draft-report') {
					await route.fulfill({ json: { draft } });
				} else {
					await route.abort('blockedbyclient');
				}
			});
			await page.goto('/');
			await expect(page.getByRole('region', { name: 'AI check-in', exact: true })).toBeVisible();
		});

		test('reviews and edits a draft before saving one report with its timestamps', async ({ page }, testInfo) => {
			await expectNoHorizontalOverflow(page);
			await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-overview.png`), fullPage: true });
			const proximityRequest = page.waitForRequest('**/api/ai/proximity');
			const checkin = await startCheckin(page);
			expect((await proximityRequest).postDataJSON()).toMatchObject({ address, reports: [] });
			const draftRequest = page.waitForRequest('**/api/ai/draft-report');
			await finishWithNote(checkin);
			expect((await draftRequest).postDataJSON()).toMatchObject({ address, platform: 'Uber', details: workerNote });
			await expect(checkin.getByLabel('Report hazard', { exact: true })).toHaveValue(draft.hazard);
			await expect(checkin.getByLabel('Report details', { exact: true })).toHaveValue(draft.details);
			await checkin.getByLabel('Report address', { exact: true }).fill('125 King Street, Toronto');
			await checkin.getByLabel('Report platform', { exact: true }).fill('Uber Eats');
			await checkin.getByLabel('Report hazard', { exact: true }).fill('Glass at entrance');
			await checkin.getByLabel('Report details', { exact: true }).fill('Reviewed: glass at the east entrance; west entrance was clear.');
			await expectNoHorizontalOverflow(page);
			await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-review.png`), fullPage: true });

			await page.getByRole('tab', { name: 'Reports', exact: true }).click();
			const reports = page.getByRole('tabpanel', { name: 'Reports', exact: true });
			await expect(reports.getByRole('heading', { name: 'Submitted reports', exact: true })).toBeVisible();
			await expect(reports.getByText('Glass at entrance', { exact: true })).toHaveCount(0);
			await page.getByRole('tab', { name: 'Overview', exact: true }).click();
			await expect(checkin.getByLabel('Report hazard', { exact: true })).toHaveValue('Glass at entrance');
			await checkin.getByRole('button', { name: 'Save reviewed report', exact: true }).click();
			await page.getByRole('tab', { name: 'Reports', exact: true }).click();
			await expect(reports.getByText('Glass at entrance', { exact: true })).toHaveCount(1);
			await expect(reports.getByText('125 King Street, Toronto', { exact: true })).toBeVisible();
			await expect(reports.getByText('Uber Eats', { exact: true })).toBeVisible();
			await expect(reports.getByText('Reviewed: glass at the east entrance; west entrance was clear.', { exact: true })).toBeVisible();
			// Format in the browser's locale, matching how the UI renders the ISO timestamps.
			for (const timestamp of [checkinAt, loggedAt]) {
				const formatted = await page.evaluate((value) => new Date(value).toLocaleString(), timestamp);
				await expect(reports).toContainText(formatted);
			}
			await expectNoHorizontalOverflow(page);
			await page.getByRole('tab', { name: 'Overview', exact: true }).click();
			await expect(checkin.getByRole('button', { name: 'Start AI check-in', exact: true })).toBeVisible();
			await expect(checkin.getByRole('button', { name: 'Save reviewed report', exact: true })).toHaveCount(0);
		});

		test('shows a proximity warning and cancels without creating a report', async ({ page }) => {
			const warning = 'A recent report describes broken glass near this address.';
			await page.route('**/api/ai/proximity', (route) => route.fulfill({ json: { warning } }));
			let draftRequests = 0;
			page.on('request', (request) => {
				if (new URL(request.url()).pathname === '/api/ai/draft-report') draftRequests++;
			});
			const checkin = await startCheckin(page);
			await expect(checkin.getByText(warning, { exact: true })).toBeVisible();
			await expectNoHorizontalOverflow(page);
			await checkin.getByRole('button', { name: 'Cancel AI check-in', exact: true }).click();
			await expect(checkin.getByRole('button', { name: 'Start AI check-in', exact: true })).toBeVisible();
			await expect(checkin.getByText(warning, { exact: true })).toHaveCount(0);
			await page.getByRole('tab', { name: 'Reports', exact: true }).click();
			await expect(page.getByRole('tabpanel', { name: 'Reports', exact: true })).not.toContainText(draft.hazard);
			expect(draftRequests).toBe(0);
		});

		test('keeps the check-in usable when proximity is unavailable', async ({ page }) => {
			await page.route('**/api/ai/proximity', (route) => route.fulfill({
				status: 503,
				json: { error: 'AI proximity check is temporarily unavailable.' }
			}));
			const checkin = await startCheckin(page);
			await expect(checkin).toContainText(/unavailable|could not|couldn't|unable/i);
			await checkin.getByRole('button', { name: /finish AI check-in/ }).click();
			await checkin.getByRole('button', { name: 'Finish without a report', exact: true }).click();
			await expect(checkin.getByRole('button', { name: 'Start AI check-in', exact: true })).toBeVisible();
			await expectNoHorizontalOverflow(page);
		});

		test('preserves a worker note after a draft failure and allows retry or dismissal', async ({ page }) => {
			let attempts = 0;
			await page.route('**/api/ai/draft-report', async (route) => {
				attempts++;
				await route.fulfill(attempts === 1
					? { status: 503, json: { error: 'Draft service temporarily unavailable. Please retry.' } }
					: { json: { draft } });
			});
			const checkin = await startCheckin(page);
			await finishWithNote(checkin);
			await expect(checkin).toContainText('Draft service temporarily unavailable. Please retry.');
			await expect(checkin.getByLabel('Worker note', { exact: true })).toHaveValue(workerNote);
			await expect(checkin.getByRole('button', { name: 'Save reviewed report', exact: true })).toHaveCount(0);
			await page.getByRole('tab', { name: 'Contacts', exact: true }).click();
			await page.getByRole('tab', { name: 'Overview', exact: true }).click();
			await expect(checkin.getByLabel('Worker note', { exact: true })).toHaveValue(workerNote);
			await checkin.getByRole('button', { name: 'Draft report with Gemini', exact: true }).click();
			await expect(checkin.getByLabel('Report hazard', { exact: true })).toHaveValue(draft.hazard);
			expect(attempts).toBe(2);
			await checkin.getByRole('button', { name: 'Finish without a report', exact: true }).click();
			await expect(checkin.getByRole('button', { name: 'Start AI check-in', exact: true })).toBeVisible();
			await page.getByRole('tab', { name: 'Reports', exact: true }).click();
			await expect(page.getByRole('tabpanel', { name: 'Reports', exact: true })).not.toContainText(draft.hazard);
		});

		test('keeps AI, timer, and contact state while switching mounted tab panels', async ({ page }) => {
			const checkin = await startCheckin(page);
			const overview = page.getByRole('tabpanel', { name: 'Overview', exact: true });
			const timer = overview.getByRole('region', { name: /^(?!AI).*check.in/i });
			await timer.getByRole('button', { name: /start/i }).click();
			await page.getByRole('tab', { name: 'Contacts', exact: true }).click();
			const contacts = page.getByRole('tabpanel', { name: 'Contacts', exact: true });
			await contacts.getByRole('textbox', { name: /name/i }).fill('E2E Safety Contact');
			await contacts.getByRole('textbox', { name: /phone/i }).fill('4165550123');
			await contacts.getByRole('button', { name: /add/i }).click();
			await expect(contacts.getByText('E2E Safety Contact', { exact: true })).toBeVisible();
			await page.getByRole('tab', { name: 'Reports', exact: true }).click();
			await expect(page.getByRole('tabpanel', { name: 'Overview', exact: true, includeHidden: true })).toBeHidden();
			await expect(page.getByRole('tabpanel', { name: 'Contacts', exact: true, includeHidden: true })).toBeHidden();
			await expect(page.getByRole('tabpanel', { includeHidden: true })).toHaveCount(3);
			await page.getByRole('tab', { name: 'Overview', exact: true }).click();
			await expect(checkin.getByRole('button', { name: /finish AI check-in/ })).toBeVisible();
			await expect(checkin).toContainText(address);
			await expect(timer.getByRole('button', { name: /cancel|stop|safe/i })).toBeVisible();
			await page.getByRole('tab', { name: 'Contacts', exact: true }).click();
			await expect(contacts.getByText('E2E Safety Contact', { exact: true })).toBeVisible();
			await expect(contacts).toContainText('4165550123');
			await expectNoHorizontalOverflow(page);
		});
	});
}

test.describe('AI endpoint validation without Gemini', () => {
	for (const endpoint of ['proximity', 'draft-report']) {
		test(`${endpoint} rejects unauthenticated requests`, async ({ request }) => {
			// Malformed JSON also guarantees this cannot reach Gemini on an auth regression.
			const response = await request.post(`/api/ai/${endpoint}`, {
				data: '{',
				headers: { 'Content-Type': 'application/json' }
			});
			expect(response.status()).toBe(401);
		});

		test(`${endpoint} rejects malformed JSON for an authenticated session`, async ({ context }) => {
			await context.addCookies([{ name: 'sessionid', value: 'ai-validation-session', url: origin }]);
			const response = await context.request.post(`/api/ai/${endpoint}`, {
				data: '{',
				headers: { 'Content-Type': 'application/json' }
			});
			expect(response.status()).toBe(400);
		});

		for (const invalid of [
			{ name: 'null body', body: null },
			{ name: 'numeric address', body: { address: 123, details: workerNote, reports: [] } },
			{ name: 'object address', body: { address: {}, details: workerNote, reports: [] } }
		]) {
			test(`${endpoint} rejects ${invalid.name}`, async ({ context }) => {
				await context.addCookies([{ name: 'sessionid', value: 'ai-validation-session', url: origin }]);
				const response = await context.request.post(`/api/ai/${endpoint}`, {
					data: JSON.stringify(invalid.body),
					headers: { 'Content-Type': 'application/json' }
				});
				expect(response.status()).toBe(400);
			});
		}
	}

	test('empty reports return no proximity warning without an AI request', async ({ context }) => {
		await context.addCookies([{ name: 'sessionid', value: 'ai-validation-session', url: origin }]);
		const response = await context.request.post('/api/ai/proximity', {
			data: { address, reports: [] }
		});
		expect(response.status()).toBe(200);
		await expect(response).toBeOK();
		expect(await response.json()).toEqual({ warning: null });
	});
});
