import type { TextosEnvioArquivo } from '@/componentes/base/tipos'
import type { SituacaoParcela } from '@/tipos/financeiro'

function plural(quantidade: number, singular: string, pluralTexto: string): string {
  return quantidade === 1 ? singular : pluralTexto
}

export const ROTULOS_SITUACAO_PARCELA: Record<SituacaoParcela, string> = {
  Pendente: 'Pendente',
  Vencida: 'Vencida',
  Paga: 'Paga',
}

export const TEXTOS_FINANCEIRO = {
  titulo: 'Financeiro',
  tituloDocumento: (nomes: string) => `Financeiro de ${nomes}`,
  adicionarParcela: 'Adicionar parcela',
  gerarParcelas: 'Gerar parcelas',
  segmentoVencimento: 'Por vencimento',
  segmentoFornecedor: 'Por fornecedor',
  alternanciaRotulo: 'Organizar parcelas',
  livroTitulo: 'Livro de vencimentos',
  linhaHoje: (data: string) => `Hoje, ${data}`,
  grupoVencidas: 'Vencidas',
  grupoProximas: 'Próximos 7 dias',
  grupoDepois: 'Depois',
  grupoPagas: (quantidade: number, valor: string) => `Pagas (${quantidade}) · ${valor}`,
  vazioLivro: 'Nenhuma parcela registrada.',
  vazioLivroTexto: 'Gere o cronograma de cada fornecedor contratado em "Por fornecedor".',
  vazioFornecedor: 'Sem parcelas. Gere o cronograma a partir do contrato.',
  vazioSemContratadoTitulo: 'Nenhum fornecedor contratado ainda',
  vazioSemContratadoTexto: 'Marque um fornecedor como contratado para registrar as parcelas.',
  irFornecedores: 'Ir para Fornecedores',
  vazioCasalTitulo: 'A assessoria ainda não registrou pagamentos.',
  vazioCasalTexto: 'Quando houver parcelas, vocês acompanham tudo por aqui.',
  primeiroAcessoTitulo: 'Organize os pagamentos do casamento',
  primeiroAcessoTexto: 'O Financeiro reúne as parcelas de todos os fornecedores contratados.',
  primeiroAcessoPassos: [
    { chave: 'contratar', rotulo: 'Marque o fornecedor como contratado e informe o valor.', concluido: false },
    { chave: 'gerar', rotulo: 'Gere as parcelas do contrato.', concluido: false },
    { chave: 'pagar', rotulo: 'Registre cada pagamento com o comprovante.', concluido: false },
  ],
  rodapeCasal: 'A assessoria registra os pagamentos. Falem com ela se algo estiver diferente.',
  arquivado: 'Este casamento está arquivado. Restaure para registrar pagamentos.',
  cancelado: 'Parcelas mantidas como histórico. Não entram nos totais nem nos alertas.',
  rotuloCancelado: 'Cancelado',
  erroTitulo: 'Não foi possível carregar o financeiro.',
  erroTexto: 'Verifique a conexão e tente de novo.',
  semAcesso: 'Você não tem acesso a este financeiro.',
  naoEncontradoTitulo: 'Casamento não encontrado',
  naoEncontradoTexto: 'Ele pode ter sido removido ou você não tem acesso a ele.',
  voltarNossoCasamento: 'Voltar para o nosso casamento',
  voltarCasamentos: 'Voltar para Casamentos',
  faixaAlertas: (vencidas: number, valorVencidas: string, proximas: number) => {
    const partes: string[] = []
    if (vencidas > 0) {
      partes.push(`${vencidas} ${plural(vencidas, 'parcela vencida', 'parcelas vencidas')} (${valorVencidas})`)
    }
    if (proximas > 0) {
      partes.push(`${proximas} ${plural(proximas, 'vence', 'vencem')} em 7 dias`)
    }
    return partes.join(' · ')
  },
  fornecedorPagoDe: (pago: string, contratado: string) => `${pago} pagos de ${contratado}`,
  avisoSaldo: (valor: string) => `Faltam ${valor} para cobrir o valor contratado.`,
  maisAcoes: 'Mais ações',
  maisAcoesAria: (numero: number, total: number, empresa: string) => `Ações da parcela ${numero}/${total} de ${empresa}`,
  acoesFornecedorAria: (empresa: string) => `Parcelas de ${empresa}`,
  indicadoresRotulo: 'Resumo dos pagamentos',
  indicadorPago: 'Pago',
  apoioPago: 'já registrado',
  indicadorAPagar: 'A pagar',
  apoioAPagar: 'parcelas em aberto',
  indicadorVencido: 'Vencido',
  apoioVencidas: (quantidade: number) => `${quantidade} ${plural(quantidade, 'parcela vencida', 'parcelas vencidas')}`,
  apoioEmDia: 'Nada vencido',
  indicadorAParcelar: 'A parcelar',
  apoioAParcelar: 'contratado sem parcela',
  lateralRotulo: 'Orçamento',
} as const

