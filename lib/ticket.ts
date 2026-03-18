import crypto from 'crypto'
import QRCode from 'qrcode'

const SITE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

/** Generate a secure, unique ticket token */
export function generateTicketToken(): string {
  return crypto.randomBytes(24).toString('hex') // 48-char hex string
}

/** Generate a QR code as a data URL (base64 PNG) for a ticket token */
export async function generateTicketQR(ticketToken: string): Promise<string> {
  const verifyUrl = `${SITE_URL}/api/ticket/verify?token=${ticketToken}`
  return QRCode.toDataURL(verifyUrl, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' },
    errorCorrectionLevel: 'M',
  })
}
