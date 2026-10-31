import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// jsdom provides real sessionStorage and localStorage: tests use them as they are and start clean.
afterEach(() => {
  cleanup()
  sessionStorage.clear()
  localStorage.clear()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
