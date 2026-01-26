import { MongoClient, type Db, type Collection } from 'mongodb';
import * as crypto from 'crypto';
import dotenv from 'dotenv';
import { ServerApiVersion } from 'mongodb';
dotenv.config();

const uri = `mongodb+srv://robloxplay41_db_user:${process.env.MONGO_PASSWORD}@cluster0.iv1byb5.mongodb.net/?appName=Cluster0`;

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

async function main() {
    await connectToMongo();
    console.log('Connected to MongoDB');
}

main();