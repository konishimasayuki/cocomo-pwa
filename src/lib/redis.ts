import { Redis } from '@upstash/redis';

// Reads UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN from env automatically
export const redis = Redis.fromEnv();

export const KEYS = {
  settings: 'cocomo:settings',
  slot: (slot: 'A' | 'B') => `cocomo:slot:${slot}`,
  history: 'cocomo:history',
  funds: 'cocomo:funds'
};
