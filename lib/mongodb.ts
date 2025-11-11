import mongoose from 'mongoose';

// Connection string from environment variables
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

/**
 * Global type declaration for mongoose connection cache
 * This prevents TypeScript errors when accessing global.mongoose
 */
type MongooseCache = {
  conn: mongoose.Connection | null;
  promise: Promise<mongoose.Connection> | null;
};

const globalWithMongooseCache = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache;
};

let cached = globalWithMongooseCache.mongooseCache;

if (!cached) {
  cached = { conn: null, promise: null };
  globalWithMongooseCache.mongooseCache = cached;
}

/**
 * Establishes and returns a MongoDB connection using Mongoose
 * Implements connection caching to reuse existing connections
 * 
 * @returns Promise that resolves to the mongoose Connection object
 */
async function connectDB(): Promise<mongoose.Connection> {
  // Return existing connection if available
  if (cached.conn) {
    return cached.conn;
  }

  // Return existing connection promise if one is in progress
  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false, // Disable mongoose buffering to fail fast
    };

    // Create new connection promise
    cached.promise = mongoose.connect(MONGODB_URI as string, opts).then((mongooseInstance) => {
      return mongooseInstance.connection;
    });
  }

  try {
    // Await the connection and cache it
    cached.conn = await cached.promise;
  } catch (error) {
    // Reset the promise on error so next call can retry
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

export default connectDB;
