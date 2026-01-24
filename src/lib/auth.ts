import { 
	signInWithPopup, 
	GoogleAuthProvider, 
	type Auth,
	type User 
} from "firebase/auth";
import type { AuthError } from "firebase/auth";

/**
 * Sign in with Google using a popup
 * @param auth Firebase Auth instance
 * @returns Promise that resolves with the user credential
 */
export async function signInWithGoogle(auth: Auth): Promise<User> {
	try {
		const provider = new GoogleAuthProvider();
		// Add additional scopes if needed
		provider.addScope('profile');
		provider.addScope('email');
		
		// Set custom parameters
		provider.setCustomParameters({
			prompt: 'select_account'
		});

		const result = await signInWithPopup(auth, provider);
		return result.user;
	} catch (error) {
		const authError = error as AuthError;
		
		// Handle specific error cases
		if (authError.code === 'auth/popup-closed-by-user') {
			throw new Error('Sign-in popup was closed. Please try again.');
		} else if (authError.code === 'auth/popup-blocked') {
			throw new Error('Popup was blocked by your browser. Please allow popups for this site.');
		} else if (authError.code === 'auth/network-request-failed') {
			throw new Error('Network error. Please check your connection and try again.');
		} else {
			throw new Error(authError.message || 'Failed to sign in with Google. Please try again.');
		}
	}
}

/**
 * Sign out the current user
 * @param auth Firebase Auth instance
 */
export async function signOut(auth: Auth): Promise<void> {
	try {
		await auth.signOut();
	} catch (error) {
		const authError = error as AuthError;
		throw new Error(authError.message || 'Failed to sign out. Please try again.');
	}
}
