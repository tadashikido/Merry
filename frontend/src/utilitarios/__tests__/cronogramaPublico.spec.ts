import { describe, expect, it } from 'vitest'

import { TOKEN_CRONOGRAMA, cronogramaPublico, destino, itemPublico } from '@/__tests__/auxiliaresCronogramaPublico'
import {
  agruparRoteiro,
  chaveDestino,
  ehHorarioDaCerimonia,
  montarMensagemCronograma,
  montarUrlCronogramaPublico,
  montarWhatsAppCronograma,
  requestDoDestino,
  rotuloCategoria,
  rotuloDestino,
  rotuloFiltro,
  situacaoDestino,
  tokenCronogramaValido,
} from '@/utilitarios/cronogramaPublico'

const EVENTO = { nomePrimeiraPessoa: 'Ana', nomeSegundaPessoa: 'Bruno', data: '2027-05-15' }

describe('utilitários do cronograma público', () => {
  it('[UNITÁRIO] aceita só tokens de 43 caracteres base64url', () => {
    expect(tokenCronogramaValido(TOKEN_CRONOGRAMA)).toBe(true)
    expect(tokenCronogramaValido(`${TOKEN_CRONOGRAMA}x`)).toBe(false)
    expect(tokenCronogramaValido(`${TOKEN_CRONOGRAMA.slice(0, 42)}/`)).toBe(false)
    expect(tokenCronogramaValido(undefined)).toBe(false)
  })

  it('[UNITÁRIO] monta a URL pública /cronograma/{token}', () => {
    expect(montarUrlCronogramaPublico(TOKEN_CRONOGRAMA, 'https://app.exemplo.com.br/')).toBe(
      `https://app.exemplo.com.br/cronograma/${TOKEN_CRONOGRAMA}`,
    )
  })

  it('[UNITÁRIO] mensagem geral fala do cronograma e filtrada fala dos seus horários', () => {
    const url = 'https://app/cronograma/x'
    const geral = montarMensagemCronograma(EVENTO, { tipo: 'Geral' }, url)
    const filtrada = montarMensagemCronograma(EVENTO, { tipo: 'Fornecedor' }, url)

    expect(geral).toContain('cronograma do evento de Ana & Bruno (15 de maio de 2027)')
    expect(geral).toContain(url)
    expect(filtrada).toContain('seus horários no evento de Ana & Bruno')
  })

  it('[SEGURANÇA] WhatsApp usa o telefone só no destino de fornecedor', () => {
    const url = 'https://app/cronograma/x'

    expect(montarWhatsAppCronograma(EVENTO, { tipo: 'Fornecedor', telefone: '11987654321' }, url)).toMatch(
      /^https:\/\/wa\.me\/5511987654321\?text=/,
    )
    expect(montarWhatsAppCronograma(EVENTO, { tipo: 'Responsavel', telefone: '11987654321' }, url)).toMatch(/^https:\/\/wa\.me\/\?text=/)
    expect(montarWhatsAppCronograma(EVENTO, { tipo: 'Fornecedor', telefone: null }, url)).toMatch(/^https:\/\/wa\.me\/\?text=/)
    expect(decodeURIComponent(montarWhatsAppCronograma(EVENTO, { tipo: 'Geral', telefone: null }, url))).toContain(url)
  })

  it('[UNITÁRIO] agrupa por dia na ordem véspera, dia, dia seguinte e titula com a data', () => {
    const grupos = agruparRoteiro(cronogramaPublico().itens)

    expect(grupos.map((grupo) => grupo.dia)).toEqual(['Vespera', 'DiaDoEvento'])
    expect(grupos[0]!.titulo).toBe('Véspera · sexta-feira, 14 de maio de 2027')
    expect(grupos[1]!.titulo).toBe('Dia do evento')
    expect(agruparRoteiro([itemPublico({ dia: 'DiaSeguinte', data: '2027-05-16' })])[0]!.titulo).toContain('Dia seguinte · domingo')
    expect(agruparRoteiro([])).toEqual([])
  })

  it('[UNITÁRIO] identifica o item no horário da cerimônia só no dia do evento', () => {
    expect(ehHorarioDaCerimonia({ dia: 'DiaDoEvento', inicio: '16:30' }, '16:30')).toBe(true)
    expect(ehHorarioDaCerimonia({ dia: 'Vespera', inicio: '16:30' }, '16:30')).toBe(false)
    expect(ehHorarioDaCerimonia({ dia: 'DiaDoEvento', inicio: '16:30' }, null)).toBe(false)
  })

  it('[UNITÁRIO] rótulos de filtro, destino, categoria e situação', () => {
    expect(rotuloFiltro(cronogramaPublico())).toBe('Seus horários · Buffet Sabor')
    expect(rotuloFiltro(cronogramaPublico({ filtro: { tipo: 'Geral', rotulo: null, categoria: null } }))).toBe('Equipe completa')
    expect(rotuloDestino(destino())).toBe('Equipe completa')
    expect(rotuloDestino(destino({ tipo: 'Fornecedor', rotulo: 'Buffet' }))).toBe('Buffet')
    expect(rotuloCategoria('EspacoLocal')).toBe('Espaço e local')
    expect(rotuloCategoria('Desconhecida')).toBe('Desconhecida')
    expect(rotuloCategoria(null)).toBeNull()
    expect(situacaoDestino(destino())).toBe('semLink')
    expect(situacaoDestino(destino({ link: { id: 'l', token: 'x', geradoEm: '' } }))).toBe('ativo')
    expect(situacaoDestino(destino({ link: { id: 'l', token: null, geradoEm: '' } }))).toBe('indisponivel')
  })

  it('[UNITÁRIO] request e chave do destino nunca misturam fornecedor e responsável', () => {
    expect(requestDoDestino(destino())).toEqual({ tipo: 'Geral' })
    expect(requestDoDestino(destino({ tipo: 'Fornecedor', fornecedorEventoId: 'v1', responsavel: 'x' }))).toEqual({
      tipo: 'Fornecedor',
      fornecedorEventoId: 'v1',
    })
    expect(requestDoDestino(destino({ tipo: 'Responsavel', responsavel: 'Fernanda' }))).toEqual({ tipo: 'Responsavel', responsavel: 'Fernanda' })
    expect(chaveDestino(destino({ tipo: 'Fornecedor', fornecedorEventoId: 'v1' }))).toBe('fornecedor:v1')
    expect(chaveDestino(destino({ tipo: 'Responsavel', responsavel: 'Fernanda' }))).toBe('responsavel:Fernanda')
    expect(chaveDestino(destino())).toBe('geral')
  })
})
