import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import { CatmullRomCurve3, Shape, Vector3, type Group, type Mesh, type PointLight } from 'three'

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

function FileCard({ at, color, id, state, returned = false }: { at: number; color: string; id: string; state: string; returned?: boolean }) {
  const group = useRef<Group>(null)
  const flap = useRef<Mesh>(null)
  const [position, tangent] = useMemo(() => [curve.getPoint(at), curve.getTangent(at)], [at])
  useFrame(({ clock }) => {
    if (group.current) {
      group.current.position.y = position.y + Math.sin(clock.elapsedTime * 0.7 + at * 9) * 0.045
      group.current.rotation.z = tangent.x * -0.08 + Math.sin(clock.elapsedTime * 0.45 + at) * 0.015
    }
    if (flap.current) flap.current.rotation.z = Math.sin(clock.elapsedTime * 0.5 + at * 8) * 0.015
  })
  return <group ref={group} position={position.toArray() as [number, number, number]} rotation={[0.04, tangent.x * 0.12, tangent.y * -0.08]}>
    <RoundedBox args={[1.5, 0.92, 0.12]} radius={0.09} smoothness={4} castShadow>
      <meshStandardMaterial color="#FFFBF3" roughness={0.86} />
    </RoundedBox>
    <mesh ref={flap} position={[-0.35, 0.47, 0.01]} rotation={[0, 0, -0.02]}>
      <shapeGeometry args={[folderShape()]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
    <mesh position={[-0.61, 0.02, 0.071]}><planeGeometry args={[0.035, 0.46]} /><meshStandardMaterial color={color} /></mesh>
    <Html transform distanceFactor={9} position={[0, -0.04, 0.077]} occlude={false}>
      <div className="scene-file-label"><span className="mono">{id}</span><strong>{state}</strong>{returned && <em>Returned · fire NOC copy required</em>}</div>
    </Html>
  </group>
}

function folderShape() {
  const shape = new Shape()
  shape.moveTo(-0.75, 0.24); shape.lineTo(-0.75, 0.44); shape.quadraticCurveTo(-0.75, 0.52, -0.66, 0.52)
  shape.lineTo(-0.23, 0.52); shape.lineTo(-0.1, 0.4); shape.lineTo(0.66, 0.4); shape.quadraticCurveTo(0.75, 0.4, 0.75, 0.31)
  shape.lineTo(0.75, 0.24); shape.closePath()
  return shape
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
    {[0.22, 0.4, 0.61, 0.81, 0.95].map((at, index) => <FileCard key={at} at={at} color={routeColors[index]} id={index === 1 ? 'CP-2026-NR-04821' : `CP-2026-${['NR', 'SC', 'EW', 'SW', 'NE'][index]}-0${483 + index}`} state={index === 1 ? 'Evidence requested' : ['Preliminary scrutiny', 'Returned for response', 'Committee review', 'Authority record', 'Compliance due'][index]} returned={index === 1} />)}
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
