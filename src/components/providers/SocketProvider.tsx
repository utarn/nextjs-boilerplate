'use client'

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  useState,
  type ReactNode,
} from 'react'
import { io, type Socket } from 'socket.io-client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting'

interface SocketContextValue {
  /** The Socket.IO client instance (null before first connect). */
  socket: Socket | null
  /** Current connection status. */
  status: ConnectionStatus
}

// ---------------------------------------------------------------------------
// Default socket options
// ---------------------------------------------------------------------------

const SOCKET_OPTIONS = {
  // Use only websocket transport for lower latency
  transports: ['websocket'] as ('websocket' | 'polling')[],
  // Socket.IO client uses exponential backoff by default (starts at 1s, doubles
  // up to a max). These settings ensure fast reconnect after brief drops.
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  status: 'disconnected',
})

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface SocketProviderProps {
  children: ReactNode
}

/**
 * Manages a single Socket.IO client connection for the authenticated app.
 *
 * - Connects to the same origin (cookies are sent automatically).
 * - Stores the socket instance in React context via state so that children
 *   that consume the context re-render when the socket becomes available.
 * - Tracks connection status (connected / disconnected / reconnecting) so
 *   consumers can react to state changes.
 * - Disconnects on unmount.
 * - Persists across client-side soft navigations because it wraps the
 *   `(app)` layout, not individual pages.
 */
export function SocketProvider({ children }: SocketProviderProps) {
  const [socketState, setSocketState] = useState<Socket | null>(null)
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')

  useEffect(() => {
    const socket = io(SOCKET_OPTIONS)

    setSocketState(socket)

    socket.on('connect', () => {
      setStatus('connected')
    })

    socket.on('disconnect', () => {
      setStatus('disconnected')
    })

    socket.on('reconnect_attempt', () => {
      setStatus('reconnecting')
    })

    return () => {
      socket.disconnect()
      setSocketState(null)
    }
  }, [])

  return (
    <SocketContext.Provider value={{ socket: socketState, status }}>
      {children}
    </SocketContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hook: useSocketEvent
// ---------------------------------------------------------------------------

/**
 * Register a listener for a Socket.IO event managed by the nearest
 * `SocketProvider`. The listener is automatically registered on mount and
 * cleaned up on unmount or when the callback changes.
 *
 * Multiple components can call `useSocketEvent` for the same event — each
 * registers its own listener independently on the shared socket.
 *
 * @example
 * ```ts
 * useSocketEvent<DashboardStatsPayload>('dashboard:stats', (data) => {
 *   setStats(data)
 * })
 * ```
 */
export function useSocketEvent<T = unknown>(
  eventName: string,
  callback: (data: T) => void,
): void {
  const { socket } = useContext(SocketContext)
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  // Use a stable wrapper so the socket listener doesn't need to be
  // re-registered every time the consumer's callback reference changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableCallback = useCallback((data: T) => {
    callbackRef.current(data)
  }, [])

  useEffect(() => {
    if (!socket) return

    socket.on(eventName, stableCallback as (...args: unknown[]) => void)

    return () => {
      socket.off(eventName, stableCallback as (...args: unknown[]) => void)
    }
  }, [socket, eventName, stableCallback])
}

// ---------------------------------------------------------------------------
// Hook: useSocketConnected
// ---------------------------------------------------------------------------

/**
 * Returns whether the socket managed by the nearest `SocketProvider` is
 * currently connected.
 */
export function useSocketConnected(): boolean {
  const { status } = useContext(SocketContext)
  return status === 'connected'
}

// ---------------------------------------------------------------------------
// Hook: useConnectionStatus
// ---------------------------------------------------------------------------

/**
 * Returns the current connection status of the socket managed by the nearest
 * `SocketProvider`.
 */
export function useConnectionStatus(): ConnectionStatus {
  const { status } = useContext(SocketContext)
  return status
}

// ---------------------------------------------------------------------------
// Hook: useSocket (convenience)
// ---------------------------------------------------------------------------

/**
 * Returns the raw Socket.IO client instance managed by the nearest
 * `SocketProvider`. Returns null before the socket is initialised.
 * Use this for emitting custom events (e.g. `subscribe:room`).
 */
export function useSocket(): Socket | null {
  const { socket } = useContext(SocketContext)
  return socket
}

// ---------------------------------------------------------------------------
// Connection status indicator component
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  connected: 'Connected',
  disconnected: 'Disconnected',
  reconnecting: 'Reconnecting...',
}

const STATUS_DOT_STYLES: Record<ConnectionStatus, string> = {
  connected: 'bg-green-500',
  disconnected: 'bg-red-500',
  reconnecting: 'bg-yellow-500',
}

const STATUS_TEXT_STYLES: Record<ConnectionStatus, string> = {
  connected: 'text-green-600 dark:text-green-400',
  disconnected: 'text-red-600 dark:text-red-400',
  reconnecting: 'text-yellow-600 dark:text-yellow-400',
}

/**
 * A small connection status indicator that shows a coloured dot and label.
 * Renders nothing when connected (hidden by default) — only visible when
 * the socket is disconnected or reconnecting.
 *
 * Pass `alwaysShow` to always render the indicator regardless of status.
 */
export function ConnectionStatusIndicator({
  alwaysShow = false,
}: {
  alwaysShow?: boolean
}) {
  const status = useConnectionStatus()

  if (!alwaysShow && status === 'connected') return null

  return (
    <div className="flex items-center gap-1.5 text-xs" title={STATUS_LABELS[status]}>
      <span
        className={`inline-block size-2 rounded-full animate-pulse ${STATUS_DOT_STYLES[status]}`}
      />
      <span className={STATUS_TEXT_STYLES[status]}>
        {STATUS_LABELS[status]}
      </span>
    </div>
  )
}
