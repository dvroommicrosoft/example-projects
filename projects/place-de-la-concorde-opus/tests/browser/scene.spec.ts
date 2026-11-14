import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  const problems: string[] = []
  page.on('pageerror', (e) => problems.push(e.message))
  page.on('console', (m) => m.type() === 'error' && problems.push(m.text()))
  page.on('requestfailed', (r) => problems.push(`failed: ${r.url()}`))
  ;(page as unknown as { problems: string[] }).problems = problems
})

test.afterEach(async ({ page }) => {
  expect((page as unknown as { problems: string[] }).problems).toEqual([])
})

const canvasHash = (page: import('@playwright/test').Page) =>
  page.getByTestId('scene-canvas').evaluate((c: HTMLCanvasElement) => {
    const t = document.createElement('canvas')
    t.width = 64
    t.height = 40
    t.getContext('2d')!.drawImage(c, 0, 0, 64, 40)
    return Array.from(t.getContext('2d')!.getImageData(0, 0, 64, 40).data).reduce((a, v, i) => (a + v * (i % 97 + 1)) % 1e9, 0)
  })

test('renders a ready canvas mounted in #app', async ({ page }) => {
  await page.goto('./')
  const canvas = page.getByTestId('scene-canvas')
  await expect(canvas).toHaveAttribute('data-ready', 'true')
  await expect(page.locator('#app').getByTestId('scene-canvas')).toBeVisible()
  const box = (await canvas.boundingBox())!
  expect(box.width).toBeGreaterThan(300)
  expect(box.height).toBeGreaterThan(300)
})

test('preset and reset buttons are present and change the view', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByTestId('scene-canvas')).toHaveAttribute('data-ready', 'true')
  for (const name of ['Obelisk', 'Fountains', 'Grand overview']) {
    await expect(page.getByRole('button', { name })).toBeVisible()
  }
  const reset = page.getByRole('button', { name: /reset view/i }).first()
  await expect(reset).toBeVisible()
  await page.waitForTimeout(500)
  const initial = await canvasHash(page)
  await page.getByRole('button', { name: 'Obelisk' }).click()
  await expect.poll(() => canvasHash(page), { timeout: 8000 }).not.toBe(initial)
  await reset.click()
  await expect.poll(() => canvasHash(page), { timeout: 8000 }).toBe(initial)
})

test('orbit drag and wheel zoom change the view', async ({ page }) => {
  await page.goto('./')
  const canvas = page.getByTestId('scene-canvas')
  await expect(canvas).toHaveAttribute('data-ready', 'true')
  await page.waitForTimeout(500)
  const initial = await canvasHash(page)
  const b = (await canvas.boundingBox())!
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width / 2 + 160, b.y + b.height / 2 + 30, { steps: 8 })
  await page.mouse.up()
  await expect.poll(() => canvasHash(page), { timeout: 8000 }).not.toBe(initial)
  const orbited = await canvasHash(page)
  await page.mouse.wheel(0, -600)
  await expect.poll(() => canvasHash(page), { timeout: 8000 }).not.toBe(orbited)
})

test('resizes with the viewport', async ({ page }) => {
  await page.goto('./')
  const canvas = page.getByTestId('scene-canvas')
  await expect(canvas).toHaveAttribute('data-ready', 'true')
  await page.setViewportSize({ width: 390, height: 780 })
  await expect.poll(async () => (await canvas.boundingBox())!.width).toBeLessThanOrEqual(390)
  await expect(page.getByRole('button', { name: 'Grand overview' })).toBeVisible()
  await page.setViewportSize({ width: 1000, height: 600 })
  await expect.poll(async () => (await canvas.boundingBox())!.width).toBeGreaterThan(600)
})
