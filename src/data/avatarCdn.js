// Bloxity avatar CDN — asset URL builders for the hat/back .obj accessories
// the game attaches to its own character. Mirrors the path convention the
// Legion SDK's own customizer uses, so an item id resolves to the exact asset
// it would load. Pure string-building only — systems/avatarLoader.js is the
// sole consumer. Ported verbatim from Age-every-click's data/avatarCdn.js.

const AVATAR_CDN = 'https://static.bloxity.io/avatars'

// The SDK's own "nothing equipped" sentinels — '' / 'undefined' (as literal
// strings) / null for hats/back items — collapsed to one check so callers
// don't need to know which sentinel a given slot uses.
export function isEquipped(id) {
  return id != null && id !== '-1' && id !== -1 && id !== '' && id !== 'undefined' && id !== 'null'
}

// Equipped-slot table, same shape as SDK.avatar.getEquipped(). `part` slots
// swap the geometry of the matching default_* SkinnedMesh in the base rig;
// `item` slots are extra .obj meshes parented to a bone.
export const AVATAR_SLOTS = [
  { key: 'headId', kind: 'part', type: 'head', replaces: 'default_head' },
  { key: 'torsoId', kind: 'part', type: 'torso', replaces: 'default_torso' },
  { key: 'armLId', kind: 'part', type: 'arms', side: 'L', replaces: 'default_arm_L' },
  { key: 'armRId', kind: 'part', type: 'arms', side: 'R', replaces: 'default_arm_R' },
  { key: 'legLId', kind: 'part', type: 'legs', side: 'L', replaces: 'default_leg_L' },
  { key: 'legRId', kind: 'part', type: 'legs', side: 'R', replaces: 'default_leg_R' },
  { key: 'hatId', kind: 'item', type: 'hats', attach: 'Neck1' },
  { key: 'backId', kind: 'item', type: 'back', attach: 'Spine2' },
]

export function partUrl(slot, id) {
  const suffix = slot.side ? `_${slot.side}` : ''
  return `${AVATAR_CDN}/parts/${slot.type}/${id}${suffix}.glb`
}

export function itemUrls(slot, id) {
  return {
    mesh: `${AVATAR_CDN}/items/${slot.type}/${id}.obj`,
    texture: `${AVATAR_CDN}/textures/${slot.type}/${id}.png`,
  }
}

export function skinUrl(id) {
  return `${AVATAR_CDN}/skins/${id}.png`
}

export function hatObjUrl(id) {
  return isEquipped(id) ? `${AVATAR_CDN}/items/hats/${id}.obj` : null
}

export function hatTextureUrl(id) {
  return isEquipped(id) ? `${AVATAR_CDN}/textures/hats/${id}.png` : null
}

export function backObjUrl(id) {
  return isEquipped(id) ? `${AVATAR_CDN}/items/back/${id}.obj` : null
}

export function backTextureUrl(id) {
  return isEquipped(id) ? `${AVATAR_CDN}/textures/back/${id}.png` : null
}
