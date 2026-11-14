import { expect, test, type Page } from '@playwright/test'

function trackErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`)
  })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  return errors
}

// Mean absolute difference (0-255) between two PNG screenshots, downsampled.
async function imageDiff(page: Page, a: Buffer, b: Buffer): Promise<number> {
  return page.evaluate(
    async ([x, y]) => {
      const pixels = async (b64: string) => {
        const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob()
        const bitmap = await createImageBitmap(blob)
        const c = document.createElement('canvas')
        c.width = c.height = 64
        const ctx = c.getContext('2d')!
        ctx.drawImage(bitmap, 0, 0, 64, 64)
        return ctx.getImageData(0, 0, 64, 64).data
      }
      const [pa, pb] = [await pixels(x), await pixels(y)]
      let sum = 0
      for (let i = 0; i < pa.length; i++) if (i % 4 !== 3) sum += Math.abs(pa[i] - pb[i])
      return sum / ((pa.length / 4) * 3)
    },
    [a.toString('base64'), b.toString('base64')],
  )
}

async function shot(page: Page): Promise<Buffer> {
  await page.waitForTimeout(1500) // let camera damping settle
  return page.locator('#app canvas').first().screenshot()
}

test('loads a WebGL canvas without errors', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('./')
  const canvas = page.locator('#app canvas').first()
  await expect(canvas).toBeVisible()
  const box = await canvas.boundingBox()
  expect(box!.width).toBeGreaterThan(100)
  expect(box!.height).toBeGreaterThan(100)
  const hasWebGL = await canvas.evaluate((c: HTMLCanvasElement) => {
    const gl = c.getContext('webgl2') ?? c.getContext('webgl')
    return !!gl
  })
  expect(hasWebGL).toBe(true)
  await page.waitForTimeout(1000)
  expect(errors).toEqual([])
})

test('canvas fills the viewport after a mobile resize', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('./')
  const canvas = page.locator('#app canvas').first()
  await expect(canvas).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect
    .poll(async () => {
      const b = await canvas.boundingBox()
      return b ? [Math.round(b.width), Math.round(b.height)] : null
    })
    .toEqual([390, 844])
  expect(errors).toEqual([])
})

test('preset buttons change the view and reset restores it', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('./')
  await expect(page.locator('#app canvas').first()).toBeVisible()

  const reset = page.getByRole('button', { name: /reset/i }).first()
  await expect(reset).toBeVisible()
  const presets = page
    .getByRole('button')
    .filter({ hasNotText: /reset|help|close|^\?$/i })
  const count = await presets.count()
  expect(count).toBeGreaterThanOrEqual(2)

  const initial = await shot(page)
  let largest = 0
  for (let i = 0; i < count; i++) {
    await presets.nth(i).click()
    largest = Math.max(largest, await imageDiff(page, initial, await shot(page)))
  }
  expect(largest).toBeGreaterThan(3)

  await reset.click()
  const restored = await imageDiff(page, initial, await shot(page))
  expect(restored).toBeLessThan(largest / 2)
  expect(errors).toEqual([])
})
