import { describe, expect, it } from 'vitest'

import { TEXTOS_MODELOS_CHECKLIST, complementoMarcoModelo, descreverPrazoRelativo } from '@/textos/checklist'
import {
  REFERENCIA_QUALQUER_EVENTO,
  TEXTOS_MODELOS_POR_TIPO,
  abrirEventoDoModelo,
  exemplosNomeModelo,
  ondeApareceModelo,
  referenciaDoModelo,
  rotuloSugeridoDoModelo,
} from '@/textos/modelos'
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
})
