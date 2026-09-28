import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { BackSide, Color, ShaderMaterial, SphereGeometry } from 'three'

// Gradient sky dome. Unlit, ignores fog, and follows the camera so the
// horizon never moves. `colors` is { top, mid, bottom }; `bottom` should
// match the scene fog so distant geometry melts into the horizon.
const DOME_RADIUS = 300

export default function Sky({ colors }) {
  const camera = useThree((s) => s.camera)
  const group = useRef()

  const material = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          topColor: { value: new Color() },
          midColor: { value: new Color() },
          bottomColor: { value: new Color() },
        },
        vertexShader: `
          varying float vHeight;
          void main() {
            vHeight = normalize(position).y;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 topColor;
          uniform vec3 midColor;
          uniform vec3 bottomColor;
          varying float vHeight;
          void main() {
            float h = clamp(vHeight, -1.0, 1.0);
            vec3 sky = mix(midColor, topColor, clamp(h * 1.4, 0.0, 1.0));
            vec3 low = mix(bottomColor, midColor, clamp((h + 0.3) * 3.0, 0.0, 1.0));
            gl_FragColor = vec4(h > 0.0 ? sky : low, 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  )
  const geometry = useMemo(() => new SphereGeometry(DOME_RADIUS, 24, 16), [])

  useEffect(() => {
    material.uniforms.topColor.value.set(colors.top)
    material.uniforms.midColor.value.set(colors.mid)
    material.uniforms.bottomColor.value.set(colors.bottom)
  }, [material, colors])

  useFrame(() => {
    if (group.current) group.current.position.copy(camera.position)
  })

  useEffect(
    () => () => {
      material.dispose()
      geometry.dispose()
    },
    [material, geometry],
  )

  return (
    <group ref={group} renderOrder={-2}>
      <mesh geometry={geometry} material={material} frustumCulled={false} />
    </group>
  )
}
