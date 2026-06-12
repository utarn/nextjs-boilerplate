import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getGoogleAuthUrl, exchangeCodeForTokens, getUserInfo } from '@/lib/google-oauth'
import { appUrl } from '@/lib/auth'

vi.mock('@/lib/auth', () => ({
  appUrl: vi.fn((path: string) => new URL(path, 'http://localhost:3000')),
}))

describe('google-oauth', () => {
  const mockRequest = {} as any

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GOOGLE_CLIENT_ID = 'test-client-id'
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
  })

  describe('getGoogleAuthUrl', () => {
    it('should generate correct URL with expected query parameters', () => {
      const url = getGoogleAuthUrl(mockRequest)
      const parsed = new URL(url)

      expect(parsed.origin + parsed.pathname).toBe(
        'https://accounts.google.com/o/oauth2/v2/auth',
      )
      expect(parsed.searchParams.get('client_id')).toBe('test-client-id')
      expect(parsed.searchParams.get('redirect_uri')).toBe(
        'http://localhost:3000/api/auth/google/callback',
      )
      expect(parsed.searchParams.get('response_type')).toBe('code')
      expect(parsed.searchParams.get('scope')).toBe('openid email profile')
      expect(parsed.searchParams.get('access_type')).toBe('offline')
      expect(parsed.searchParams.get('prompt')).toBe('consent')
    })

    it('should use appUrl helper to build redirect_uri', () => {
      getGoogleAuthUrl(mockRequest)

      expect(appUrl).toHaveBeenCalledWith(
        '/api/auth/google/callback',
        mockRequest,
      )
    })
  })

  describe('exchangeCodeForTokens', () => {
    it('should make a POST to Google token endpoint with correct body', async () => {
      const mockTokenResponse = {
        access_token: 'access-token-123',
        expires_in: 3600,
        scope: 'openid email profile',
        token_type: 'Bearer',
        id_token: 'id-token-456',
      }

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      })
      global.fetch = mockFetch as any

      const result = await exchangeCodeForTokens('auth-code-xyz', mockRequest)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe('https://oauth2.googleapis.com/token')
      expect(options.method).toBe('POST')
      expect((options.headers as Record<string, string>)['Content-Type']).toBe(
        'application/x-www-form-urlencoded',
      )

      const body = new URLSearchParams(options.body!.toString())
      expect(body.get('code')).toBe('auth-code-xyz')
      expect(body.get('client_id')).toBe('test-client-id')
      expect(body.get('client_secret')).toBe('test-client-secret')
      expect(body.get('grant_type')).toBe('authorization_code')
      expect(body.get('redirect_uri')).toBe(
        'http://localhost:3000/api/auth/google/callback',
      )

      expect(result).toEqual(mockTokenResponse)
    })

    it('should throw on non-ok response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad request',
      }) as any

      await expect(
        exchangeCodeForTokens('bad-code', mockRequest),
      ).rejects.toThrow('Failed to exchange code: Bad request')
    })
  })

  describe('getUserInfo', () => {
    it('should make a GET request with Bearer token', async () => {
      const mockUserInfo = {
        sub: 'google-sub-123',
        email: 'user@example.com',
        email_verified: true,
        name: 'Test User',
        given_name: 'Test',
        family_name: 'User',
        picture: 'https://example.com/photo.jpg',
        locale: 'en',
      }

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockUserInfo,
      })
      global.fetch = mockFetch as any

      const result = await getUserInfo('bearer-token-xyz')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        { headers: { Authorization: 'Bearer bearer-token-xyz' } },
      )
      expect(result).toEqual(mockUserInfo)
    })

    it('should throw on non-ok response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Invalid token',
      }) as any

      await expect(getUserInfo('invalid-token')).rejects.toThrow(
        'Failed to fetch user info: Invalid token',
      )
    })
  })
})
