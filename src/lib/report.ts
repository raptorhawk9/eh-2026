export type HazardReport = {
	address: string;
	hazard: string;
	platform: string;
	details: string;
	checkinAt: string;
	loggedAt: string;
};

export const platforms = ['Uber', 'DoorDash', 'Lyft', 'Grubhub', 'Instacart', 'Other'];

export function formatReportDate(value: string): string {
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short'
	}).format(new Date(value));
}