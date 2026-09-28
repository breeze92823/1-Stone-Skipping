// Shared roughness/metalness lookup table — every MeshStandardMaterial
// spreads one of these in rather than typing PBR values inline at the call
// site. Trimmed from Age-every-click's data/materials.js to the one entry
// this project's avatar system needs.
export const MATERIAL_PBR = {
  PLAYER: { roughness: 0.7, metalness: 0 },
}
