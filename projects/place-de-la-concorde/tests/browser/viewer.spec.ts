import { expect, test, type Page } from '@playwright/test'

const canvasSel = '#scene'

async function ready(page: Page) {
  await page.goto('./')
  await expect(page.locator(canvasSel)).toHaveAttribute('data-state', 'ready', { timeout: 30_000 })
}

async function cameraOf(page: Page) {
  const raw = await page.locator(canvasSel).getAttribute('data-camera')
  return (raw ?? '').split(',').map(Number)
}

const animationTime = async (page: Page) =>
  Number(await page.locator(canvasSel).getAttribute('data-animation-time'))

test.describe('viewer', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('serves the production build at its base path with real WebGL', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    await ready(page)
    await expect(page).toHaveURL(/\/example-projects\/place-de-la-concorde\/$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Place de la Concorde' })).toBeVisible()
    await expect(page.locator('#fallback')).toBeHidden()
    const hasGl = await page.locator(canvasSel).evaluate((c: HTMLCanvasElement) => !!(c.getContext('webgl2') ?? c.getContext('webgl')))
    expect(hasGl).toBe(true)
    expect(errors).toEqual([])
  })

  test('only requests same-origin assets', async ({ page, baseURL }) => {
    const origin = new URL(baseURL!).origin
    const external: string[] = []
    page.on('request', (r) => {
      if (!r.url().startsWith(origin) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) external.push(r.url())
    })
    await ready(page)
    expect(external).toEqual([])
  })

  test('keyboard, pointer and wheel move the camera; reset restores it', async ({ page }) => {
    await ready(page)
    await expect(page.locator(canvasSel)).toHaveAttribute('data-at-home', 'true')
    const home = await cameraOf(page)

    await page.locator(canvasSel).focus()
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowLeft')
    await expect(page.locator(canvasSel)).toHaveAttribute('data-at-home', 'false')
    expect(await cameraOf(page)).not.toEqual(home)

    await page.getByRole('button', { name: 'Reset view' }).click()
    await expect(page.locator(canvasSel)).toHaveAttribute('data-at-home', 'true')
    expect(await cameraOf(page)).toEqual(home)

    const box = (await page.locator(canvasSel).boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 40, { steps: 8 })
    await page.mouse.up()
    await expect(page.locator(canvasSel)).toHaveAttribute('data-at-home', 'false')

    await page.keyboard.press('r')
    await expect(page.locator(canvasSel)).toHaveAttribute('data-at-home', 'true')
  })

  test('camera stays within zoom and ground limits', async ({ page }) => {
    await ready(page)
    await page.locator(canvasSel).focus()
    for (let i = 0; i < 60; i++) await page.keyboard.press('-')
    const [x, y, z] = await cameraOf(page)
    expect(Math.hypot(x, y, z)).toBeLessThanOrEqual(430)
    for (let i = 0; i < 40; i++) await page.keyboard.press('ArrowDown')
    expect((await cameraOf(page))[1]).toBeGreaterThan(0)
    for (let i = 0; i < 120; i++) await page.keyboard.press('Shift+ArrowLeft')
    const [px, , pz] = await cameraOf(page)
    expect(Math.abs(px)).toBeLessThan(700)
    expect(Math.abs(pz)).toBeLessThan(700)
  })

  test('pause and resume freeze and restart the water animation clock', async ({ page }) => {
    await ready(page)
    const pause = page.getByRole('button', { name: 'Pause water' })
    await expect(pause).toHaveAttribute('aria-pressed', 'false')
    await pause.click()
    const resume = page.getByRole('button', { name: 'Resume water' })
    await expect(resume).toHaveAttribute('aria-pressed', 'true')
    const frozen = await animationTime(page)
    await page.waitForTimeout(700)
    expect(await animationTime(page)).toBe(frozen)
    await resume.click()
    await expect.poll(() => animationTime(page)).toBeGreaterThan(frozen)
    await expect(page.getByRole('button', { name: 'Pause water' })).toHaveAttribute('aria-pressed', 'false')
  })

  test('canvas follows the viewport and caps the pixel ratio', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await ready(page)
    for (const size of [{ width: 1280, height: 800 }, { width: 390, height: 780 }, { width: 900, height: 500 }]) {
      await page.setViewportSize(size)
      await expect
        .poll(() => page.locator(canvasSel).evaluate((c: HTMLCanvasElement) => [c.clientWidth, c.clientHeight, c.width, c.height]), { timeout: 15_000 })
        .toEqual([size.width, size.height, size.width, size.height])
    }
    await expect(page.getByRole('button', { name: 'Reset view' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Pause water' })).toBeVisible()
  })

  test('controls remain reachable on a small touch screen', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true, deviceScaleFactor: 3, reducedMotion: 'no-preference' })
    const page = await context.newPage()
    await ready(page)
    const dims = await page.locator(canvasSel).evaluate((c: HTMLCanvasElement) => [c.clientWidth, c.width])
    expect(dims[1]).toBeLessThanOrEqual(dims[0] * 2)
    const reset = page.getByRole('button', { name: 'Reset view' })
    await expect(reset).toBeInViewport()
    expect((await reset.boundingBox())!.height).toBeGreaterThanOrEqual(40)
    await context.close()
  })

  test('context loss is reported and recovery clears the message', async ({ page }) => {
    await ready(page)
    // Extensions are unavailable while the context is lost, so drive both steps from one page-side call.
    const seen = await page.locator(canvasSel).evaluate(async (c: HTMLCanvasElement) => {
      const gl = (c.getContext('webgl2') ?? c.getContext('webgl'))!
      const ext = gl.getExtension('WEBGL_lose_context')!
      const once = (name: string) => new Promise((r) => c.addEventListener(name, r, { once: true }))
      const lost = once('webglcontextlost')
      ext.loseContext()
      await lost
      const alertWhileLost = document.getElementById('fallback')!.textContent ?? ''
      await new Promise((r) => setTimeout(r, 300))
      const restored = once('webglcontextrestored')
      ext.restoreContext()
      await restored
      return alertWhileLost
    })
    expect(seen).toContain('3D context was lost')
    await expect(page.locator('#fallback')).toBeHidden()
  })
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('starts with the water paused and the clock frozen', async ({ page }) => {
    await ready(page)
    await expect(page.getByRole('button', { name: 'Resume water' })).toHaveAttribute('aria-pressed', 'true')
    const t = await animationTime(page)
    await page.waitForTimeout(600)
    expect(await animationTime(page)).toBe(t)
    await page.getByRole('button', { name: 'Resume water' }).click()
    await expect.poll(() => animationTime(page)).toBeGreaterThan(t)
  })
})

test.describe('WebGL unavailable', () => {
  test('shows an explicit error instead of failing silently', async ({ page }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (/webgl/i.test(type)) return null
        return (original as (...a: unknown[]) => unknown).call(this, type, ...rest) as never
      } as typeof original
    })
    await page.goto('./')
    const alert = page.getByRole('alert')
    await expect(alert).toBeVisible()
    await expect(alert).toContainText('WebGL is unavailable')
    await expect(page.getByRole('button', { name: 'Reload viewer' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Reset view' })).toBeDisabled()
  })
})
