import { MongoClient, ObjectId, type Db, type Collection } from 'mongodb';
import { MONGODB_URI } from '$env/static/private';
import type { Company } from './types/company';

const uri = MONGODB_URI;

// MongoDB client with connection pooling for serverless
const client = new MongoClient(uri, {
	maxPoolSize: 10,
	minPoolSize: 1,
	maxIdleTimeMS: 30000,
	serverSelectionTimeoutMS: 10000,
	socketTimeoutMS: 45000,
});

// Connection promise for singleton pattern
let connectionPromise: Promise<MongoClient> | null = null;

/**
 * Helper to add timeout to a promise
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
	return Promise.race([
		promise,
		new Promise<never>((_, reject) => 
			setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
		)
	]);
}

/**
 * Get connected MongoDB client (lazy connection with reconnection support)
 * This handles serverless connection issues by checking topology state
 */
export async function getConnectedClient(): Promise<MongoClient> {
	// Check if client topology is closed and needs reconnection
	try {
		// Ping to verify connection is alive (with 5s timeout to prevent hanging)
		await withTimeout(
			client.db('admin').command({ ping: 1 }),
			5000,
			'MongoDB ping timeout'
		);
		return client;
	} catch (error) {
		// Connection is stale or closed, need to reconnect
		console.log('MongoDB connection stale or timed out, reconnecting...', error);
		connectionPromise = null;
	}

	if (!connectionPromise) {
		connectionPromise = withTimeout(
			client.connect(),
			10000,
			'MongoDB connection timeout'
		).then(() => {
			console.log('Connected to MongoDB');
			return client;
		}).catch((err) => {
			connectionPromise = null;
			throw err;
		});
	}

	return connectionPromise;
}

/**
 * Connect to MongoDB if not already connected
 * @deprecated Use getConnectedClient() instead for better serverless support
 */
export async function connectToMongo(): Promise<void> {
	await getConnectedClient();
}

/**
 * Get the database instance
 * @param dbName - Database name (defaults to 'jkj_database')
 */
export function getDb(dbName: string = 'jkj_database'): Db {
	return client.db(dbName);
}

/**
 * Get the companies collection
 * @param dbName - Database name (defaults to 'jkj_database')
 */
export function getCompaniesCollection(dbName: string = 'jkj_database'): Collection {
	return getDb(dbName).collection('companies');
}

/**
 * Get a company by its MongoDB document ID
 * @param documentId - The MongoDB ObjectId as a string
 */
export async function getCompanyById(documentId: string): Promise<Company | null> {
	await connectToMongo();
	const collection = getCompaniesCollection();
	
	try {
		const objectId = new ObjectId(documentId);
		const company = await collection.findOne(
			{ _id: objectId },
			{ projection: { mission_embedding: 0 } } // Exclude large embedding array
		);
		return company as Company | null;
	} catch (error) {
		console.error('Error fetching company by ID:', error);
		return null;
	}
}

/**
 * Close the MongoDB connection
 */
export async function closeMongo(): Promise<void> {
	try {
		await client.close();
		connectionPromise = null;
		console.log('Disconnected from MongoDB');
	} catch (error) {
		console.error('Error closing MongoDB connection:', error);
	}
}

// Export client for advanced usage
export { client };
