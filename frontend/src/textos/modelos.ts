function numero(valor: number): string {
  return valor.toLocaleString('pt-BR')
}

function contar(quantidade: number, singular: string, plural: string): string {
  return `${numero(quantidade)} ${quantidade === 1 ? singular : plural}`
}

export const TEXTOS_MODELOS_POR_TIPO = {
  grupoQualquerTitulo: 'Para qualquer tipo de evento',
  grupoOutrosTitulo: 'Outros tipos de evento',
  quantidade: (quantidade: number) => contar(quantidade, 'modelo', 'modelos'),
  notaTipo: (recurso: string, singular: string) => `Na lista ao aplicar o ${recurso} de cada ${singular}.`,
  notaQualquer: (recurso: string) => `Na lista ao aplicar o ${recurso} de qualquer evento.`,
  notaOutros: 'De um tipo que esta tela ainda não reconhece. Só aparece nos eventos desse tipo.',
  sugeridoPara: (singular: string) => `Sugerido para ${singular}`,
  origemAssessoria: 'Modelo da assessoria',
  coberturaTitulo: 'Por tipo de evento',
  coberturaApoio: (recurso: string) => `O que a equipe vê ao aplicar o ${recurso}.`,
  comSugerido: (singular: string) => `Inclui o sugerido para ${singular}.`,
  comEspecificos: (quantidade: number) => `Inclui ${numero(quantidade)} só deste tipo.`,
  soQualquer: 'Só os modelos para qualquer tipo.',
  nenhum: 'Nenhum modelo. Um modelo novo vale para todos os tipos.',
  reaproveitamentoTitulo: 'Como os modelos são reaproveitados',
} as const
