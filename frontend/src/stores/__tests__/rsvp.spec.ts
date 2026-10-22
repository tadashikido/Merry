import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { corpoDaChamada, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { interpretarFalhaRsvp, useRsvpStore } from '@/stores/rsvp'
import type { RsvpPublicoDto } from '@/tipos/rsvp'
import { ErroApi } from '@/servicos/clienteHttp'

const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde'

const DADOS: RsvpPublicoDto = {
  evento: { tipo: 'Casamento', nomePrimeiraPessoa: 'Ana', nomeSegundaPessoa: 'Bruno', data: '2027-05-22', horario: null, localCerimonia: null, localRecepcao: null },
  nomeConvite: 'Família Souza',
  limiteAcompanhantes: 0,
  dataLimiteResposta: '2027-05-12',
  podeResponder: true,
  respondidoEm: null,
  pessoas: [{ id: 'p1', nome: 'Célia', faixaEtaria: 'Adulto', resposta: 'Pendente', possuiRestricao: false }],
  acompanhantes: [],
  privacidade: { versaoTermo: '2026-09-29', diasRetencao: 30 },
}

let fetchSimulado: ReturnType<typeof simularFetch>

beforeEach(() => {
  setActivePinia(createPinia())
  fetchSimulado = simularFetch()
  registrarProvedorAutenticacao({ obterToken: () => 'token-da-cerimonialista', renovar: async () => false })
})

afterEach(() => {
  registrarProvedorAutenticacao(null)
})

describe('store rsvp', () => {
  it('[SEGURANÇA] consulta com token no corpo, sem Authorization e sem token na URL', async () => {
    fetchSimulado.mockResolvedValue(respostaJson(DADOS))
    const store = useRsvpStore()

    await store.consultar(TOKEN)

    const [url, init] = fetchSimulado.mock.calls[0]!
    expect(String(url)).toBe('/api/rsvp/consulta')
    expect(String(url)).not.toContain(TOKEN)
    expect(init?.method).toBe('POST')
    expect((init?.headers as Record<string, string>).Authorization).toBeUndefined()
    expect(corpoDaChamada(fetchSimulado.mock.calls[0]!)).toEqual({ token: TOKEN })
    expect(store.dados?.nomeConvite).toBe('Família Souza')
  })

  it('[INTEGRAÇÃO] responde com PUT e atualiza os dados', async () => {
    fetchSimulado.mockResolvedValue(respostaJson({ ...DADOS, respondidoEm: '2026-10-01T12:00:00Z' }))
    const store = useRsvpStore()

    const resultado = await store.responder({ token: TOKEN, pessoas: [{ id: 'p1', resposta: 'Confirmado' }], acompanhantes: [] })

    expect(resultado.ok).toBe(true)
    expect(fetchSimulado.mock.calls[0]![1]?.method).toBe('PUT')
    expect(store.dados?.respondidoEm).toBe('2026-10-01T12:00:00Z')
    expect(store.enviando).toBe(false)
  })

  it('[UNITÁRIO] 404 vira link inativo e limpa os dados', async () => {
    fetchSimulado.mockResolvedValue(respostaProblema(404, { title: 'Recurso não encontrado.' }))
    const store = useRsvpStore()

    await store.consultar(TOKEN)

    expect(store.falha?.tipo).toBe('linkInativo')
    expect(store.dados).toBeNull()
  })

  it('[UNITÁRIO] mapeia os códigos de erro', () => {
    expect(interpretarFalhaRsvp(new ErroApi('x', 0, null)).tipo).toBe('conexao')
    expect(interpretarFalhaRsvp(new ErroApi('x', 400, null)).tipo).toBe('validacao')
    expect(interpretarFalhaRsvp(new ErroApi('x', 409, null)).tipo).toBe('conflito')
    expect(interpretarFalhaRsvp(new ErroApi('x', 422, { detail: 'Prazo' }))).toEqual({ tipo: 'regra', mensagem: 'Prazo' })
    expect(interpretarFalhaRsvp(new ErroApi('x', 429, null)).tipo).toBe('muitasTentativas')
    expect(interpretarFalhaRsvp(new ErroApi('x', 500, null)).tipo).toBe('inesperado')
    expect(interpretarFalhaRsvp(new Error('x')).tipo).toBe('inesperado')
  })

  it('[UNITÁRIO] falha de rede no envio devolve conexao', async () => {
    fetchSimulado.mockRejectedValue(new TypeError('rede'))
    const store = useRsvpStore()

    const resultado = await store.responder({ token: TOKEN, pessoas: [], acompanhantes: [] })

    expect(resultado).toEqual({ ok: false, falha: { tipo: 'conexao', mensagem: expect.any(String) } })
  })
})
