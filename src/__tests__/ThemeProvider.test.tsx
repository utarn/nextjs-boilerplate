import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ThemeProvider, useTheme } from '@/components/providers/ThemeProvider'

// ---------------------------------------------------------------------------
// Helper: render within ThemeProvider
// ---------------------------------------------------------------------------

function renderWithTheme(
  ui: React.ReactElement,
  options?: { defaultTheme?: string; defaultColorMode?: string },
) {
  return render(
    <ThemeProvider
      defaultTheme={options?.defaultTheme}
      defaultColorMode={options?.defaultColorMode}
    >
      {ui}
    </ThemeProvider>,
  )
}

// ---------------------------------------------------------------------------
// Test consumer that reads context and exposes controls
// ---------------------------------------------------------------------------

function TestConsumer() {
  const { theme, colorMode, isDark, setTheme, setColorMode } = useTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="colorMode">{colorMode}</span>
      <span data-testid="isDark">{String(isDark)}</span>
      <button data-testid="set-theme" onClick={() => setTheme('catppuccin')}>
        Set Theme
      </button>
      <button
        data-testid="set-theme-persist"
        onClick={() => setTheme('catppuccin', true)}
      >
        Set Theme Persist
      </button>
      <button
        data-testid="set-color-mode"
        onClick={() => setColorMode('dark')}
      >
        Set Color Mode
      </button>
      <button
        data-testid="set-color-mode-persist"
        onClick={() => setColorMode('light', true)}
      >
        Set Color Mode Persist
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ThemeProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.classList.remove('dark')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('provides default theme, colorMode, isDark values', () => {
    renderWithTheme(<TestConsumer />)

    expect(screen.getByTestId('theme').textContent).toBe('modern-minimal')
    expect(screen.getByTestId('colorMode').textContent).toBe('system')
  })

  it('setTheme updates state and localStorage', () => {
    renderWithTheme(<TestConsumer />)

    fireEvent.click(screen.getByTestId('set-theme'))

    expect(screen.getByTestId('theme').textContent).toBe('catppuccin')
    expect(localStorage.getItem('theme')).toBe('catppuccin')
  })

  it('setColorMode updates state and localStorage', () => {
    renderWithTheme(<TestConsumer />)

    fireEvent.click(screen.getByTestId('set-color-mode'))

    expect(screen.getByTestId('colorMode').textContent).toBe('dark')
    expect(localStorage.getItem('colorMode')).toBe('dark')
  })

  it('setTheme with persist=true calls fetch to PATCH preferences', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true })

    renderWithTheme(<TestConsumer />)

    fireEvent.click(screen.getByTestId('set-theme-persist'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: 'catppuccin' }),
      })
    })
  })

  it('setColorMode with persist=true calls fetch to PATCH preferences', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true })

    renderWithTheme(<TestConsumer />)

    fireEvent.click(screen.getByTestId('set-color-mode-persist'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ colorMode: 'light' }),
      })
    })
  })

  it('applies data-theme and dark class to documentElement', () => {
    renderWithTheme(<TestConsumer />)

    // Default theme applied
    expect(document.documentElement.getAttribute('data-theme')).toBe(
      'modern-minimal',
    )

    // Change theme
    fireEvent.click(screen.getByTestId('set-theme'))

    expect(document.documentElement.getAttribute('data-theme')).toBe(
      'catppuccin',
    )

    // Change to dark colour mode
    fireEvent.click(screen.getByTestId('set-color-mode'))

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('useTheme throws without ThemeProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestConsumer />)
    }).toThrow('useTheme must be used within a <ThemeProvider>')

    consoleSpy.mockRestore()
  })

  it('server-passed defaultTheme/defaultColorMode are used as initial values', () => {
    renderWithTheme(<TestConsumer />, {
      defaultTheme: 'catppuccin',
      defaultColorMode: 'dark',
    })

    expect(screen.getByTestId('theme').textContent).toBe('catppuccin')
    expect(screen.getByTestId('colorMode').textContent).toBe('dark')
    expect(screen.getByTestId('isDark').textContent).toBe('true')
  })

  it('system color mode resolves isDark correctly', () => {
    // Mock matchMedia to report dark mode preference
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as (query: string) => MediaQueryList

    renderWithTheme(<TestConsumer />, { defaultColorMode: 'system' })

    expect(screen.getByTestId('isDark').textContent).toBe('true')
  })
})
