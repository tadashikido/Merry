import { describe, expect, it } from 'vitest'

import { TEXTOS_MODELOS_CHECKLIST, complementoMarcoModelo, descreverPrazoRelativo } from '@/textos/checklist'
import {
  REFERENCIA_QUALQUER_EVENTO,
  TEXTOS_MODELOS_POR_TIPO,
  abrirEventoDoModelo,
  exemploAtividadeItem,
  exemplosItemCronograma,
  MOMENTO_QUALQUER_EVENTO,
  exemplosNomeModelo,
  momentoDoModelo,
  ondeApareceModelo,
  referenciaDoModelo,
  rotuloSugeridoDoModelo,
} from '@/textos/modelos'
import { TEXTOS_MODELOS_CRONOGRAMA, dicasModeloCronograma, momentosPrincipaisEmFrase, rotuloLocalModelo } from '@/textos/modelosCronograma'
import type { TipoEvento } from '@/tipos/eventos'

const TIPO_DESCONHECIDO = 'Formatura' as unknown as TipoEvento

describe('textos de modelos por tipo', () => {
  it.each([
    ['Casamento', 'do casamento', 'Sugerido para casamento', 'Na lista ao aplicar o checklist de cada casamento.', 'Abra um casamento e entre em Checklist.'],
    ['QuinzeAnos', 'da festa de 15 anos', 'Sugerido para festa de 15 anos', 'Na lista ao aplicar o checklist de cada festa de 15 anos.', 'Abra uma festa de 15 anos e entre em Checklist.'],
    ['Aniversario', 'do aniversário', 'Sugerido para aniversário', 'Na lista ao aplicar o checklist de cada aniversário.', 'Abra um aniversário e entre em Checklist.'],
    ['Comemoracao', 'da comemoração', 'Sugerido para comemoração', 'Na lista ao aplicar o checklist de cada comemoração.', 'Abra uma comemoração e entre em Checklist.'],
  ] as const)('[UNITÁRIO] %s usa o vocabulário do tipo', (tipo, contracaoDe, selo, onde, abrir) => {
    expect(referenciaDoModelo(tipo).contracaoDe).toBe(contracaoDe)
    expect(rotuloSugeridoDoModelo(tipo, 'Sugerido')).toBe(selo)
    expect(ondeApareceModelo(tipo, 'checklist')).toBe(onde)
    expect(abrirEventoDoModelo(tipo)).toBe(abrir)
  })

  it('[UNITÁRIO] modelo sem tipo usa referência neutra de qualquer evento, nunca casamento nem comemoração', () => {
    expect(referenciaDoModelo(null)).toEqual(REFERENCIA_QUALQUER_EVENTO)
    expect(referenciaDoModelo(null).contracaoDe).toBe('do evento')
    expect(rotuloSugeridoDoModelo(null, 'Sugerido')).toBe('Sugerido')
    expect(ondeApareceModelo(null, 'checklist')).toBe(TEXTOS_MODELOS_POR_TIPO.notaQualquer('checklist'))
    expect(abrirEventoDoModelo(null)).toBe(TEXTOS_MODELOS_POR_TIPO.abrirQualquerEvento())
  })

  it('[UNITÁRIO] tipo desconhecido usa referência neutra e o texto de tipo não reconhecido', () => {
    expect(referenciaDoModelo(TIPO_DESCONHECIDO).contracaoDe).toBe('do evento')
    expect(rotuloSugeridoDoModelo(TIPO_DESCONHECIDO, 'Sugerido')).toBe('Sugerido')
    expect(ondeApareceModelo(TIPO_DESCONHECIDO, 'checklist')).toBe(TEXTOS_MODELOS_POR_TIPO.notaOutros)
    expect(abrirEventoDoModelo(TIPO_DESCONHECIDO)).toBe(TEXTOS_MODELOS_POR_TIPO.abrirEventoOutroTipo())
  })

  it('[UNITÁRIO] complemento do marco fala da data do tipo', () => {
    expect(complementoMarcoModelo('dozeMeses', 'da festa de 15 anos')).toBe('ou mais antes da festa de 15 anos')
    expect(complementoMarcoModelo('seisMeses', 'do aniversário')).toBe('antes do aniversário')
    expect(complementoMarcoModelo('trintaDias', 'do evento')).toBe('antes do evento')
    expect(complementoMarcoModelo('retaFinal', 'do casamento')).toBe('último mês')
    expect(complementoMarcoModelo('noDia', 'da comemoração')).toBe('da comemoração')
    expect(complementoMarcoModelo('depois', 'do evento')).toBe('do evento')
    expect(complementoMarcoModelo('semPrazo', 'do evento')).toBeNull()
  })

  it('[UNITÁRIO] prazo no evento e passos de aplicação', () => {
    expect(TEXTOS_MODELOS_CHECKLIST.prazoNoEvento(400, 'do casamento')).toBe('400 dias antes do casamento')
    expect(TEXTOS_MODELOS_CHECKLIST.prazoNoEvento(1, 'do evento')).toBe('1 dia antes do evento')
    expect(TEXTOS_MODELOS_CHECKLIST.prazoNoEvento(0, 'da festa de 15 anos')).toBe('No dia da festa de 15 anos')
    expect(TEXTOS_MODELOS_CHECKLIST.prazoNoEvento(-1095, 'do aniversário')).toBe('1.095 dias depois do aniversário')
    expect(descreverPrazoRelativo(0, 'do aniversário')).toBe('No dia do aniversário')
    expect(TEXTOS_MODELOS_CHECKLIST.passosAplicar('Essencial', 'da comemoração')).toEqual([
      'Em Aplicar checklist ou Aplicar outro modelo, escolha “Essencial”. A prévia mostra quantas tarefas serão criadas.',
      'Cada item vira uma tarefa com prazo contado a partir da data da comemoração. O que já passou entra atrasado.',
    ])
  })

  it('[UNITÁRIO] destino do passo de abrir o evento é parametrizável com Checklist como padrão', () => {
    expect(abrirEventoDoModelo('QuinzeAnos', 'Cronograma')).toBe('Abra uma festa de 15 anos e entre em Cronograma.')
    expect(abrirEventoDoModelo('Aniversario', 'Cronograma')).toBe('Abra um aniversário e entre em Cronograma.')
    expect(abrirEventoDoModelo(null, 'Cronograma')).toBe('Abra qualquer evento e entre em Cronograma.')
    expect(abrirEventoDoModelo(TIPO_DESCONHECIDO, 'Cronograma')).toBe('Abra um evento desse tipo e entre em Cronograma.')
    expect(abrirEventoDoModelo(null)).toBe('Abra qualquer evento e entre em Checklist.')
  })

  it('[UNITÁRIO] exemplos de nome cobrem os 4 tipos na ordem do vocabulário', () => {
    expect(exemplosNomeModelo()).toEqual([
      { tipo: 'Casamento', rotulo: 'Casamento', exemplo: 'Casamento no campo' },
      { tipo: 'QuinzeAnos', rotulo: '15 anos', exemplo: '15 anos com baile' },
      { tipo: 'Aniversario', rotulo: 'Aniversário', exemplo: 'Aniversário infantil' },
      { tipo: 'Comemoracao', rotulo: 'Comemoração', exemplo: 'Bodas de prata' },
    ])
  })

  it('[UNITÁRIO] dicas e próximos passos do formulário falam da data do tipo', () => {
    expect(TEXTOS_MODELOS_CHECKLIST.dicasModelo('da festa de 15 anos')[1]).toBe(
      'Os itens entram no detalhe do modelo, cada um com prazo em dias antes ou depois da data da festa de 15 anos.',
    )
    expect(TEXTOS_MODELOS_CHECKLIST.dicasModelo('do evento')[1]).toContain('data do evento')
    expect(TEXTOS_MODELOS_CHECKLIST.depoisDeCriarAplicar('do evento')).toBe(
      'Em Aplicar checklist ou Aplicar outro modelo, escolha este modelo. Cada item vira uma tarefa com prazo contado a partir da data do evento.',
    )
    expect(TEXTOS_MODELOS_POR_TIPO.edicaoNaoMudaAplicados('checklist')).toBe(
      'Mudar o nome ou a descrição não altera o checklist dos eventos que já aplicaram este modelo.',
    )
  })

  it.each([
    ['Casamento', 'a cerimônia', 'da cerimônia', 'à cerimônia', 'Cerimônia', 'Local da cerimônia', 'Local da recepção'],
    ['QuinzeAnos', 'a festa', 'da festa', 'à festa', 'Festa', 'Local da festa', 'Outro local'],
    ['Aniversario', 'a festa', 'da festa', 'à festa', 'Festa', 'Local da festa', 'Outro local'],
    ['Comemoracao', 'o evento', 'do evento', 'ao evento', 'Evento', 'Local do evento', 'Outro local'],
    [null, 'o evento', 'do evento', 'ao evento', 'Evento', 'Local principal', 'Outro local'],
    [TIPO_DESCONHECIDO, 'o evento', 'do evento', 'ao evento', 'Evento', 'Local principal', 'Outro local'],
  ] as const)('[UNITÁRIO] momento e locais do modelo de cronograma para %s', (tipo, artigo, contracaoDe, relativo, rotulo, principal, secundario) => {
    const momento = momentoDoModelo(tipo as TipoEvento | null)

    expect(momento.artigo).toBe(artigo)
    expect(momento.contracaoDe).toBe(contracaoDe)
    expect(momento.relativoAoMomento).toBe(relativo)
    expect(TEXTOS_MODELOS_CRONOGRAMA.rotuloMomento(momento.nome)).toBe(rotulo)
    expect(TEXTOS_MODELOS_CRONOGRAMA.momentoTitulo(momento.relativoAoMomento)).toBe(`Em relação ${relativo}`)
    expect(rotuloLocalModelo('Cerimonia', tipo as TipoEvento | null)).toBe(principal)
    expect(rotuloLocalModelo('Recepcao', tipo as TipoEvento | null)).toBe(secundario)
    expect(rotuloLocalModelo('Outro', tipo as TipoEvento | null)).toBe('Outro')
  })

  it('[UNITÁRIO] textos do detalhe de cronograma usam o momento sem cerimônia como padrão', () => {
    expect(momentoDoModelo(undefined)).toEqual(MOMENTO_QUALQUER_EVENTO)
    expect(TEXTOS_MODELOS_CRONOGRAMA.apoioReferencia('16:00')).toBe(
      'Horários de exemplo, com o evento às 16:00. Ao aplicar, tudo acompanha o horário marcado no evento.',
    )
    expect(TEXTOS_MODELOS_CRONOGRAMA.itensVazioTextoPara('da festa')).toBe('Comece pela hora da festa e acrescente o que vem antes e depois.')
    expect(TEXTOS_MODELOS_CRONOGRAMA.passosAplicar('Roteiro', 'da festa')).toEqual([
      'Em Aplicar modelo, escolha “Roteiro”. A prévia mostra quantos itens entram e o primeiro e o último horário.',
      'Os horários contam a partir do horário da festa marcado no evento. Se ele ainda não tiver, a tela pede para adicionar.',
    ])
    expect(abrirEventoDoModelo('Aniversario', 'Cronograma')).toBe('Abra um aniversário e entre em Cronograma.')
    expect(TEXTOS_MODELOS_CRONOGRAMA.semNinguem(1)).toBe('1 item sem responsável nem fornecedor.')
    expect(TEXTOS_MODELOS_CRONOGRAMA.duracaoRoteiro('32 h')).toBe('32 h de roteiro')
  })

  it.each([
    ['Casamento', 'Horário de referência da cerimônia', 'até a cerimônia', 'depois da cerimônia', 'horário da cerimônia marcado'],
    ['QuinzeAnos', 'Horário de referência da festa', 'até a festa', 'depois da festa', 'horário da festa marcado'],
    ['Aniversario', 'Horário de referência da festa', 'até a festa', 'depois da festa', 'horário da festa marcado'],
    ['Comemoracao', 'Horário de referência do evento', 'até o evento', 'depois do evento', 'horário do evento marcado'],
  ] as const)('[UNITÁRIO] formulário de modelo de cronograma %s fala do momento do tipo', (tipo, rotulo, dica, dicaItens, dicaAplicar) => {
    const momento = momentoDoModelo(tipo)
    expect(TEXTOS_MODELOS_CRONOGRAMA.campoReferenciaPara(momento.contracaoDe)).toBe(rotulo)
    expect(TEXTOS_MODELOS_CRONOGRAMA.dicaReferenciaPara(momento.artigo)).toContain(dica)
    const dicas = dicasModeloCronograma(tipo)
    expect(dicas).toHaveLength(3)
    expect(dicas[1]).toContain(dicaItens)
    expect(dicas[2]).toContain(dicaAplicar)
  })

  it.each([
    ['nulo', null],
    ['desconhecido', TIPO_DESCONHECIDO],
  ] as const)('[UNITÁRIO] formulário de modelo de cronograma com tipo %s fala do evento e lista os momentos por tipo', (_, tipo) => {
    const momento = momentoDoModelo(tipo)
    expect(TEXTOS_MODELOS_CRONOGRAMA.campoReferenciaPara(momento.contracaoDe)).toBe('Horário de referência do evento')
    expect(TEXTOS_MODELOS_CRONOGRAMA.dicaReferenciaPara(momento.artigo)).not.toMatch(/cerimônia|casamento|comemoração/i)
    const dicas = dicasModeloCronograma(tipo)
    expect(dicas.slice(0, 2).join(' ')).not.toMatch(/cerimônia|casamento|comemoração/i)
    expect(dicas[2]).toBe(`Ao aplicar, os horários contam a partir do momento principal de cada evento: ${momentosPrincipaisEmFrase()}.`)
  })

  it('[UNITÁRIO] criação de modelo de cronograma não trata cerimônia como conceito geral', () => {
    expect(TEXTOS_MODELOS_CRONOGRAMA.formNovoDescricao).not.toMatch(/cerimônia|casamento/i)
    expect(TEXTOS_MODELOS_CRONOGRAMA.depoisDeCriarItens).not.toMatch(/cerimônia|casamento/i)
    expect(TEXTOS_MODELOS_CRONOGRAMA.depoisDeCriarAplicar).toContain('Aplicar modelo')
    expect(TEXTOS_MODELOS_CRONOGRAMA.depoisDeCriarAplicar).not.toMatch(/cerimônia|casamento/i)
  })

  it.each([
    ['Casamento', 'Entrada dos padrinhos', 'da cerimônia'],
    ['QuinzeAnos', 'Valsa com a corte', 'da festa'],
    ['Aniversario', 'Abertura da festa', 'da festa'],
    ['Comemoracao', 'Brinde de homenagem', 'do evento'],
  ] as const)('[UNITÁRIO] exemplos de item de cronograma de %s vêm do vocabulário com o momento do tipo', (tipo, atividade, contracao) => {
    const exemplos = exemplosItemCronograma(tipo)
    expect(exemplos).toHaveLength(3)
    expect(exemplos.every((exemplo) => exemplo.tipoRotulo === null && exemplo.contracaoMomento === contracao)).toBe(true)
    expect(exemploAtividadeItem(tipo)).toBe(atividade)
  })

  it.each(['QuinzeAnos', 'Aniversario', 'Comemoracao'] as const)('[UNITÁRIO] exemplos de cronograma de %s não falam de noivos nem padrinhos', (tipo) => {
    expect(exemplosItemCronograma(tipo).map((exemplo) => exemplo.titulo).join(' ')).not.toMatch(/noiv|padrinh|casamento/i)
  })

  it.each([
    ['nulo', null],
    ['desconhecido', TIPO_DESCONHECIDO],
  ] as const)('[UNITÁRIO] sem tipo %s os exemplos de cronograma trazem um por tipo e a atividade é neutra', (_, tipo) => {
    const exemplos = exemplosItemCronograma(tipo)
    expect(exemplos.map((exemplo) => exemplo.tipoRotulo)).toEqual(['Casamento', '15 anos', 'Aniversário', 'Comemoração'])
    expect(exemplos.map((exemplo) => exemplo.contracaoMomento)).toEqual(['da cerimônia', 'da festa', 'da festa', 'do evento'])
    expect(exemploAtividadeItem(tipo)).toBe('Recepção dos convidados')
  })
})
