import { collection, getCountFromServer } from "firebase/firestore";
import { firestore } from "./firebase.svelte";

// Reexport your entry components here
export async function getCompanyCount(projectId: string): Promise<number> {
    if (!firestore) return 0;
    const companiesCollection = collection(firestore, `projects/${projectId}/companies`);
    const snapshot = await getCountFromServer(companiesCollection);
    return snapshot.data().count;
}