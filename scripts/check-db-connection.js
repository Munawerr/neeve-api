require('dotenv').config();
const mongoose = require('mongoose');

function stripWrappingQuotes(value) {
  if (!value) return undefined;
  const trimmed = value.trim();
  const isSingle = trimmed.startsWith("'") && trimmed.endsWith("'");
  const isDouble = trimmed.startsWith('"') && trimmed.endsWith('"');
  if (isSingle || isDouble) return trimmed.slice(1, -1);
  return trimmed;
}

async function run() {
  const uri =
    stripWrappingQuotes(process.env.MONGODB_URI) ||
    stripWrappingQuotes(process.env.DB_URL) ||
    stripWrappingQuotes(process.env.MONGO_URL);

  if (!uri) {
    console.error('NO_URI: Set MONGODB_URI or DB_URL');
    process.exit(2);
  }

  const dbName = process.env.MONGO_DB_NAME || 'neeve';

  try {
    await mongoose.connect(uri, {
      dbName,
      serverSelectionTimeoutMS: 10000,
    });
    console.log('CONNECTED');
    console.log(`DB_NAME=${mongoose.connection.name}`);
  } catch (error) {
    console.error(`CONNECT_ERROR=${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