export const TEXTOS_PARCELA = {
  numero: (empresa: string, numero: number, total: number) => `${empresa} · ${numero}/${total}`,
  numeroCurto: (numero: number, total: number) => `Parcela ${numero}/${total}`,
  situacaoPendente: 'Pendente',
  situacaoVenceHoje: 'Vence hoje',
  situacaoVenceEm: (dias: number) => `Vence em ${dias} ${plural(dias, 'dia', 'dias')}`,
  situacaoVencida: (dias: number) => (dias <= 1 ? 'Venceu ontem' : `Vencida há ${dias} dias`),
  situacaoPaga: (data: string) => (data ? `Paga em ${data}` : 'Paga'),
  vencimentoAria: (data: string) => `Vencimento em ${data}`,
  comprovante: 'Comprovante',
  baixarComprovante: 'Baixar comprovante',
  baixarComprovanteAria: (numero: number, total: number, empresa: string, tamanho: string) =>
    `Baixar comprovante da parcela ${numero}/${total} de ${empresa} (${tamanho})`,
  menuMarcarPaga: 'Marcar como paga',
  menuEditar: 'Editar parcela',
  menuRemover: 'Remover parcela',
  menuAnexar: 'Anexar comprovante',
  menuBaixar: 'Baixar comprovante',
  menuSubstituir: 'Substituir comprovante',
  menuRemoverComprovante: 'Remover comprovante',
  menuDesfazer: 'Desfazer pagamento',
  campoFornecedor: 'Fornecedor',
  campoFornecedorPlaceholder: 'Escolha o fornecedor contratado',
  campoValor: 'Valor',
  campoVencimento: 'Vencimento',
  campoObservacao: 'Observação',
  dicaObservacao: 'Opcional. Ex.: Sinal, Boleto, Pix.',
  dicaNumeracao: 'O número da parcela segue a ordem dos vencimentos.',
  apoioSaldo: (contratado: string, parcelado: string, saldo: string) =>
    `Contratado ${contratado} · já parcelado ${parcelado} · saldo ${saldo}`,
  tituloNova: 'Adicionar parcela',
  tituloEdicao: 'Editar parcela',
  salvarNova: 'Adicionar parcela',
  salvarEdicao: 'Salvar alterações',
  cancelar: 'Cancelar',
  erroValor: 'Informe um valor entre R$ 0,01 e R$ 99.999.999,99.',
  erroVencimento: 'Informe a data de vencimento.',
  erroVencimentoInvalido: 'Informe um vencimento entre 01/01/2000 e 31/12/2100.',
  erroObservacao: 'Use até 120 caracteres.',
  erroQuantidade: 'Escolha de 1 a 60 parcelas.',
  erroFornecedor: 'Escolha o fornecedor.',
  erroDataPagamento: 'Informe a data do pagamento.',
  erroPagamentoFuturo: 'A data do pagamento não pode ser futura.',
  erroSomaExcede: (valor: string) => `As parcelas passariam do valor contratado em ${valor}. Ajuste o valor.`,
  erroParcelaPaga: 'Desfaça o pagamento para alterar ou remover esta parcela.',
  erroConcorrencia: 'Esta parcela foi alterada em outra tela. Os dados foram atualizados.',
  erroSalvar: 'Não foi possível salvar a parcela. Tente de novo.',
  erroRemover: 'Não foi possível remover a parcela. Tente de novo.',
  erroPagamento: 'Não foi possível registrar o pagamento. Tente de novo.',
  erroDesfazer: 'Não foi possível desfazer o pagamento. Tente de novo.',
  sucessoCriada: (empresa: string) => `Parcela adicionada para ${empresa}.`,
  sucessoSalva: 'Parcela atualizada.',
  sucessoRemovida: 'Parcela removida.',
  sucessoPaga: (numero: number, total: number, empresa: string) => `Parcela ${numero}/${total} de ${empresa} marcada como paga.`,
  sucessoDesfeito: 'Pagamento desfeito.',
  confirmarRemoverTitulo: (numero: number, total: number, empresa: string) => `Remover a parcela ${numero}/${total} de ${empresa}?`,
  confirmarRemoverTexto: (valor: string, data: string) => `${valor}, vencimento ${data}. Esta ação não pode ser desfeita.`,
  confirmarRemover: 'Remover',
  confirmarDesfazerTitulo: (numero: number, total: number, empresa: string) =>
    `Desfazer o pagamento da parcela ${numero}/${total} de ${empresa}?`,
  confirmarDesfazerTexto: 'O comprovante anexado será apagado.',
  confirmarDesfazer: 'Desfazer pagamento',
} as const

