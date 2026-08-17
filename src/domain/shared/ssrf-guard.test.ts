import { describe, it, expect, vi, beforeEach } from 'vitest'
import dns from 'dns/promises'

vi.mock('dns/promises')

import { validateUrl, isPrivateIP } from './ssrf-guard'
import { SSRFError } from './errors'

const mockDns = vi.mocked(dns)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('isPrivateIP', () => {
  it.each([
    ['127.0.0.1'],
    ['127.0.0.2'],
    ['10.0.0.1'],
    ['10.255.255.255'],
    ['172.16.0.1'],
    ['172.31.255.255'],
    ['192.168.0.1'],
    ['192.168.255.255'],
    ['169.254.0.1'],
    ['::1'],
    ['fe80::1'],
    ['fc00::1'],
    ['fd00::1'],
  ])('returns true for private IP: %s', (ip) => {
    expect(isPrivateIP(ip)).toBe(true)
  })

  it.each([
    ['8.8.8.8'],
    ['1.1.1.1'],
    ['93.184.216.34'],
  ])('returns false for public IP: %s', (ip) => {
    expect(isPrivateIP(ip)).toBe(false)
  })
})

describe('validateUrl', () => {
  it('allows valid public URL', async () => {
    mockDns.lookup = vi.fn().mockResolvedValue([{ address: '93.184.216.34', family: 4 }])
    await expect(validateUrl('https://example.com/feed.xml')).resolves.toBeUndefined()
  })

  it('blocks loopback address', async () => {
    mockDns.lookup = vi.fn().mockResolvedValue([{ address: '127.0.0.1', family: 4 }])
    await expect(validateUrl('http://127.0.0.1/feed')).rejects.toThrow(SSRFError)
  })

  it('blocks private IP', async () => {
    mockDns.lookup = vi.fn().mockResolvedValue([{ address: '192.168.1.1', family: 4 }])
    await expect(validateUrl('http://192.168.1.1/feed')).rejects.toThrow(SSRFError)
  })

  it('blocks non http/https scheme', async () => {
    await expect(validateUrl('ftp://example.com/feed')).rejects.toThrow(SSRFError)
  })

  it('blocks URL over 2048 characters', async () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(2030)
    await expect(validateUrl(longUrl)).rejects.toThrow(SSRFError)
  })

  it('blocks invalid URL format', async () => {
    await expect(validateUrl('not-a-url')).rejects.toThrow(SSRFError)
  })

  it('blocks DNS-resolved private IP from domain', async () => {
    mockDns.lookup = vi.fn().mockResolvedValue([{ address: '10.0.0.1', family: 4 }])
    await expect(validateUrl('https://internal.example.com/feed')).rejects.toThrow(SSRFError)
  })
})
