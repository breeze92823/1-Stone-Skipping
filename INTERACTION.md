# Hold-E Interaction

A proximity prompt: "Press E to <label>", a keycap ringed by a progress ring that fills while E is held for 2 s, then an action fires once. Optionally a green/red result popup follows. Currently used by the Skill Stones yard (`systems/skillStoneZones.js`).

## Use it somewhere new (the only thing you write)

```js
import { registerInteractZone } from './interact.js'
import { showActionResult } from './actionResult.js'   // optional popup
import { player } from './playerState.js'

registerInteractZone({
  id: 'chest:claim',                       // unique; also the hold timer's owner key
  isNear: () => Math.hypot(player.position.x - 10, player.position.z - 4) <= 2,
  label: () => (alreadyClaimed() ? null : 'Claim Chest'),   // string or () => string|null
  onConfirm: () => {
    grantReward()
    showActionResult('Chest Claimed!', true)   // false = red failure popup
  },
})
```

Put it in a `systems/` file (no React imports) and import that file once for its side effect. `components/GameLoop.jsx` does this for the stones: `import '../systems/skillStoneZones.js'`. Nothing else to wire: the prompt, ring, popup and key handling are already mounted.

| Field | Meaning |
| --- | --- |
| `id` | Unique string. Re-registering the same id replaces the zone (HMR safe). |
| `isNear()` | Called every frame. `true` while the player is in range. |
| `label` | Text after "Press E to ". A function may return `null` to hide the prompt (e.g. already equipped) and disable the hold. |
| `onConfirm()` | Runs once when a continuous 2 s hold completes. |

`registerInteractZone` returns an unregister function, for zones that come and go.

## Rules to know

- **First registered zone that is near wins**, even if its label is `null`. Keep zone ranges from overlapping (the stones use 1.7 m per axis, under half their 3.5 m spacing).
- Releasing E, or the active zone changing mid-hold, resets the ring to empty.
- `onConfirm` should re-check state itself (owned? enough Wins?) and report failures with `showActionResult(text, false)`. The prompt shows regardless of affordability, by design.
- Hold time: `HOLD_MS` in `systems/interactHold.js`. Key: `INTERACT_KEY` in `systems/input.js`.

## Flow

```
KeyE held ─ input.js isInteractKeyDown()
GameLoop useFrame ─ interact.js step()
   first zone with isNear() → label()           → interactState.label
   interactHold.step(zone.id, keyDown)          → interactHoldState.progress (0..1)
   returns true at 2 s                          → zone.onConfirm() (once)
HUD (10 Hz poll, never per-frame React):
   InteractPrompt.jsx  reads interactState + interactHoldState → text, ring, .held class
   Hud.jsx             reads actionResultState.id → ActionResult.jsx popup (2.4 s)
```

## Files

| File | Role |
| --- | --- |
| `systems/interact.js` | Zone registry + per-frame step |
| `systems/interactHold.js` | 2 s hold timer and progress |
| `systems/input.js` | `isInteractKeyDown()`, `INTERACT_KEY` |
| `systems/actionResult.js` | `showActionResult(text, success)` |
| `components/InteractPrompt.jsx` | Prompt card + ring (mounted in `Hud.jsx`) |
| `components/ActionResult.jsx` | Top-centre popup (mounted in `Hud.jsx`) |
| `index.css` | `.interact-*` and `.action-result*` styles, `@keyframes action-result-pop` |
| `systems/skillStoneZones.js` | Reference example: buy/equip per stone |

## Porting to another project

Copy the files above, then:

1. Add `isInteractKeyDown` to the input module (a `held` Set of `e.code` values).
2. Call `stepInteract()` once per frame in the game loop.
3. Mount `<InteractPrompt />` and `<ActionResult ref>` in the HUD, plus the ActionResult poll in `Hud.jsx`.
4. Copy the CSS blocks.

Not included: touch E button, sound.
