import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { CatmullRomCurve3, Vector3, type PointLight } from 'three'

const routeColors = ['#E5AE48', '#E0866B', '#DCE5D9', '#E5AE48', '#8EAD93']
const points = [new Vector3(-5, -0.6, 0.2), new Vector3(-2.9, 0.2, 0), new Vector3(-1.2, 1.5, -0.2), new Vector3(0.2, -0.7, 0.2), new Vector3(2.1, 0.2, -0.15), new Vector3(5, 1, 0.1)]
const curve = new CatmullRomCurve3(points)
const stageLabels = [
  { at: 0.08, text: 'Submission' }, { at: 0.27, text: 'Scrutiny' }, { at: 0.47, text: 'EVC' },
  { at: 0.66, text: 'SAC / SHC' }, { at: 0.84, text: 'Decision' }, { at: 0.97, text: 'Compliance' },
]

function Track() {
  const geometry = useMemo(() => {
    const positions = curve.getPoints(150).flatMap((point) => [point.x, point.y, point.z])
    return new Float32Array(positions)
  }, [])
  return <>
    <line>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[geometry, 3]} count={geometry.length / 3} itemSize={3} /></bufferGeometry>
      <lineBasicMaterial color="#E5AE48" transparent opacity={0.52} />
    </line>
    {stageLabels.map((stage, index) => {
      const position = curve.getPoint(stage.at)
      return <group key={stage.text} position={position.toArray() as [number, number, number]}>
        <mesh><sphereGeometry args={[index === 2 ? 0.14 : 0.105, 24, 24]} /><meshStandardMaterial color={routeColors[index % routeColors.length]} emissive={routeColors[index % routeColors.length]} emissiveIntensity={0.35} /></mesh>
        <mesh scale={1.65}><sphereGeometry args={[0.12, 20, 20]} /><meshBasicMaterial color={routeColors[index % routeColors.length]} transparent opacity={0.09} /></mesh>
        <Html center distanceFactor={11} position={[0, index % 2 === 0 ? -0.42 : 0.42, 0]}><span className="scene-stage-label">{stage.text}</span></Html>
      </group>
    })}
  </>
}

function MotionRig() {
  useFrame(({ camera, pointer, clock }) => {
    const scroll = Math.min(1, Math.max(0, window.scrollY / Math.max(1, window.innerHeight * 4)))
    const target = curve.getPoint(0.18 + scroll * 0.42)
    camera.position.lerp(new Vector3(1.3 + target.x * 0.24 + pointer.x * 0.28, 2.15 + pointer.y * 0.16, 12.1 - scroll * 0.8), 0.025)
    camera.lookAt(1.3 + target.x * 0.2, target.y * 0.12 + Math.sin(clock.elapsedTime * 0.18) * 0.03, 0)
  })
  return null
}

function SceneContent() {
  const light = useRef<PointLight>(null)
  useFrame(({ clock }) => { if (light.current) light.current.position.x = Math.sin(clock.elapsedTime * 0.2) * 1.8 })
  return <>
    <ambientLight intensity={1.6} />
    <directionalLight position={[0, 5, 5]} intensity={2.3} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
    <pointLight ref={light} position={[0, 2, 2]} color="#E5AE48" intensity={24} distance={12} />
    <Track />
    <MotionRig />
  </>
}

export default function CaseFlowScene() {
  return <div className="case-scene" aria-hidden="true">
    <img className="scene-fallback" src="/images/case-flow.svg" alt="" />
    <Canvas camera={{ position: [0, 2.15, 12.1], fov: 39 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }} shadows>
      <SceneContent />
    </Canvas>
  </div>
}
