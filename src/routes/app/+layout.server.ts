import type { LayoutServerLoad } from './$types';

export const load = (async ( { locals} ) => {
    return {
        userID: locals.userID
    };
}) satisfies LayoutServerLoad;