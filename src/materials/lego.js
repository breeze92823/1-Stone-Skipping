import { Color, MeshStandardMaterial } from 'three'
import { CHECKER, STUD } from '../data/world.js'

// The Roblox-lobby look: every surface is a flat colour (or a two-colour
// checker) with lego studs pressed into it. Both patterns are computed in
// world space, picking the projection plane from the surface normal, so
// adjacent boxes line up seamlessly without any UV work and the pattern
// never stretches when a box is scaled.
//
// `top`/`top2` colour upward-facing faces, `side`/`side2` everything else
// (defaults to the top colours). `checker` is the checker square size in
// metres, or 0 for a plain colour. Materials are cached by their options, so
// calling this in render is cheap and meshes share programs/uniforms.
const cache = new Map()

const VERTEX_DECL = /* glsl */ `
varying vec3 vLegoPos;
varying vec3 vLegoNormal;
`

const VERTEX_BODY = /* glsl */ `
vec4 lgWP = vec4(transformed, 1.0);
vec3 lgObjN = objectNormal;
#ifdef USE_INSTANCING
  lgWP = instanceMatrix * lgWP;
  lgObjN = mat3(instanceMatrix) * lgObjN;
#endif
lgWP = modelMatrix * lgWP;
vLegoPos = lgWP.xyz;
vLegoNormal = normalize(mat3(modelMatrix) * lgObjN);
`

const FRAGMENT_DECL = /* glsl */ `
varying vec3 vLegoPos;
varying vec3 vLegoNormal;
uniform vec3 legoTopA;
uniform vec3 legoTopB;
uniform vec3 legoSideA;
uniform vec3 legoSideB;
uniform float legoChecker;
uniform float legoStud;
uniform float legoStudStrength;
`

const FRAGMENT_BODY = /* glsl */ `
{
  vec3 lgN = normalize(vLegoNormal);
  vec3 lgA = abs(lgN);
  vec2 lgUV = lgA.y > 0.5 ? vLegoPos.xz : (lgA.x > lgA.z ? vLegoPos.zy : vLegoPos.xy);
  float lgTop = step(0.5, lgN.y);

  float lgCh = 0.0;
  if (legoChecker > 0.0) {
    vec2 lgCell = floor(lgUV / legoChecker + 1e-3);
    lgCh = mod(lgCell.x + lgCell.y, 2.0);
  }
  vec3 lgCol = mix(mix(legoSideA, legoSideB, lgCh), mix(legoTopA, legoTopB, lgCh), lgTop);
  diffuseColor.rgb *= lgCol;

  // One stud per cell: a raised ring lit from the upper-left, plus a faint
  // groove where cells meet. Fades out once cells shrink below a few pixels
  // so distant surfaces don't shimmer.
  vec2 lgS = lgUV / legoStud;
  vec2 lgF = fract(lgS) - 0.5;
  float lgW = fwidth(lgS.x) + fwidth(lgS.y);
  float lgFade = 1.0 - smoothstep(0.12, 0.4, lgW);
  float lgD = length(lgF);
  float lgRing = smoothstep(0.22 - lgW, 0.22 + lgW, lgD) * (1.0 - smoothstep(0.34 - lgW, 0.34 + lgW, lgD));
  float lgLit = dot(lgF / max(lgD, 1e-4), vec2(-0.7071, 0.7071));
  vec2 lgE = 0.5 - abs(lgF);
  float lgEdge = 1.0 - smoothstep(0.0, 0.06 + lgW, min(lgE.x, lgE.y));
  float lgInner = 1.0 - smoothstep(0.22 - lgW, 0.22 + lgW, lgD);
  diffuseColor.rgb *= 1.0 + legoStudStrength * lgFade * (lgRing * 0.26 * lgLit - lgRing * 0.05 + lgInner * 0.05 - lgEdge * 0.14);
}
`

export function legoMaterial(options) {
  const key = JSON.stringify(options)
  const cached = cache.get(key)
  if (cached) return cached

  const { top = '#ffffff', top2, side, side2, checker = 0, stud = STUD, studStrength = 1, ...rest } = options
  const material = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.82, metalness: 0, ...rest })

  const uniforms = {
    legoTopA: { value: new Color(top) },
    legoTopB: { value: new Color(top2 ?? top) },
    legoSideA: { value: new Color(side ?? top) },
    legoSideB: { value: new Color(side2 ?? side ?? top2 ?? top) },
    legoChecker: { value: checker },
    legoStud: { value: stud },
    legoStudStrength: { value: studStrength },
  }

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERTEX_DECL}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERTEX_BODY}`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAGMENT_DECL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${FRAGMENT_BODY}`)
  }
  material.customProgramCacheKey = () => 'lego-v1'

  cache.set(key, material)
  return material
}

// Common palette pulled from the screenshots.
export const PALETTE = {
  grass: '#62cc2f',
  grass2: '#86e04e',
  dirt: '#a8703f',
  dirt2: '#caa071',
  path: '#cdd5df',
  path2: '#bcc6d2', // second checker shade on walkways
  pathEdge: '#8a94a3',
  wood: '#a8672f',
  woodDark: '#7a4620',
  leaf: '#5fd12a',
  leafLight: '#8fe853',
  stone: '#aeb6c1',
  stoneDark: '#8791a0',
}
