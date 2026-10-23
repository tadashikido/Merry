import { describe, expect, it } from 'vitest'

import { painelExemplo } from '@/__tests__/auxiliaresConfirmacoes'
import { TEXTOS_FICHA_BUFFET, TEXTOS_PROXIMOS_PASSOS_CONFIRMACOES as TEXTOS } from '@/textos/confirmacoes'
import type { ConvitePendenteDto } from '@/tipos/confirmacoes'
import { proximosPassosConfirmacoes } from '@/utilitarios/painelConfirmacoes'

const AGORA = new Date(2027, 4, 2, 15, 0)

function pendente(id: string, dados: Partial<ConvitePendenteDto> = {}): ConvitePendenteDto {
  return {
    conviteId: id,
    nome: `Convite ${id}`,
    grupo: null,
    statusEnvio: 'Enviado',
    telefone: '11987654321',
    pessoasPendentes: ['Pessoa'],
    totalPessoas: 1,
    cobravel: true,
    ultimaCobrancaEm: null,
    quantidadeCobrancas: 0,
    ...dados,
  }
}

describe('proximosPassosConfirmacoes', () => {
  it('[UNITÁRIO] separa os pendentes em categorias exclusivas na ordem a enviar → sem lembrete → já lembrados', () => {
    const painel = painelExemplo({
      pendentes: [
        pendente('a', { statusEnvio: 'NaoEnviado', cobravel: false }),
        pendente('b', { statusEnvio: 'Visualizado' }),
        pendente('c'),
        pendente('d', { ultimaCobrancaEm: '2027-04-20T12:00:00Z', quantidadeCobrancas: 2 }),
        pendente('e', { cobravel: false }),
      ],
    })

    const situacao = proximosPassosConfirmacoes(painel, '2027-05-22', AGORA)

    expect(situacao.passos).toEqual([
      { chave: 'aEnviar', quantidade: 1 },
      { chave: 'semLembrete', quantidade: 2 },
      { chave: 'jaLembrados', quantidade: 1 },
    ])
    expect(situacao.visualizadosSemLembrete).toBe(1)
  })

  it('[UNITÁRIO] omite passos zerados e conta lembretes de hoje', () => {
    const painel = painelExemplo({
      pendentes: [pendente('a', { ultimaCobrancaEm: new Date(2027, 4, 2, 9, 0).toISOString(), quantidadeCobrancas: 1 })],
    })

    const situacao = proximosPassosConfirmacoes(painel, null, AGORA)

    expect(situacao.passos).toEqual([{ chave: 'jaLembrados', quantidade: 1 }])
    expect(situacao.lembradosHoje).toBe(1)
  })

  it('[UNITÁRIO] máximo soma confirmadas e sem resposta, nunca recusadas', () => {
    const situacao = proximosPassosConfirmacoes(painelExemplo(), null, AGORA)

    expect(situacao.confirmadas).toBe(4)
    expect(situacao.semResposta).toBe(1)
    expect(situacao.maximo).toBe(5)
  })

  it('[UNITÁRIO] dias entre prazo e evento por datas de calendário; nulo sem evento ou com prazo depois do evento', () => {
    const painel = painelExemplo({ prazo: { dataLimite: '2027-05-12', diasRestantes: 5, aceitaRespostas: true } })

    expect(proximosPassosConfirmacoes(painel, '2027-05-22', AGORA).diasPrazoAntesDoEvento).toBe(10)
    expect(proximosPassosConfirmacoes(painel, '2027-05-12', AGORA).diasPrazoAntesDoEvento).toBe(0)
    expect(proximosPassosConfirmacoes(painel, '2027-05-10', AGORA).diasPrazoAntesDoEvento).toBeNull()
    expect(proximosPassosConfirmacoes(painel, null, AGORA).diasPrazoAntesDoEvento).toBeNull()
  })
})

describe('textos de confirmações', () => {
  it('[UNITÁRIO] restrições ilegíveis concordam no singular e no plural', () => {
    expect(TEXTOS_FICHA_BUFFET.ilegiveis(1)).toBe('1 restrição não pôde ser lida. Fale com o suporte.')
    expect(TEXTOS_FICHA_BUFFET.ilegiveis(3)).toBe('3 restrições não puderam ser lidas. Fale com o suporte.')
  })

  it('[UNITÁRIO] frases do bloco concordam em número', () => {
    expect(TEXTOS.prazoAntes(1, 'do aniversário')).toBe('O prazo de respostas fecha 1 dia antes do aniversário.')
    expect(TEXTOS.prazoAntes(0, 'da comemoração')).toBe('O prazo de respostas fecha no dia da comemoração.')
    expect(TEXTOS.aEnviar(1)).toBe('1 convite para enviar')
    expect(TEXTOS.aEnviarApoio(2)).toBe('Ainda não saíram. Envie pela lista.')
    expect(TEXTOS.visualizaram(1)).toBe('1 já abriu o convite; um lembrete costuma bastar.')
    expect(TEXTOS.jaLembrados(2)).toBe('2 convites já lembrados')
    expect(TEXTOS.prazoEncerrado(1)).toContain('com 1 pessoa sem resposta')
    expect(TEXTOS.confirmadas(1)).toBe('confirmada')
  })
})
