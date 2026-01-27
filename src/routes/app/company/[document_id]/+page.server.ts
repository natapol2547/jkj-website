import type { PageServerLoad } from './$types';
import { getCompanyById } from '$lib/server/mongo';
import { error } from '@sveltejs/kit';

export const load = (async ({ params }) => {
    const { document_id } = params;
    
    const company = await getCompanyById(document_id);
    
    if (!company) {
        throw error(404, 'Company not found');
    }
    
    // Serialize the company data (convert ObjectId to string)
    return {
        company: {
            ...company,
            _id: company._id.toString()
        }
    };
}) satisfies PageServerLoad;