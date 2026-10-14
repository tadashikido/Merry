function plural(quantidade: number, singular: string, varios: string): string {
  return quantidade === 1 ? singular : varios
}

export const TEXTOS_GRANDE_DIA = {
  titulo: 'Grande Dia',
  tituloDocumento: (nomes: string) => `Grande Dia · ${nomes}`,
  subtitulo: 'Grande Dia',
  aoVivo: 'Ao vivo',
  faltamDias: (dias: number) => {
    if (dias === 1) {
      return 'É amanhã'
    }
    return `Faltam ${dias} ${plural(dias, 'dia', 'dias')}`
  },
  diaPassou: 'Já passou',
  relogio: (hora: string) => `Agora são ${hora}`,
  agora: 'Agora',
  desdeAte: (inicio: string, termino: string) => `Desde ${inicio} · até ${termino}`,
  desde: (inicio: string) => `Desde ${inicio}`,
  tambemAgora: 'Também agora',
  nadaAgora: 'Nada em andamento agora',
  nadaAgoraTexto: 'O próximo item do roteiro aparece logo abaixo.',
  proximo: 'Próximo',
  proximoEm: (quando: string) => `Próximo · ${quando}`,
  emMinutos: (minutos: number) => {
    if (minutos <= 0) {
      return 'começando agora'
    }
    if (minutos < 60) {
      return `em ${minutos} min`
    }
    const horas = Math.floor(minutos / 60)
    const resto = minutos % 60
    return resto === 0 ? `em ${horas} h` : `em ${horas} h ${String(resto).padStart(2, '0')}`
  },
  semProximo: 'Nada mais no roteiro',
  depois: 'Depois',
  semMarcar: (quantidade: number) => `Ficou sem marcar (${quantidade})`,
  feitos: (quantidade: number) => `Feitos (${quantidade})`,
  feitoAs: (hora: string) => `Feito às ${hora}`,
  feito: 'Feito',
  marcarFeito: 'Marcar como feito',
  marcarFeitoAria: (atividade: string) => `Marcar “${atividade}” como feito`,
  marcarFeitoCurto: 'Feito',
  reabrir: 'Reabrir',
  reabrirAria: (atividade: string) => `Reabrir “${atividade}”`,
  sucessoFeito: (atividade: string) => `${atividade} marcada como feita.`,
  sucessoReaberto: (atividade: string) => `${atividade} voltou para o roteiro.`,
  conflito: 'Este item acabou de ser atualizado em outro aparelho. A tela foi atualizada.',
  erroAcao: 'Não foi possível salvar. Verifique a conexão e tente de novo.',
  arquivadoAcao: 'Casamento arquivado: o Grande Dia está somente para leitura.',
  ligar: 'Ligar',
  ligarAria: (nome: string) => `Ligar para ${nome}`,
  whatsapp: 'WhatsApp',
  whatsappAria: (nome: string) => `Abrir o WhatsApp de ${nome}`,
  contatos: (nome: string) => `Contato de ${nome}`,
  antesTitulo: 'O grande dia ainda não chegou',
  antesTexto: 'O roteiro abaixo é o planejado. No dia, esta tela mostra o que está acontecendo agora.',
  depoisTitulo: 'O grande dia já passou',
  depoisTexto: 'Este é o roteiro como ficou registrado.',
  vazioTitulo: 'O roteiro ainda está vazio',
  vazioTexto: 'Monte o cronograma do dia para acompanhar tudo por aqui.',
  vazioTextoCasal: 'A assessoria ainda está montando o roteiro do dia.',
  montarCronograma: 'Montar o cronograma',
  erroTitulo: 'Não foi possível abrir o Grande Dia',
  erroTexto: 'Verifique a conexão e tente de novo.',
  semPermissaoTitulo: 'Você não tem acesso a este Grande Dia',
  semPermissaoTexto: 'Peça acesso à assessoria do casamento.',
  naoEncontradoTitulo: 'Casamento não encontrado',
  naoEncontradoTexto: 'O casamento pode ter sido removido ou o endereço está incorreto.',
  voltarCasamentos: 'Voltar para casamentos',
  voltarNossoCasamento: 'Voltar para o nosso casamento',
  atualizadoAs: (hora: string) => `Atualizado às ${hora}`,
  atualizar: 'Atualizar',
  atualizando: 'Atualizando…',
  semConexao: (hora: string) => `Sem conexão. Mostrando a versão das ${hora}.`,
  roteiro: 'Roteiro do dia',
} as const
