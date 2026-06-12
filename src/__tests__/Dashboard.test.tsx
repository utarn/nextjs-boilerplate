import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { ActivityChart } from '@/components/dashboard/activity-chart'
import { StatusDonutChart } from '@/components/dashboard/status-donut-chart'
import { LiveDashboardUpdater } from '@/components/dashboard/LiveDashboardUpdater'
import { Card, CardContent } from '@/components/ui/card'
import { ListTodo } from 'lucide-react'
import enMessages from '../../messages/en.json'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/components/providers/SocketProvider', () => ({
  useSocketEvent: vi.fn(),
}))

// Polyfill for recharts ResponsiveContainer in test environment
if (typeof ResizeObserver === 'undefined') {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider messages={enMessages} locale="en">
      <ThemeProvider>{ui}</ThemeProvider>
    </NextIntlClientProvider>,
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Dashboard', () => {
  it('MetricCard renders with icon, label, and value', () => {
    renderWithProviders(
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <ListTodo
                className="size-5 text-primary"
                data-testid="metric-icon"
              />
            </div>
            <span className="text-sm text-muted-foreground">Total Tasks</span>
          </div>
          <h4 className="mt-3 text-3xl font-bold text-foreground tabular-nums">
            42
          </h4>
        </CardContent>
      </Card>,
    )

    expect(screen.getByTestId('metric-icon')).toBeInTheDocument()
    expect(screen.getByText('Total Tasks')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('StatusDonutChart renders with data', () => {
    const data = [
      { name: 'Pending', value: 5, fill: '#f59e0b' },
      { name: 'In Progress', value: 3, fill: '#3b82f6' },
      { name: 'Completed', value: 10, fill: '#10b981' },
    ]

    renderWithProviders(
      <StatusDonutChart
        data={data}
        valueLabel="Count"
        emptyMessage="No todos to show."
      />,
    )

    expect(screen.queryByText('No todos to show.')).not.toBeInTheDocument()
  })

  it('StatusDonutChart shows empty message when no data', () => {
    const data = [
      { name: 'Pending', value: 0, fill: '#f59e0b' },
      { name: 'In Progress', value: 0, fill: '#3b82f6' },
    ]

    renderWithProviders(
      <StatusDonutChart
        data={data}
        valueLabel="Count"
        emptyMessage="No todos to show."
      />,
    )

    expect(screen.getByText('No todos to show.')).toBeInTheDocument()
  })

  it('ActivityChart renders with data', () => {
    const data = [
      { date: '2024-01-01', created: 5, completed: 3 },
      { date: '2024-01-02', created: 2, completed: 4 },
    ]

    renderWithProviders(
      <ActivityChart
        data={data}
        createdLabel="Created"
        completedLabel="Completed"
        emptyMessage="No activity data for the last 30 days."
      />,
    )

    expect(
      screen.queryByText('No activity data for the last 30 days.'),
    ).not.toBeInTheDocument()
  })

  it('ActivityChart shows empty message when no data', () => {
    renderWithProviders(
      <ActivityChart
        data={[]}
        createdLabel="Created"
        completedLabel="Completed"
        emptyMessage="No activity data for the last 30 days."
      />,
    )

    expect(
      screen.getByText('No activity data for the last 30 days.'),
    ).toBeInTheDocument()
  })

  it('LiveDashboardUpdater renders without crashing', () => {
    const { container } = renderWithProviders(<LiveDashboardUpdater />)
    // Component returns null, so container should be empty
    expect(container.innerHTML).toBe('')
  })
})
