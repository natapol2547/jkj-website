import { MongoClient, type Db, type Collection } from 'mongodb';
import { MONGODB_URI } from '$env/static/private';

const uri = MONGODB_URI;

// MongoDB client with connection pooling
const client = new MongoClient(uri, {
	maxPoolSize: 10,
	minPoolSize: 1,
	maxIdleTimeMS: 30000,
	connectTimeoutMS: 10000,
	serverSelectionTimeoutMS: 10000
});

// Connection state
let isConnected = false;

/**
 * Connect to MongoDB if not already connected
 */
export async function connectToMongo(): Promise<void> {
	if (!isConnected) {
		await client.connect();
		isConnected = true;
		console.log('Connected to MongoDB');
	}
}

/**
 * Get the database instance
 * @param dbName - Database name (defaults to 'julist')
 */
export function getDb(dbName: string = 'jkj_database'): Db {
	return client.db(dbName);
}

/**
 * Get the companies collection
 * @param dbName - Database name (defaults to 'julist')
 */
export function getCompaniesCollection(dbName: string = 'jkj_database'): Collection {
	return getDb(dbName).collection('companies');
}

/**
 * Close the MongoDB connection
 */
export async function closeMongo(): Promise<void> {
	if (isConnected) {
		await client.close();
		isConnected = false;
		console.log('Disconnected from MongoDB');
	}
}

// Export client for advanced usage
export { client };
