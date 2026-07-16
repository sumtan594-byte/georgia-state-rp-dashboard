// Node's global fetch has no default timeout, so a hung upstream (e.g. Discord)
// would block the request indefinitely. This wraps fetch with an AbortSignal so
// every external call fails fast instead of stalling the auth hot path.
export function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
}
