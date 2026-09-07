<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import { formatReportDate, platforms, type HazardReport } from '$lib/report';

	let {
		reports,
		onReport
	}: {
		reports: HazardReport[];
		onReport: (report: HazardReport) => void;
	} = $props();

	const uid = $props.id();
	let heading: HTMLHeadingElement | undefined;
	let stage = $state<'setup' | 'active' | 'note' | 'review'>('setup');
	let address = $state('');
	let platform = $state('');
	let otherPlatform = $state('');
	let duration = $state<number | undefined>();
	let session = $state.raw<{ address: string; platform: string; checkinAt: string } | null>(null);
	let time = $state(0);
	let details = $state('');
	let draft = $state<HazardReport | null>(null);
	let proximity = $state<'idle' | 'loading' | 'done' | 'error'>('idle');
	let warning = $state<string | null>(null);
	let proximityError = $state('');
	let comparedReports = $state(0);
	let error = $state('');
	let notice = $state('');
	let isDrafting = $state(false);
	let isSaving = $state(false);
	let timer: ReturnType<typeof setInterval> | undefined;
	let proximityRequest: AbortController | undefined;
	let draftRequest: AbortController | undefined;

	async function focusHeading() {
		await tick();
		if (heading?.getClientRects().length) heading.focus();
	}

	function stopTimer() {
		if (timer !== undefined) clearInterval(timer);
		timer = undefined;
	}

	function cancelRequests() {
		proximityRequest?.abort();
		draftRequest?.abort();
		proximityRequest = undefined;
		draftRequest = undefined;
	}

	function startSession() {
		if (stage !== 'setup') return;
		const selectedPlatform = platform === 'Other' ? otherPlatform.trim() : platform;
		if (
			!address.trim() ||
			!selectedPlatform ||
			!duration ||
			!Number.isFinite(duration) ||
			!Number.isInteger(duration) ||
			duration < 1 ||
			duration > 1440
		) {
			error = 'Enter an address, platform, and a whole number of minutes from 1 to 1,440.';
			return;
		}
		cancelRequests();
		stopTimer();
		error = '';
		notice = '';
		details = '';
		draft = null;
		session = {
			address: address.trim(),
			platform: selectedPlatform,
			checkinAt: new Date().toISOString()
		};
		time = duration * 60;
		const endsAt = Date.now() + time * 1000;
		stage = 'active';
		timer = setInterval(() => {
			time = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
			if (time === 0) {
				stopTimer();
				stage = 'note';
				notice =
					'BeaconAI check-in timer finished. Add a note or finish without a report. No emergency alert was sent.';
			}
		}, 1000);
		void checkNearbyReports();
		void focusHeading();
	}

	async function checkNearbyReports() {
		if (!session || proximity === 'loading') return;
		const currentSession = session;
		const controller = new AbortController();
		proximityRequest?.abort();
		proximityRequest = controller;
		proximity = 'loading';
		proximityError = '';
		warning = null;
		comparedReports = reports.length;
		const timeout = setTimeout(() => controller.abort(), 25000);
		try {
			const response = await fetch('/api/ai/proximity', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ address: currentSession.address, reports }),
				signal: controller.signal
			});
			const result = await response.json();
			if (
				!response.ok ||
				!result ||
				(result.warning !== null && typeof result.warning !== 'string')
			) {
				throw new Error('The nearby-report check could not be completed.');
			}
			if (proximityRequest !== controller || session !== currentSession) return;
			warning = result.warning?.trim() || null;
			proximity = 'done';
		} catch {
			if (proximityRequest !== controller || session !== currentSession) return;
			proximity = 'error';
			proximityError = controller.signal.aborted
				? 'The nearby-report check timed out.'
				: 'BeaconAI could not complete the nearby-report check. Please try again.';
		} finally {
			clearTimeout(timeout);
			if (proximityRequest === controller) proximityRequest = undefined;
		}
	}

	function completeCheckin() {
		if (stage !== 'active') return;
		stopTimer();
		time = 0;
		stage = 'note';
		void focusHeading();
	}

	function resetSession(message = '') {
		cancelRequests();
		stopTimer();
		stage = 'setup';
		session = null;
		details = '';
		draft = null;
		error = '';
		isDrafting = false;
		isSaving = false;
		proximity = 'idle';
		warning = null;
		notice = message;
		void focusHeading();
	}

	async function submitNote() {
		if (stage !== 'note' || isDrafting || !session) return;
		if (!details.trim()) {
			error = 'Add a worker note to create a draft, or finish without a report.';
			return;
		}
		const currentSession = session;
		const controller = new AbortController();
		draftRequest = controller;
		isDrafting = true;
		error = '';
		const timeout = setTimeout(() => controller.abort(), 45000);
		try {
			const response = await fetch('/api/ai/draft-report', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ ...currentSession, details: details.trim() }),
				signal: controller.signal
			});
			const result = await response.json();
			if (
				!response.ok ||
				!result?.draft ||
				typeof result.draft.hazard !== 'string' ||
				!result.draft.hazard.trim() ||
				typeof result.draft.details !== 'string'
			) {
				throw new Error('BeaconAI did not return a usable draft.');
			}
			if (draftRequest !== controller || session !== currentSession) return;
			
			draft = {
				...currentSession,
				hazard: result.draft.hazard.trim(),
				details: result.draft.details,
				loggedAt: ''
			};
			stage = 'review';
			void focusHeading();
		} catch {
			if (draftRequest !== controller || session !== currentSession) return;
			error = `${controller.signal.aborted ? 'Drafting timed out.' : 'BeaconAI could not create a draft right now.'} Your note is still here. Try again or finish without a report.`;
		} finally {
			clearTimeout(timeout);
			if (draftRequest === controller) {
				draftRequest = undefined;
				isDrafting = false;
			}
		}
	}

	function confirmDraft() {
		if (stage !== 'review' || !draft || !session || isSaving) return;
		if (
			!draft.address.trim() ||
			!draft.hazard.trim() ||
			!draft.platform.trim() ||
			!draft.details.trim()
		) {
			error = 'Enter an address, hazard, platform, and details before saving the report.';
			return;
		}
		isSaving = true;
		error = '';
		try {
			onReport({
				address: draft.address.trim(),
				hazard: draft.hazard.trim(),
				platform: draft.platform.trim(),
				details: draft.details.trim(),
				checkinAt: session.checkinAt,
				loggedAt: new Date().toISOString()
			});
			resetSession(
				'Report added. Open Reports to view it. Reports are kept only until this page is reloaded.'
			);
		} catch {
			isSaving = false;
			error = 'The report could not be added. Your edits are still here; try saving again.';
		}
	}

	onDestroy(() => {
		stopTimer();
		cancelRequests();
	});
