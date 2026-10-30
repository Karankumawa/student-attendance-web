const mongoose = require('mongoose');
const dns = require('dns');

// Use reliable public DNS to prevent Windows local router "querySrv ECONNREFUSED" errors
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
  // fallback if environment restricts custom DNS
}

let memoryServer = null;

// Normalize MongoDB URI to safely URL-encode password characters like '@', '#', '$'
const normalizeMongoUri = (rawUri) => {
  if (!rawUri) return '';
  const match = rawUri.match(/^(mongodb(?:\+srv)?:\/\/)([^:]+):(.*)@([^/?#]+)(.*)$/);
  if (!match) return rawUri;

  const [, prefix, user, rawPass, host, rest] = match;
  // If pass already contains % (already encoded), don't double encode
  const cleanPass = rawPass.includes('%') ? rawPass : encodeURIComponent(rawPass);
  return `${prefix}${encodeURIComponent(decodeURIComponent(user))}:${cleanPass}@${host}${rest}`;
};

// Mask credentials in connection URI for safe console logging
const maskUri = (uri) => {
  if (!uri) return '';
  return uri.replace(/:([^@/]+)@/, ':••••••••@');
};

const connectDB = async () => {
  const rawUri = process.env.MONGO_URI || 'mongodb://localhost:27017/college_portal';
  const isPlaceholder = rawUri.includes('<db_password>') || rawUri.includes('<password>');

  if (isPlaceholder) {
    console.warn(
      '[Database] Notice: MONGO_URI contains placeholder "<db_password>". Please replace it with your actual MongoDB Atlas user password in backend/.env.'
    );
  }

  const primaryUri = normalizeMongoUri(rawUri);

  try {
    console.log(`[Database] Attempting connection to MongoDB at: ${maskUri(primaryUri)}`);
    
    if (isPlaceholder) {
      throw new Error('Database password placeholder (<db_password>) detected in MONGO_URI.');
    }

    await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
    });
    console.log(`[Database] Successfully connected to Live MongoDB Atlas at: ${maskUri(primaryUri)}`);
  } catch (primaryErr) {
    console.warn(`[Database] Warning: Could not connect to primary MongoDB (${primaryErr.message}).`);
    
    if (primaryErr.message.includes('authentication failed') || primaryErr.message.includes('bad auth')) {
      console.warn('⚠️ [MongoDB Atlas Auth]: The username or password in .env was rejected by MongoDB Atlas.');
      console.warn('⚠️ Please check: cloud.mongodb.com -> Database Access -> kumawatkaran235_db_user.');
    }

    // Attempt fallback to mongodb-memory-server
    try {
      console.log('[Database] Starting in-memory fallback MongoDB instance so web application runs seamlessly...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create({
        instance: {
          dbName: 'college_portal',
        },
      });
      const memoryUri = memoryServer.getUri();
      await mongoose.connect(memoryUri);
      console.log(`[Database] In-memory MongoDB successfully connected at: ${memoryUri}`);
    } catch (fallbackErr) {
      console.error('[Database] Fatal Error connecting to MongoDB:', fallbackErr.message);
      process.exit(1);
    }
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (memoryServer) {
      await memoryServer.stop();
    }
  } catch (err) {
    console.error('Error disconnecting database:', err);
  }
};

module.exports = { connectDB, disconnectDB };
