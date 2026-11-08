import mongoose from 'mongoose';
import { env } from '../config/env';
import { databaseLog } from '../logger/logger';

export const connectMongo = async (): Promise<void> => {
  await mongoose.connect(env.MONGO_URI);
  databaseLog('MongoDB connected');
};

export const disconnectMongo = async (): Promise<void> => {
  await mongoose.disconnect();
};

export const isDuplicateKeyError = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
