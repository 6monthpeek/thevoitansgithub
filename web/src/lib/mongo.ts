import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

const options = {};

let client;
let clientPromise: Promise<MongoClient | null>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = globalThis as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient | null>
  }

  if (!globalWithMongo._mongoClientPromise) {
    if (uri) {
      client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect();
    } else {
      // Mock promise for development without MongoDB
      globalWithMongo._mongoClientPromise = Promise.resolve(null);
    }
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  if (uri) {
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  } else {
    // Mock promise for production without MongoDB
    clientPromise = Promise.resolve(null);
  }
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;
