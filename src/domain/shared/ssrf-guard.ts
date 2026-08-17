import dns from 'dns/promises'
import { SSRFError } from './errors'

const PRIVATE_IP_RANGES = [
  // IPv4 loopback
  /^127\./,
  // RFC1918 Class A
  /^10\./,
  // RFC1918 Class B
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  // RFC1918 Class C
  /^192\.168\./,
  // Link-local
  /^169\.254\./,
  // CGNAT
  /^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\./,
  // IPv6 loopback
  /^::1$/,
  // IPv6 link-local
  /^fe80:/i,
  // IPv6 unique local
  /^fc00:/i,
  /^fd/i,
]

export function isPrivateIP(ip: string): boolean {
  return PRIVATE_IP_RANGES.some((range) => range.test(ip))
}

export async function validateUrl(url: string): Promise<void> {
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    throw new SSRFError('Invalid URL format')
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new SSRFError('URL must start with http:// or https://')
  }

  if (url.length > 2048) {
    throw new SSRFError('URL must be 2048 characters or less')
  }

  try {
    const addresses = await dns.lookup(parsedUrl.hostname, { all: true })
    for (const addr of addresses) {
      if (isPrivateIP(addr.address)) {
        throw new SSRFError('URL is not allowed')
      }
    }
  } catch (err) {
    if (err instanceof SSRFError) throw err
    throw new SSRFError('URL is not allowed')
  }
}
