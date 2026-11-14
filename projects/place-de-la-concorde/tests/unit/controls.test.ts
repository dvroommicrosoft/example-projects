// @vitest-environment jsdom
import { PerspectiveCamera } from 'three'
import { describe, expect, it } from 'vitest'
import { createControls } from '../../src/interactions/controls'

describe('createControls', () => {
  it('returns { update, dispose }, builds overlay buttons and keeps the camera finite', () => {
    const host = document.createElement('div')
    document.body.append(host)
    const domElement = document.createElement('canvas')
    host.append(domElement)
    const camera = new PerspectiveCamera(50, 1.6, 0.1, 2000)
    camera.position.set(80, 60, 120)
    const renderer = { domElement } as unknown as Parameters<typeof createControls>[1]

    const controls = createControls(camera, renderer)
    expect(typeof controls.update).toBe('function')
    expect(typeof controls.dispose).toBe('function')

    const buttons = [...document.querySelectorAll('button')]
    expect(buttons.some((b) => /reset/i.test(b.textContent + (b.getAttribute('aria-label') ?? '')))).toBe(true)
    expect(buttons.length).toBeGreaterThanOrEqual(3)

    for (let i = 0; i < 10; i++) controls.update(0.016)
    expect(camera.position.toArray().every(Number.isFinite)).toBe(true)

    controls.dispose()
  })
})
