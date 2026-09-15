import { expect, test } from '@playwright/test'

test('abre a entrada única do Sistema CAPO', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle('Sistema CAPO')
  await expect(
    page.getByRole('heading', { name: 'Bem-vindo ao Sistema CAPO' }),
  ).toBeVisible()
  await expect(page.getByRole('img', { name: /CAPO/ })).toBeVisible()
  await expect(page.getByLabel('Usuário')).toBeFocused()
})

test('permite percorrer o login por teclado com foco visível', async ({
  page,
}) => {
  await page.goto('/')

  const username = page.getByLabel('Usuário')
  const password = page.getByLabel('Senha', { exact: true })
  const showPassword = page.getByRole('button', { name: 'Mostrar senha' })

  await expect(username).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(password).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(showPassword).toBeFocused()
  await expect(showPassword).toHaveCSS('outline-style', 'solid')
})

test('mantém o login utilizável em viewport móvel', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/')

  await expect(page.getByLabel('Usuário')).toBeVisible()
  await expect(page.getByLabel('Senha', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Entrar no CAPO' }),
  ).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true)
})
