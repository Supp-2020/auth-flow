import { act, renderHook } from '@testing-library/react'
import { useIdleTimeout } from './useIdleTimeout'

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

const setup = (onTimeout = vi.fn()) => ({ onTimeout, ...renderHook(() => useIdleTimeout({ idleMs: 10_000, warnMs: 5_000, onTimeout })) })

describe('useIdleTimeout', () => {
  it('shows no warning while the user is active', () => {
    const { result, onTimeout } = setup()
    act(() => { vi.advanceTimersByTime(8_000) })
    expect(result.current.secondsLeft).toBeNull()
    expect(onTimeout).not.toHaveBeenCalled()
  })

  it('warns after the idle period with a countdown, then times out', () => {
    const { result, onTimeout } = setup()
    act(() => { vi.advanceTimersByTime(11_000) })
    expect(result.current.secondsLeft).toBe(4)
    expect(onTimeout).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(5_000) })
    expect(onTimeout).toHaveBeenCalledTimes(1)
    expect(result.current.secondsLeft).toBeNull()
  })

  it('activity before the warning resets the idle clock', () => {
    const { result } = setup()
    act(() => { vi.advanceTimersByTime(9_000) })
    act(() => { window.dispatchEvent(new Event('keydown')) })
    act(() => { vi.advanceTimersByTime(9_000) })
    expect(result.current.secondsLeft).toBeNull()
  })

  it('stay() dismisses the warning and prevents the timeout', () => {
    const { result, onTimeout } = setup()
    act(() => { vi.advanceTimersByTime(12_000) })
    expect(result.current.secondsLeft).not.toBeNull()
    act(() => { window.dispatchEvent(new Event('mousemove')) })   // ignored while warning is up
    expect(result.current.secondsLeft).not.toBeNull()
    act(() => { result.current.stay() })
    expect(result.current.secondsLeft).toBeNull()
    act(() => { vi.advanceTimersByTime(9_000) })
    expect(onTimeout).not.toHaveBeenCalled()
  })
})
