import axios from 'axios';
import { env } from '../config/env.js';

export async function sendTelegramMessage(text: string): Promise<{ sent: boolean; reason?: string }> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    return { sent: false, reason: 'Telegram is not configured.' };
  }

  await axios.post(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    chat_id: env.TELEGRAM_CHAT_ID,
    text,
    parse_mode: 'HTML'
  });

  return { sent: true };
}
