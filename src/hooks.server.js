/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	event.locals.user = event.cookies.get('sessionid') ? { name: 'User' } : null;
	return resolve(event);
}