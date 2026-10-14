import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { corpoDaChamada, respostaJson, respostaProblema, respostaVazia, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { caminhoAcessosCasal, useAcessoCasalStore } from '@/stores/acessoCasal'
import { interpretarFalhaConviteCasal, useAutenticacaoStore } from '@/stores/autenticacao'
import { ErroApi } from '@/servicos/clienteHttp'
import type { AcessoCasalDto } from '@/tipos/acessoCasal'

const ID = '11111111-1111-4111-8111-111111111111'

function acesso(dados: Partial<AcessoCasalDto> = {}): AcessoCasalDto {
  return {
    id: 'a1',
    nome: 'Lívia Moraes',
    email: 'livia@exemplo.com',
    situacao: 'Pendente',
    convidadoEm: '2026-09-29T12:00:00Z',
    conviteExpiraEm: '2026-10-06T12:00:00Z',
    aceitoEm: null,
    ...dados,
  }
}

let fetchSimulado: ReturnType<typeof simularFetch>

beforeEach(() => {
  setActivePinia(createPinia())
  fetchSimulado = simularFetch()
})

afterEach(() => {
  registrarProvedorAutenticacao(null)
})

describe('useAcessoCasalStore', () => {
  it('[UNITÁRIO] monta as rotas codificando os identificadores', () => {
    expect(caminhoAcessosCasal(ID)).toBe(`/api/casamentos/${ID}/acessos-casal`)
    expect(caminhoAcessosCasal(ID, 'a/1', 'reenvio')).toBe(`/api/casamentos/${ID}/acessos-casal/a%2F1/reenvio`)
  })

  it('[UNITÁRIO] carrega, convida, reenvia e revoga mantendo a lista coerente', async () => {
    const store = useAcessoCasalStore()
    fetchSimulado
      .mockResolvedValueOnce(respostaJson([acesso()]))
      .mockResolvedValueOnce(respostaJson(acesso({ id: 'a2', nome: 'Rafael', email: 'rafael@exemplo.com' }), 201))
      .mockResolvedValueOnce(respostaJson(acesso({ conviteExpiraEm: '2026-10-09T12:00:00Z' })))
      .mockResolvedValueOnce(respostaVazia())

    await store.carregar(ID)
    expect(store.acessos).toHaveLength(1)

    const convite = await store.convidar(ID, { nome: 'Rafael', email: 'rafael@exemplo.com' })
    expect(convite.ok).toBe(true)
    expect(corpoDaChamada(fetchSimulado.mock.calls[1]!)).toEqual({ nome: 'Rafael', email: 'rafael@exemplo.com' })
    expect(store.acessos.map((item) => item.id)).toEqual(['a1', 'a2'])

    await store.reenviar(ID, 'a1')
    expect(store.acessos[0]!.conviteExpiraEm).toBe('2026-10-09T12:00:00Z')

    const revogacao = await store.revogar(ID, 'a1')
    expect(revogacao.ok).toBe(true)
    expect(fetchSimulado.mock.calls[3]![1]?.method).toBe('DELETE')
    expect(store.acessos.map((item) => item.id)).toEqual(['a2'])
  })

  it('[UNITÁRIO] traduz 403, 422 e falha de rede', async () => {
    const store = useAcessoCasalStore()
    fetchSimulado
      .mockResolvedValueOnce(respostaProblema(403))
      .mockResolvedValueOnce(respostaProblema(422, { detail: 'Este e-mail já foi convidado para este casamento.' }))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await store.carregar(ID)
    expect(store.falha?.tipo).toBe('semPermissao')

    const regra = await store.convidar(ID, { nome: 'Lívia', email: 'livia@exemplo.com' })
    expect(regra.ok).toBe(false)
    expect(regra.ok ? null : regra.falha).toMatchObject({ tipo: 'regra', mensagem: 'Este e-mail já foi convidado para este casamento.' })

    const rede = await store.revogar(ID, 'a1')
    expect(rede.ok ? null : rede.falha.tipo).toBe('conexao')
  })
})

describe('useAutenticacaoStore — casal', () => {
  it('[UNITÁRIO] reconhece o papel Casal e o casamento vinculado', async () => {
    const store = useAutenticacaoStore()
    fetchSimulado.mockResolvedValueOnce(
      respostaJson({
        tokenAcesso: 't',
        expiraEm: '2026-09-29T12:15:00Z',
        usuario: { id: 'u', nome: 'Lívia', email: 'l@e.com', papel: 'Casal', organizacao: { id: 'o', nome: 'Org' }, casamentoId: ID },
      }),
    )

    const resultado = await store.aceitarConviteCasal('token', 'casalFeliz2027')

    expect(resultado.ok).toBe(true)
    expect(store.ehCasal).toBe(true)
    expect(store.casamentoDoCasal).toBe(ID)
  })

  it('[UNITÁRIO] dona não é tratada como casal', async () => {
    const store = useAutenticacaoStore()
    fetchSimulado.mockResolvedValueOnce(
      respostaJson({
        tokenAcesso: 't',
        expiraEm: '2026-09-29T12:15:00Z',
        usuario: { id: 'u', nome: 'Renata', email: 'r@e.com', papel: 'Dono', organizacao: { id: 'o', nome: 'Org' }, casamentoId: null },
      }),
    )

    await store.entrar({ email: 'r@e.com', senha: 'senhaForte123' })

    expect(store.ehCasal).toBe(false)
    expect(store.casamentoDoCasal).toBeNull()
  })

  it('[UNITÁRIO] interpreta 422 do convite como link inválido e 422 de senha como erro do campo', () => {
    const invalido = new ErroApi('x', 422, { detail: 'Este convite não vale mais.' })
    const senha = new ErroApi('x', 422, { detail: 'A senha não pode ser igual ao e-mail.' })

    expect(interpretarFalhaConviteCasal(invalido).tipo).toBe('linkInvalido')
    expect(interpretarFalhaConviteCasal(senha)).toEqual({ ok: false, tipo: 'validacao', errosCampos: { senha: 'A senha não pode ser igual ao e-mail.' } })
    expect(interpretarFalhaConviteCasal(new ErroApi('x', 429, null)).tipo).toBe('limite')
  })

  it('[UNITÁRIO] consulta do convite devolve o tipo da falha', async () => {
    const store = useAutenticacaoStore()
    fetchSimulado.mockResolvedValueOnce(respostaProblema(422, { detail: 'Este convite não vale mais.' }))

    const resultado = await store.consultarConviteCasal('token')

    expect(resultado).toEqual({ ok: false, tipo: 'linkInvalido' })
    expect(fetchSimulado.mock.calls[0]![0]).toBe('/api/acesso-casal/consulta')
  })
})
