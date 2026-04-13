const mongoose = require('mongoose');

const DEFAULT_MONGODB_URI = 'mongodb://127.0.0.1:27017/profile-branding';
const DNS_QUERY_SYSCALLS = new Set(['querySrv', 'queryTxt']);
const DNS_QUERY_ERROR_CODES = new Set(['ECONNREFUSED', 'ETIMEOUT', 'ENOTFOUND']);

const isMongoSrvDnsError = (error) => {
  if (!error) return false;
  return DNS_QUERY_SYSCALLS.has(error.syscall) && DNS_QUERY_ERROR_CODES.has(error.code);
};

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || DEFAULT_MONGODB_URI;
    let conn;

    try {
      conn = await mongoose.connect(mongoUri);
    } catch (error) {
      const directUri = process.env.MONGODB_URI_DIRECT;
      const canRetryWithDirectUri =
        Boolean(directUri) &&
        typeof mongoUri === 'string' &&
        mongoUri.startsWith('mongodb+srv://') &&
        isMongoSrvDnsError(error);

      if (!canRetryWithDirectUri) {
        throw error;
      }

      console.warn('SRV DNS lookup failed. Retrying MongoDB connection with MONGODB_URI_DIRECT...');
      conn = await mongoose.connect(directUri);
    }

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    if (!process.env.MONGODB_URI) {
      console.warn('MONGODB_URI was not set. Falling back to local MongoDB.');
    } else if (process.env.MONGODB_URI.startsWith('mongodb+srv://') && !process.env.MONGODB_URI_DIRECT) {
      console.info('Tip: Set MONGODB_URI_DIRECT as a fallback if your DNS blocks SRV/TXT lookups.');
    }
    
    // Connection event listeners
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
