import QRCode from 'qrcode';
import { getOne } from './db.js';

export interface UpiQrDetails {
  upiId: string;
  payeeName: string;
  amount: number;
  currency: string;
  note: string;
  upiUri: string;
  qrDataUrl: string;
}

export async function generateUpiQr(amount: number, note: string = 'SMM Panel Payment'): Promise<UpiQrDetails> {
  const upiIdSetting = getOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['upi_id']);
  const payeeSetting = getOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['upi_payee_name']);

  const upiId = process.env.UPI_ID || upiIdSetting?.value || '8918145816@fam';
  const payeeName = process.env.UPI_PAYEE_NAME || payeeSetting?.value || 'Kritan Chettri';
  const currency = 'INR';

  // Build standard NPCI compliant UPI deep-link URI
  const encodedPayee = encodeURIComponent(payeeName);
  const encodedNote = encodeURIComponent(note);
  const formattedAmount = amount.toFixed(2);

  const upiUri = `upi://pay?pa=${upiId}&pn=${encodedPayee}&am=${formattedAmount}&cu=${currency}&tn=${encodedNote}`;

  // Generate crisp QR code data URL
  const qrDataUrl = await QRCode.toDataURL(upiUri, {
    errorCorrectionLevel: 'H',
    margin: 2,
    scale: 8,
    color: {
      dark: '#0f172a',
      light: '#ffffff'
    }
  });

  return {
    upiId,
    payeeName,
    amount,
    currency,
    note,
    upiUri,
    qrDataUrl
  };
}
