import { createHash } from 'node:crypto'
import { expect, test as base, type Page } from '@playwright/test'

const test = base.extend<{ checkedPage: Page }>({
  checkedPage: async ({ page }, use) => {
    const problems: string[] = []
    page.on('pageerror', (e) => problems.push(e.message))
    page.on('console', (m) => m.type() === 'error' && problems.push(m.text()))
    page.on('requestfailed', (r) => problems.push(`failed: ${r.url()}`))
    await use(page)
    expect(problems).toEqual([])
  },
})

// Capture the compositor, not a WebGL buffer that may already have been cleared.
// The middle strip excludes the toolbar, descriptions and canvas focus outline.
const canvasImage = (page: Page) =>
  page.screenshot({ clip: { x: 16, y: 150, width: 1248, height: 350 } })
const canvasHash = async (page: Page) =>
  createHash('sha256').update(await canvasImage(page)).digest('hex')

test('renders a detailed ready canvas mounted in #app', async ({ checkedPage: page }) => {
  await page.goto('./')
  const canvas = page.getByTestId('scene-canvas')
  await expect(canvas).toHaveAttribute('data-ready', 'true')
  await expect(page.locator('#app').getByTestId('scene-canvas')).toBeVisible()
  const box = (await canvas.boundingBox())!
  expect(box.width).toBeGreaterThan(300)
  expect(box.height).toBeGreaterThan(300)
  expect((await canvasImage(page)).length).toBeGreaterThan(20_000)
})

test('each preset changes the rendered view and reset restores it', async ({ checkedPage: page }) => {
  await page.goto('./')
  await expect(page.getByTestId('scene-canvas')).toHaveAttribute('data-ready', 'true')
  for (const name of ['Obelisk', 'Fountains', 'Grand overview']) {
    await expect(page.getByRole('button', { name })).toBeVisible()
  }
  const reset = page.getByRole('button', { name: /reset view/i }).first()
  await expect(reset).toBeVisible()
  const initial = await canvasHash(page)
  let previous = initial
  for (const name of ['Obelisk', 'Fountains', 'Grand overview']) {
    const button = page.getByRole('button', { name, exact: true })
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(() => canvasHash(page)).not.toBe(previous)
    previous = await canvasHash(page)
  }
  await reset.click()
  await expect.poll(() => canvasHash(page)).toBe(initial)
})

test('orbit drag, wheel zoom and keyboard reset change the rendered view', async ({ checkedPage: page }) => {
  await page.goto('./')
  const canvas = page.getByTestId('scene-canvas')
  await expect(canvas).toHaveAttribute('data-ready', 'true')
  const initial = await canvasHash(page)
  const b = (await canvas.boundingBox())!
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width / 2 + 160, b.y + b.height / 2 + 30, { steps: 8 })
  await page.mouse.up()
  await expect.poll(() => canvasHash(page)).not.toBe(initial)
  const orbited = await canvasHash(page)
  await page.mouse.wheel(0, -600)
  await expect.poll(() => canvasHash(page)).not.toBe(orbited)
  await canvas.focus()
  await page.keyboard.press('r')
  await expect.poll(() => canvasHash(page)).toBe(initial)
  await page.keyboard.press('+')
  await expect.poll(() => canvasHash(page)).not.toBe(initial)
})

test('resizes with the viewport and keeps mobile controls usable', async ({ checkedPage: page }) => {
  await page.goto('./')
  const canvas = page.getByTestId('scene-canvas')
  await expect(canvas).toHaveAttribute('data-ready', 'true')
  await page.setViewportSize({ width: 390, height: 780 })
  await expect.poll(async () => (await canvas.boundingBox())!.width).toBeLessThanOrEqual(390)
  await expect(page.getByRole('button', { name: 'Grand overview' })).toBeVisible()
  await page.getByRole('button', { name: 'Fountains', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Fontaines de la Concorde')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  await page.setViewportSize({ width: 1000, height: 600 })
  await expect.poll(async () => (await canvas.boundingBox())!.width).toBeGreaterThan(600)
})

test('reduced motion freezes water while normal motion animates it', async ({ checkedPage: page }) => {
  await page.goto('./')
  await expect(page.getByTestId('scene-canvas')).toHaveAttribute('data-ready', 'true')
  await page.getByRole('button', { name: 'Fountains', exact: true }).click()
  const still = await canvasHash(page)
  expect(await canvasHash(page)).toBe(still)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect.poll(() => canvasHash(page)).not.toBe(still)
})