</script>

<section class="ai-checkin" aria-labelledby={`${uid}-heading`}>
	<div class="section-heading">
		<h2
			id={`${uid}-heading`}
			{@attach (element) => {
				heading = element;
				return () => {
					heading = undefined;
				};
			}}
			tabindex="-1"
		>
			BeaconAI check-in
		</h2>
		<span class="advisory-label">Advisory only</span>
	</div>
	<p class="intro">
		Check available reports near your stop, then turn your notes into a draft with BeaconAI. Review
		every detail before saving.
	</p>
	<p class="helper">
		BeaconAI does not contact emergency services or confirm that a location is safe. When the timer
		ends, it prompts you to add a note, not an emergency alert.
	</p>
	<div role="status" class="notice">{notice}</div>

	{#if stage === 'setup'}
		<form
			class="setup-form"
			onsubmit={(event) => {
				event.preventDefault();
				startSession();
			}}
		>
			<label class="full-width"
				>Start address<input
					bind:value={address}
					autocomplete="street-address"
					maxlength="500"
					required
				/></label
			>
			<label
				>Platform<select bind:value={platform} required>
					<option value="">Choose a platform</option>
					{#each platforms as option (option)}<option value={option}>{option}</option>{/each}
				</select></label
			>
			<label
				>Duration (minutes)<input
					type="number"
					min="1"
					max="1440"
					step="1"
					bind:value={duration}
					required
				/></label
			>
			{#if platform === 'Other'}<label class="full-width"
					>Enter the platform<input bind:value={otherPlatform} maxlength="100" required /></label
				>{/if}
			<div class="actions full-width">
				<button class="primary" type="submit">Start BeaconAI check-in</button><span class="helper"
					>To run this check-in, BeaconAI sends your address, notes, and available reports to an
					external AI service.</span
				>
			</div>
		</form>
	{:else if session}
		<div class="session-summary">
			<div>
				<p class="session-address">{session.address}</p>
				<p class="helper">
					{session.platform} · Started
					<time datetime={session.checkinAt}>{formatReportDate(session.checkinAt)}</time>
				</p>
			</div>
			{#if stage === 'active'}<div
					class="countdown"
					role="timer"
					aria-label="BeaconAI check-in time remaining"
				>
					{Math.floor(time / 60)}:{String(time % 60).padStart(2, '0')}
				</div>{/if}
		</div>
		<div class="proximity" aria-live="polite">
			{#if proximity === 'loading'}<p>Checking available reports near this stop…</p>
			{:else if proximity === 'error'}
				<p class="warning">
					<strong>Nearby-report check unavailable.</strong>
					{proximityError} Nearby hazards have not been assessed. Stay alert and use your own judgment.
				</p>
				<button class="secondary" type="button" onclick={checkNearbyReports}
					>Retry nearby check</button
				>
			{:else if proximity === 'done' && warning}<p class="warning">
					<strong>Possible nearby hazard.</strong>
					{warning} This BeaconAI advisory may be incomplete or inaccurate.
				</p>
			{:else if proximity === 'done'}<p>
					{comparedReports === 0
						? 'No reports in this page session to compare. Hazards may be unreported.'
						: 'No nearby hazards were flagged in the available reports. This is not a safety clearance.'}
				</p>{/if}
		</div>
		{#if stage === 'active'}
			<div class="actions">
				<button class="primary" type="button" onclick={completeCheckin}
					>Finish BeaconAI check-in</button
				><button
					class="secondary"
					type="button"
					onclick={() => resetSession('BeaconAI check-in cancelled. No report was added.')}
					>Cancel BeaconAI check-in</button
				>
			</div>
		{:else if stage === 'note'}
			<form
				class="step-form"
				onsubmit={(event) => {
					event.preventDefault();
					void submitNote();
				}}
				aria-busy={isDrafting}
			>
				<h3>Anything worth flagging about this stop?</h3>
				<p class="helper">
					Describe only what you observed. A note is optional unless you want to draft a report.
				</p>
				<label
					>Worker note<textarea rows="4" maxlength="5000" bind:value={details} disabled={isDrafting}
					></textarea></label
				>
				<div class="actions">
					<button class="primary" type="submit" disabled={isDrafting || !details.trim()}
						>{isDrafting ? 'Drafting with BeaconAI...' : 'Draft report with BeaconAI'}</button
					><button
						class="secondary"
						type="button"
						onclick={() => resetSession('BeaconAI check-in finished. No report was added.')}
						>{isDrafting ? 'Cancel draft' : 'Finish without a report'}</button
					>
				</div>
				<p class="helper" role="status">
					{isDrafting
						? 'Creating your draft. Nothing will be saved until you review and confirm.'
						: ''}
				</p>
			</form>
		{:else if stage === 'review' && draft}
			<form
				class="step-form"
				onsubmit={(event) => {
					event.preventDefault();
					confirmDraft();
				}}
			>
				<h3>Review your BeaconAI draft</h3>
				<p class="helper">
					BeaconAI can make mistakes. Edit the fields below to match what happened. Nothing has been
					saved yet.
				</p>
				<div class="review-fields">
					<label>Report address<input bind:value={draft.address} maxlength="500" required /></label>
					<label
						>Report platform<input bind:value={draft.platform} maxlength="100" required /></label
					>
					<label class="full-width"
						>Report hazard<input bind:value={draft.hazard} maxlength="500" required /></label
					>
					<label class="full-width"
						>Report details<textarea rows="4" bind:value={draft.details} maxlength="5000" required
						></textarea></label
					>
				</div>
				<details class="original-note">
					<summary>Your original note</summary>
					<p>{details}</p>
				</details>
				<p class="helper">
					Check-in: {formatReportDate(session.checkinAt)}. The logged time is added when you save.
				</p>
				<div class="actions">
					<button class="primary" type="submit" disabled={isSaving}>Save reviewed report</button
					><button
						class="secondary"
						type="button"
						disabled={isSaving}
						onclick={() => resetSession('Draft discarded. No report was added.')}
						>Discard draft</button
					>
				</div>
			</form>
		{/if}
	{/if}
	{#if error}<p class="error" role="alert">{error}</p>{/if}
</section>

<style>
	.ai-checkin {
		min-width: 0;
		border: 1px solid #d8dce7;
		border-radius: 16px;
		background: #fff;
		padding: 24px;
		color: #172033;
	}
	.section-heading,
	.session-summary,
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
	}
	.section-heading {
		justify-content: space-between;
	}
	h2 {
		font-size: 1.25rem;
		font-weight: 600;
		letter-spacing: -0.025em;
	}
	h3 {
		font-size: 1.125rem;
		font-weight: 600;
	}
	.advisory-label {
		border-radius: 999px;
		padding: 4px 10px;
		background: #edf1ff;
		color: #1238dd;
		font-size: 0.75rem;
		font-weight: 500;
	}
	.intro {
		margin-top: 8px;
		max-width: 72ch;
		font-size: 0.875rem;
		line-height: 1.6;
		color: #586174;
	}
	.helper {
		color: #586174;
		font-size: 0.8125rem;
		line-height: 1.6;
		max-width: 75ch;
	}
	.intro + .helper {
		margin-top: 6px;
	}
	.notice:not(:empty) {
		margin-top: 16px;
		color: #1238dd;
		font-size: 0.875rem;
		line-height: 1.6;
	}
	.setup-form {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
		margin-top: 24px;
	}
	label {
		display: grid;
		gap: 6px;
		min-width: 0;
		font-size: 0.875rem;
		font-weight: 500;
		color: #28344a;
	}
	input,
	select,
	textarea {
		width: 100%;
		min-width: 0;
		border: 1px solid #c8cfdd;
		border-radius: 12px;
		background: white;
		padding: 10px 12px;
		font: inherit;
		font-weight: 400;
		color: #172033;
		caret-color: #1238dd;
	}
	select {
		padding-right: 36px;
	}
	textarea {
		resize: vertical;
	}
	.full-width {
		grid-column: 1 / -1;
	}
	button {
		min-height: 44px;
		border-radius: 12px;
		padding: 10px 16px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 150ms ease-out;
	}
	.primary {
		background: #1238dd;
		color: white;
	}
	.primary:hover:not(:disabled) {
		background: #0f2fb8;
	}
	.secondary {
		border: 1px solid #c8cfdd;
		color: #28344a;
		background: white;
	}
	.secondary:hover:not(:disabled) {
		background: #edf1ff;
	}
	button:disabled,
	textarea:disabled {
		cursor: not-allowed;
		background: #e9edf8;
		color: #586174;
	}
	.session-summary {
		justify-content: space-between;
		border-top: 1px solid #e5e8f0;
		padding-top: 20px;
		margin-top: 24px;
	}
	.session-summary > div {
		min-width: 0;
	}
	.session-address {
		font-weight: 600;
		overflow-wrap: anywhere;
	}
	.countdown {
		font-size: 2rem;
		font-weight: 600;
		letter-spacing: -0.025em;
		font-variant-numeric: tabular-nums;
		color: #1238dd;
	}
	.proximity {
		margin-block: 16px;
		font-size: 0.875rem;
		line-height: 1.6;
		color: #586174;
		overflow-wrap: anywhere;
	}
	.proximity button {
		margin-top: 12px;
	}
	.warning {
		background: #fff5df;
		padding: 12px 16px;
		border-radius: 12px;
		color: #754510;
	}
	.step-form {
		display: grid;
		gap: 16px;
		margin-top: 24px;
		border-top: 1px solid #e5e8f0;
		padding-top: 24px;
	}
	.step-form > h3 + p {
		margin-top: -8px;
	}
	.review-fields {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
	}
	.original-note {
		font-size: 0.875rem;
		color: #586174;
	}
	summary {
		cursor: pointer;
		padding-block: 8px;
	}
	.original-note p {
		margin-top: 8px;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.error {
		margin-top: 16px;
		font-size: 0.875rem;
		font-weight: 500;
		line-height: 1.6;
		color: #b4232d;
	}
	@media (max-width: 639px) {
		.ai-checkin {
			padding: 20px;
		}
		.setup-form,
		.review-fields {
			grid-template-columns: minmax(0, 1fr);
		}
		.actions {
			align-items: stretch;
			flex-direction: column;
		}
	}
</style>
