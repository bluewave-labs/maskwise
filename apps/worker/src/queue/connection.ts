import { ConnectionOptions } from 'bullmq';
import { Config } from '../config/index.js';

export const redisConnection: ConnectionOptions = {
  host: Config.redis.host,
  port: Config.redis.port,
  password: Config.redis.password,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  lazyConnect: true,
  maxRetriesPerRequest: 3,
};