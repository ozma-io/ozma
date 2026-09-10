import { expect, test } from '@playwright/test'

async function maybeLogin(page) {
  const usernameField = page.locator('#username')
  const passwordField = page.locator('#password')
  const loginButton = page.locator('#kc-login')

  const loginFormVisible =
    (await usernameField.count()) > 0 &&
    (await passwordField.count()) > 0 &&
    (await loginButton.count()) > 0

  if (!loginFormVisible) return

  await usernameField.fill(process.env.E2E_LOGIN ?? 'admin@example.com')
  await passwordField.fill(process.env.E2E_PASSWORD ?? 'admin')
  await loginButton.click()
}

test.describe('Table header resize handle', () => {
  test.skip(
    !process.env.E2E_TABLE_URL,
    'Set E2E_TABLE_URL to a page URL with a table user view.',
  )

  test('does not trigger column DnD or sorting when dragging resize handle', async ({
    page,
  }) => {
    await page.goto(process.env.E2E_TABLE_URL)
    await maybeLogin(page)
    await page.goto(process.env.E2E_TABLE_URL)

    const headers = page.locator('thead th[draggable="true"]')
    await expect(headers.first()).toBeVisible()

    const getHeaderSnapshot = async () =>
      headers.evaluateAll((elements) =>
        elements.map((header) => {
          const caption =
            header.querySelector('.column-capture')?.textContent?.trim() ?? ''
          const sortIcon =
            header
              .querySelector('.sorting-wrapper .sorting-icon')
              ?.textContent?.trim() ?? null
          return { caption, sortIcon }
        }),
      )

    const beforeSnapshot = await getHeaderSnapshot()

    const resizeThumb = headers.first().locator('.resize-column-thumb')
    await expect(resizeThumb).toBeVisible()

    const box = await resizeThumb.boundingBox()
    expect(box).not.toBeNull()

    const startX = box.x + box.width / 2
    const startY = box.y + box.height / 2

    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(startX + 60, startY)
    await page.mouse.up()

    const afterSnapshot = await getHeaderSnapshot()
    await expect(afterSnapshot).toEqual(beforeSnapshot)

    await expect(page.locator('th.column-drop-target')).toHaveCount(0)
  })
})
