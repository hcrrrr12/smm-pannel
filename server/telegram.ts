import { getOne } from './db.js';

interface TelegramPayload {
  message: string;
}

export async function sendTelegramNotification(text: string): Promise<{ success: boolean; error?: string }> {
  try {
    const tokenSetting = getOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['telegram_bot_token']);
    const chatSetting = getOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['telegram_chat_id']);

    const botToken = process.env.TELEGRAM_BOT_TOKEN || tokenSetting?.value;
    const chatId = process.env.TELEGRAM_CHAT_ID || chatSetting?.value;

    console.log(`[Telegram Alert Simulated/Queued]: ${text.replace(/\n/g, ' ')}`);

    if (!botToken || !chatId) {
      return { success: true, error: 'Telegram credentials not configured in settings, logged to server console.' };
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn('Telegram API response error:', errText);
      return { success: false, error: errText };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error sending telegram alert:', err.message);
    return { success: false, error: err.message };
  }
}

export function notifyNewOrder(order: any, user: any, service: any) {
  const msg = `🚀 <b>New SMM Order Placed!</b>\n` +
    `📦 <b>Order ID:</b> #${order.id} (${order.invoice_number})\n` +
    `👤 <b>Customer:</b> ${user.name} (${user.email})\n` +
    `⚡ <b>Service:</b> ${service.name}\n` +
    `📊 <b>Quantity:</b> ${order.quantity.toLocaleString()}\n` +
    `💰 <b>Amount:</b> ₹${order.charge.toFixed(2)}\n` +
    `🔗 <b>Link:</b> ${order.link}\n` +
    `🕒 <b>Time:</b> ${new Date().toLocaleString()}`;
  sendTelegramNotification(msg);
}

export function notifyOrderStatusChange(order: any, oldStatus: string, newStatus: string) {
  const statusEmoji: Record<string, string> = {
    pending: '⏳',
    processing: '⚙️',
    in_progress: '⚡',
    completed: '✅',
    cancelled: '❌',
    refunded: '💸'
  };

  const emoji = statusEmoji[newStatus] || '🔔';
  const msg = `${emoji} <b>Order Status Updated</b>\n` +
    `📦 <b>Order:</b> #${order.id}\n` +
    `🔄 <b>Status:</b> ${oldStatus.toUpperCase()} ➡️ <b>${newStatus.toUpperCase()}</b>\n` +
    `💰 <b>Amount:</b> ₹${order.charge.toFixed(2)}`;
  sendTelegramNotification(msg);
}

export function notifyDeposit(tx: any, user: any) {
  const msg = `💳 <b>New Wallet Deposit!</b>\n` +
    `👤 <b>User:</b> ${user.name} (${user.email})\n` +
    `💵 <b>Amount:</b> ₹${tx.amount.toFixed(2)}\n` +
    `🏷️ <b>Method:</b> ${tx.payment_method.toUpperCase()}\n` +
    `🆔 <b>UTR:</b> ${tx.utr_number || 'N/A'}\n` +
    `✅ <b>Status:</b> ${tx.status.toUpperCase()}`;
  sendTelegramNotification(msg);
}
