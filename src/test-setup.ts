import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  notFound: vi.fn(),
  redirect: vi.fn(),
}))

// Mock process.env for tests
process.env = {
  ...process.env,
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  ENCRYPTION_SECRET: 'test-secret-key-1234567890abcdef',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  REDIS_URL: 'redis://localhost:6379',
}
