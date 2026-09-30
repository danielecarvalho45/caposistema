import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { NutritionPage } from '../../src/features/nutrition/NutritionPage'
import type { AccessContext } from '../../src/types/access'

const rpc = vi.hoisted(() => ({
  getNutritionAdminDeliveries: vi.fn().mockResolvedValue({ status: 'empty' }),
  getNutritionDocumentsForManagement: vi.fn().mockResolvedValue({ status: 'empty' }),
}))

vi.mock('../../src/lib/supabase/rpc', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/lib/supabase/rpc')>()),
  getRpcService: () => rpc,
}))

const gestorContext = {
  is_active: true,
  professional_id: null,
  roles: [{ code: 'administrador', name: 'Administrador' }],
  primary_context: { code: 'administrador' },
  capabilities: [],
  specialties: [],
} as unknown as AccessContext

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it('permite ao Gestor gerar PDF de plano já preenchido sem expor edição do plano', async () => {
  render(
    <MemoryRouter>
      <NutritionPage accessContext={gestorContext} />
    </MemoryRouter>,
  )

  expect(await screen.findByRole('heading', { name: 'Documentos nutricionais oficiais' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Gerar PDF de Plano Alimentar já preenchido' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Gerar PDF do plano já preenchido' })).toBeDisabled()
  expect(screen.queryByRole('button', { name: 'Salvar / atualizar plano' })).not.toBeInTheDocument()
})
