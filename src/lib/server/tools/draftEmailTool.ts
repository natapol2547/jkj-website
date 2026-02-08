import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { adminDB } from '../admin';
import { FieldValue } from 'firebase-admin/firestore';

const draftEmailSchema = z.object({
	subject: z.string().min(1).describe('Email subject line'),
	body: z.string().min(1).describe('Email body content (plain text or simple HTML)'),
	to: z.string().email().optional().describe('Recipient email address if known')
});

/**
 * Create a draft_email tool bound to a specific project and company.
 * Writes drafts to Firestore at projects/{projectId}/companies/{companyId}/emails/{emailId}
 */
export function createDraftEmailTool(projectId: string, companyId: string) {
	return tool(
		async (input) => {
			try {
				const { subject, body, to } = input;
				const emailsRef = adminDB
					.collection('projects')
					.doc(projectId)
					.collection('companies')
					.doc(companyId)
					.collection('emails');

				const docRef = emailsRef.doc();
				await docRef.set({
					subject,
					body,
					...(to && { to }),
					status: 'draft',
					createdAt: FieldValue.serverTimestamp()
				});

				return JSON.stringify({
					success: true,
					emailId: docRef.id,
					message: 'Email draft saved. The user can view and send it from the company page.'
				});
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unknown error';
				console.error('[draft_email]', message);
				return JSON.stringify({
					success: false,
					error: message
				});
			}
		},
		{
			name: 'draft_email',
			description: `Save a draft email for this company. Use for cold outreach, partnership proposals, or follow-ups. The draft is stored and the user can send it via Gmail from the UI.`,
			schema: draftEmailSchema
		}
	);
}

export type DraftEmailToolInput = z.infer<typeof draftEmailSchema>;
