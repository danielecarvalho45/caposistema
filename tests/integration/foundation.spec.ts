import { expect, test } from '@playwright/test'

test('abre a entrada única do Sistema CAPO', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle('Sistema CAPO')
  await expect(
    page.getByRole('heading', { name: 'Bem-vindo ao Sistema CAPO' }),
  ).toBeVisible()
  await expect(page.getByRole('img', { name: /CAPO/ })).toBeVisible()
  await expect(page.getByLabel('Usuário')).toBeFocused()
  await page.screenshot({
    path: 'evidencias/entrada-login-desktop.png',
    fullPage: true,
    animations: 'disabled',
  })
})

test('valida os campos obrigatórios e alterna a visibilidade da senha', async ({
  page,
}) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Entrar no CAPO' }).click()
  await expect(page.getByRole('alert')).toHaveText(
    'Informe o nome de usuário e a senha.',
  )

  const password = page.getByLabel('Senha', { exact: true })
  await password.fill('654321')
  await page.getByRole('button', { name: 'Mostrar senha' }).click()
  await expect(password).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: 'Ocultar senha' }).click()
  await expect(password).toHaveAttribute('type', 'password')
})

test('navega entre login e recuperação sem perder acessibilidade', async ({
  page,
}) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Esqueceu sua senha?' }).click()
  await expect(
    page.getByRole('heading', { name: 'Recuperar senha' }),
  ).toBeVisible()
  await expect(page.getByLabel('E-mail cadastrado')).toBeFocused()

  await page.getByRole('button', { name: 'Voltar para o login' }).click()
  await expect(
    page.getByRole('heading', { name: 'Bem-vindo ao Sistema CAPO' }),
  ).toBeVisible()
})

test('recebe erro genérico do backend para credencial inexistente', async ({
  page,
}) => {
  test.slow()
  await page.goto('/')

  await page.getByLabel('Usuário').fill('capo-teste-inexistente')
  await page.getByLabel('Senha', { exact: true }).fill('654321')
  await page.getByRole('button', { name: 'Entrar no CAPO' }).click()

  await expect(page.getByRole('alert')).toContainText(
    'Nome de usuário e/ou senha incorretos.',
    { timeout: 30_000 },
  )
  await expect(
    page.getByRole('heading', { name: 'Bem-vindo ao Sistema CAPO' }),
  ).toBeVisible()
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
  await page.screenshot({
    path: 'evidencias/entrada-login-mobile.png',
    fullPage: true,
    animations: 'disabled',
  })
})
