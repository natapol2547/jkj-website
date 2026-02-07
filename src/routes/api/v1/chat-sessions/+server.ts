import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { adminDB } from '$lib/server/admin';
import { deleteCheckpointData } from '$lib/server/mongo';

/**
 * DELETE /api/v1/chat-sessions?sessionId=xxx
 * 
 * Delete a chat session from Firestore and its checkpoint data from MongoDB.
 */
export const DELETE: RequestHandler = async ({ url, locals }) => {
	if (!locals.userID) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	const sessionId = url.searchParams.get('sessionId');

	if (!sessionId) {
		return json(
			{ success: false, error: 'Session ID is required' },
			{ status: 400 }
		);
	}

	try {
		// Verify the session exists and belongs to the user
		const sessionRef = adminDB.collection('chat_sessions').doc(sessionId);
		const sessionDoc = await sessionRef.get();

		if (!sessionDoc.exists) {
			return json(
				{ success: false, error: 'Session not found' },
				{ status: 404 }
			);
		}

		const sessionData = sessionDoc.data();
		if (sessionData?.userId !== locals.userID) {
			return json(
				{ success: false, error: 'Forbidden' },
				{ status: 403 }
			);
		}

		// Delete from Firestore
		await sessionRef.delete();

		// Delete checkpoint data from MongoDB (conversation_history database)
		try {
			await deleteCheckpointData('conversation_history', sessionId);
		} catch (mongoErr) {
			console.warn(`[ChatSessions] Failed to delete MongoDB checkpoint data for session ${sessionId}:`, mongoErr);
			// Don't fail the request if MongoDB cleanup fails - Firestore doc is already deleted
		}

		return json({
			success: true,
			data: { sessionId }
		});
	} catch (error) {
		console.error('Delete chat session error:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Internal server error'
			},
			{ status: 500 }
		);
	}
};
