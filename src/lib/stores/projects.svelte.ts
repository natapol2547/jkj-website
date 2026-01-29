import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { collectionStore, docStore } from './firestore.svelte';
import type { Project } from '$lib/types/project';

/**
 * Creates a reactive store for all projects belonging to a user
 * @param firestore Firestore instance
 * @param userId User ID to filter projects
 * @returns Reactive collection store with real-time updates
 */
export function userProjectsStore(firestore: Firestore, userId: string) {
  if (!userId) {
    return {
      get current() {
        return [];
      },
      ref: null,
      destroy() {},
    };
  }

  const q = query(
    collection(firestore, 'projects'),
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc')
  );

  return collectionStore<Project>(firestore, q as any);
}

/**
 * Creates a reactive store for a single project
 * @param firestore Firestore instance
 * @param projectId Project ID
 * @returns Reactive document store with real-time updates
 */
export function projectStore(firestore: Firestore, projectId: string) {
  if (!projectId) {
    return {
      get current() {
        return null;
      },
      ref: null,
      id: '',
      destroy() {},
    };
  }

  const docRef = doc(firestore, 'projects', projectId);
  return docStore<Project>(firestore, docRef as any);
}