export const TEXTOS_GERADOR_PARCELAS = {
  titulo: (empresa: string) => `Gerar parcelas de ${empresa}`,
  campoQuantidade: 'Número de parcelas',
  campoValorTotal: 'Valor total',
  campoPrimeiroVencimento: 'Primeiro vencimento',
  dicaValorTotal: (saldo: string) => `Saldo a parcelar: ${saldo}.`,
  notaCentavos: 'A última parcela recebe os centavos que sobram da divisão.',
  notaMensal: 'As parcelas vencem todo mês no mesmo dia. Em meses mais curtos, no último dia.',
  previaTitulo: 'Prévia',
  previaVazia: 'Informe o número de parcelas, o valor e o primeiro vencimento para ver a prévia.',
  previaResumo: (quantidade: number, ultima: string) =>
    `${quantidade} ${plural(quantidade, 'parcela', 'parcelas')}; última de ${ultima}`,
  previaValorPequeno: 'O valor é pequeno demais para dividir nesse número de parcelas.',
  confirmar: (quantidade: number) => (quantidade === 1 ? 'Gerar 1 parcela' : `Gerar ${quantidade} parcelas`),
  sucesso: (quantidade: number, empresa: string) =>
    `${quantidade} ${plural(quantidade, 'parcela criada', 'parcelas criadas')} para ${empresa}.`,
  erro: 'Não foi possível gerar as parcelas. Tente de novo.',
} as const

export const TEXTOS_PAGAMENTO = {
  titulo: 'Registrar pagamento',
  resumo: (empresa: string, numero: number, total: number, valor: string, vencimento: string) =>
    `${empresa} · ${numero}/${total} · ${valor} · vence ${vencimento}`,
  campoData: 'Data do pagamento',
  confirmar: 'Marcar como paga',
  comprovanteOpcional: 'O comprovante é opcional. Você pode anexar depois.',
} as const

export const TEXTOS_ENVIO_COMPROVANTE: TextosEnvioArquivo = {
  rotulo: 'Comprovante (opcional)',
  instrucao: 'Arraste o comprovante ou escolha o arquivo.',
  botao: 'Escolher arquivo',
  trocar: 'Escolher outro arquivo',
  limites: 'PDF, JPG ou PNG até 10 MB.',
  carregando: 'Enviando comprovante…',
}

