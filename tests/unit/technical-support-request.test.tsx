import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TechnicalSupportRequest } from '../../src/components/forms/TechnicalSupportRequest'

afterEach(cleanup)

describe('TechnicalSupportRequest', () => {
  it('envia somente categorias canônicas aceitas pelo backend', async () => {
    const user = userEvent.setup()
    const create = vi.fn().mockResolvedValue({ status: 'success', data: { created: true } })
    render(
      <TechnicalSupportRequest
        affectedModule="/coordenacao"
        service={{ create }}
      />,
    )

    await user.type(screen.getByLabelText('Assunto'), 'Erro de tela')
    await user.selectOptions(screen.getByLabelText('Categoria'), 'erro_interface')
    await user.type(screen.getByLabelText('Descrição'), 'Tela não carregou corretamente.')
    await user.click(screen.getByRole('button', { name: 'Solicitar suporte' }))

    expect(create).toHaveBeenCalledWith({
      subject: 'Erro de tela',
      category: 'erro_interface',
      description: 'Tela não carregou corretamente.',
      priority: 'normal',
      affectedModule: '/coordenacao',
    })

    expect(screen.queryByRole('option', { name: 'Orientação' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Infraestrutura' })).not.toBeInTheDocument()
  })
})
