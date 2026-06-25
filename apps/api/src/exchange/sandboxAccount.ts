import crypto from 'node:crypto';
import axios from 'axios';
import { env } from '../config/env.js';

const safeBaseUrl = 'https://testnet.binancefuture.com';

function requireSandboxCredentials() {
  if (!env.BINANCE_API_KEY || !env.BINANCE_API_SECRET) {
    throw new Error('Sandbox API credentials are missing. Add them to .env only.');
  }
}

function sign(query: string): string {
  return crypto.createHmac('sha256', env.BINANCE_API_SECRET).update(query).digest('hex');
}

export async function getSandboxAccountInfo() {
  requireSandboxCredentials();

  const timestamp = Date.now();
  const query = `timestamp=${timestamp}`;
  const signature = sign(query);

  const response = await axios.get(`${safeBaseUrl}/fapi/v2/account?${query}&signature=${signature}`, {
    headers: {
      'X-MBX-APIKEY': env.BINANCE_API_KEY
    },
    timeout: 10_000
  });

  return response.data;
}