export const TEXTOS_COMPROVANTE = {
  erroFormato: 'Envie o comprovante em PDF, JPG ou PNG.',
  erroTamanho: 'O comprovante passa de 10 MB. Envie um arquivo menor.',
  erroVazio: 'O arquivo está vazio. Escolha o comprovante.',
  erroLimite: 'Muitos envios seguidos. Aguarde um minuto e tente de novo.',
  erroEnviar: 'Não foi possível enviar o comprovante. Tente de novo.',
  erroBaixar: 'Não foi possível baixar o comprovante. Tente de novo.',
  erroRemover: 'Não foi possível remover o comprovante. Tente de novo.',
  sucessoAnexado: 'Comprovante anexado.',
  sucessoRemovido: 'Comprovante removido.',
  pagaSemComprovante: 'Pagamento registrado, mas o comprovante não foi enviado. Anexe de novo pelo menu da parcela.',
  confirmarRemoverTitulo: (numero: number, total: number, empresa: string) =>
    `Remover o comprovante da parcela ${numero}/${total} de ${empresa}?`,
  confirmarRemoverTexto: 'O arquivo será apagado. O pagamento continua registrado.',
  confirmarRemover: 'Remover comprovante',
} as const

export const TEXTOS_ALERTAS_PAGAMENTOS = {
  titulo: 'Pagamentos',
  vencidas: (quantidade: number) => `${quantidade} ${plural(quantidade, 'vencida', 'vencidas')}`,
  proximas: (quantidade: number) => `${quantidade} nos próximos 7 dias`,
  casamentos: (quantidade: number) => `em ${quantidade} ${plural(quantidade, 'casamento', 'casamentos')}`,
  grupoVencidas: 'Vencidas',
  grupoProximas: 'Próximos 7 dias',
  vazio: 'Nenhum pagamento vencido nem vencendo nos próximos 7 dias.',
  mais: (quantidade: number) => `+ ${quantidade} ${plural(quantidade, 'outra', 'outras')}`,
  verFinanceiro: 'Ver financeiro',
  erro: 'Não foi possível carregar os pagamentos.',
  tentarNovamente: 'Tentar novamente',
  itemAria: (empresa: string, numero: number, total: number, casal: string, valor: string, situacao: string) =>
    `${empresa}, parcela ${numero}/${total}${casal ? `, ${casal}` : ''}, ${valor}, ${situacao}`,
} as const

export const TEXTOS_REGUA_PAGAMENTOS = {
  pagosDe: 'pagos de',
  contratados: 'contratados',
  apoio: (pendente: string, vencido: string | null, orcado: string) =>
    [`${pendente} a pagar`, vencido ? `${vencido} vencidos` : null, `${orcado} orçados`].filter(Boolean).join(' · '),
  legendaPago: 'Pago',
  legendaAPagar: 'Contratado a pagar',
  legendaLivre: 'Livre no orçamento',
  reguaAria: (pago: number, aPagar: number, livre: number) =>
    `Do orçamento: ${pago}% pago, ${aPagar}% contratado a pagar, ${livre}% livre`,
  colunaPago: 'Pago',
  pagos: 'pagos',
  vencidos: (valor: string) => `${valor} vencidos`,
  legenda: 'Pago, contratado e orçado por categoria',
} as const

export const TEXTOS_PARCELAS_FORNECEDOR = {
  resumo: (pagas: number, total: number) => `${pagas} de ${total} ${plural(total, 'paga', 'pagas')}`,
  proxima: (data: string, valor: string) => `próxima ${data} · ${valor}`,
  vencidas: (quantidade: number) => `${quantidade} ${plural(quantidade, 'vencida', 'vencidas')}`,
  verParcelas: 'Ver parcelas',
  removerComParcelasTitulo: (empresa: string) => `“${empresa}” tem parcelas registradas`,
  removerComParcelasTexto: (quantidade: number) =>
    `Este fornecedor tem ${quantidade} ${plural(quantidade, 'parcela', 'parcelas')}. Remova as parcelas no Financeiro antes de tirá-lo do casamento.`,
  irFinanceiro: 'Ir para o Financeiro',
} as const
