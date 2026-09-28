import { useEffect, useReducer } from 'react'
import { subscribeAuth } from './bloxity.js'
import { subscribe as subscribeSettings } from './settingsState.js'

// The system singletons (authState, settingsState's `settings`) are mutated
// in place, so identity never changes and useSyncExternalStore would not
// re-render. These re-render on notification and let the caller read the
// singleton directly. Ported from Age-every-click's components/hud/hooks.js.
function useNotifier(subscribe) {
  const [, bump] = useReducer((n) => n + 1, 0)
  useEffect(() => subscribe(() => bump()), [subscribe])
}

export function useAuth() {
  useNotifier(subscribeAuth)
}

export function useSettings() {
  useNotifier(subscribeSettings)
}
