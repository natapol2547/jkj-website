import { MongoClient, ObjectId, type Db, type Collection } from 'mongodb';
import { MONGODB_URI } from '$env/static/private';
import type { Company } from './types/company';

const uri = MONGODB_URI;

// MongoDB client with connection pooling
const client = new MongoClient(uri);

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
	if (isConnected) {
		await client.close();
		isConnected = false;
		console.log('Disconnected from MongoDB');
	}
}

// Export client for advanced usage
export { client };
