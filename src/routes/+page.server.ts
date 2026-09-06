import type { PageServerLoad, Actions } from './$types';
export const load: PageServerLoad = async ({ locals }) => ({
	user: locals.user
});
export const actions: Actions = {
	login: async ({ cookies, request }) => {
		await request.formData();
		cookies.set('sessionid', '1', { path: '/' });
		return { success: true };
	},
	logout: async ({ cookies }) => {
		cookies.delete('sessionid', { path: '/' });
	}
};
