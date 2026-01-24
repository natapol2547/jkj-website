import type { RequestHandler } from './$types.js';
import { json } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals }) => {
    if (!locals.userID) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    return new Response();
};