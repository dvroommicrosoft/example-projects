import * as THREE from 'three'
import './style.css'
import { buildConcorde } from './scene/index.ts'
import { setupControls, setupEnvironment } from './scene/environment.ts'

const canvas = document.querySelector<HTMLCanvasElement>('#scene')!
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000)

setupEnvironment(scene, renderer)
buildConcorde(scene)
const controls = setupControls(camera, canvas)

function resize(): void {
  const { clientWidth: w, clientHeight: h } = canvas
  renderer.setSize(w, h, false)
  camera.aspect = w / Math.max(h, 1)
  camera.updateProjectionMatrix()
}
new ResizeObserver(resize).observe(canvas)
resize()

renderer.setAnimationLoop(() => {
  controls.update()
  renderer.render(scene, camera)
})
