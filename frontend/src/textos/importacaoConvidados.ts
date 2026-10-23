import type { VarianteStatus } from '@/componentes/base/tipos'
import { emFrase, gruposSugeridos } from '@/textos/convidados'
import type { TipoEvento } from '@/tipos/eventos'
import type { ColunaImportacao, TipoProblemaLinha } from '@/tipos/importacaoConvidados'
import { formatarNumero } from '@/utilitarios/formatacao'

function contar(quantidade: number, singular: string, varias: string): string {
  return `${formatarNumero(quantidade)} ${quantidade === 1 ? singular : varias}`
}

export const ROTULOS_COLUNA_IMPORTACAO: Record<ColunaImportacao, string> = {
  Convite: 'Convite',
  Grupo: 'Grupo',
  Nome: 'Nome',
  Telefone: 'Telefone',
  Email: 'E-mail',
  FaixaEtaria: 'Faixa etária',
  Acompanhantes: 'Acompanhantes',
  Resposta: 'Resposta',
}

export const ROTULOS_TIPO_PROBLEMA: Record<TipoProblemaLinha, string> = {
  Erro: 'Erro',
  Duplicado: 'Repetida',
  Aviso: 'Aviso',
}

export const ROTULOS_FILTRO_PROBLEMA: Record<TipoProblemaLinha, string> = {
  Erro: 'Erros',
  Duplicado: 'Repetidas',
  Aviso: 'Avisos',
}

export const VARIANTE_TIPO_PROBLEMA: Record<TipoProblemaLinha, VarianteStatus> = {
  Erro: 'erro',
  Duplicado: 'alerta',
  Aviso: 'informacao',
}

export const LIMITE_GRUPOS_EXEMPLO = 3

export interface ExplicacaoColuna {
  coluna: ColunaImportacao
  texto: string
}

export function explicacaoColunas(tipo: TipoEvento | null | undefined): ExplicacaoColuna[] {
  const grupos = gruposSugeridos(tipo).slice(0, LIMITE_GRUPOS_EXEMPLO)
  return [
    { coluna: 'Nome', texto: 'nome da pessoa. Única coluna obrigatória.' },
    { coluna: 'Convite', texto: 'nome da família ou do grupo que recebe o mesmo convite, como “Família Souza”.' },
    { coluna: 'Grupo', texto: `para filtrar e enviar por partes, como ${emFrase(grupos, 'ou')}.` },
    { coluna: 'Telefone', texto: 'com DDD, como (11) 98765-4321.' },
    { coluna: 'Email', texto: 'opcional.' },
    { coluna: 'FaixaEtaria', texto: 'Adulto ou Criança. Em branco conta como adulto.' },
    { coluna: 'Acompanhantes', texto: 'quantos acompanhantes o convite permite, de 0 a 10.' },
    { coluna: 'Resposta', texto: 'Confirmado, Recusado ou em branco para pendente.' },
  ]
}

export interface ErroComumImportacao {
  chave: string
  titulo: string
  texto: string
}

export const ERROS_COMUNS_IMPORTACAO: readonly ErroComumImportacao[] = [
  { chave: 'formato', titulo: 'Arquivo em outro formato', texto: 'Salve como CSV. Arquivos .xlsx não são lidos.' },
  {
    chave: 'coluna-nome',
    titulo: 'Sem a coluna Nome',
    texto: 'A primeira linha precisa ter os títulos das colunas. Confira no modelo.',
  },
  {
    chave: 'valores',
    titulo: 'Faixa etária ou resposta escrita de outro jeito',
    texto: 'Use Adulto ou Criança e Confirmado, Recusado ou em branco. Sim e Não também valem.',
  },
  {
    chave: 'exemplo',
    titulo: 'Linhas de exemplo do modelo',
    texto: 'Apague as linhas marcadas com “(exemplo)” antes de enviar.',
  },
  {
    chave: 'repetida',
    titulo: 'Pessoa repetida',
    texto: 'Quem aparece duas vezes na planilha ou já está na lista do evento não entra de novo.',
  },
  {
    chave: 'convite',
    titulo: 'Mesmo convite com dados diferentes',
    texto: 'Grupo e acompanhantes valem os da primeira linha do convite.',
  },
]

function pronome(quantidade: number, singular: string, varias: string): string {
  return quantidade === 1 ? singular : varias
}

export const TEXTOS_IMPORTACAO = {
  titulo: 'Importar convidados',
  subtitulo: 'Traga os convidados de uma planilha. Nada é gravado antes da sua confirmação.',
  trilha: 'Importar',
  tituloDocumento: (nomes: string) => `Importar convidados de ${nomes}`,
  rotuloEtapas: 'Etapas da importação',
  etapas: ['Escolha a planilha', 'Confira', 'Pronto'],
  etapaAnuncio: (numero: number, total: number, nome: string) => `Etapa ${numero} de ${total}: ${nome}`,
  rotuloArquivo: 'Planilha de convidados',
  envioInstrucao: 'Arraste a planilha aqui ou',
  envioBotao: 'Escolher arquivo',
  envioLimites: 'CSV de até 2 MB e 5.000 linhas.',
  envioTrocar: 'Trocar arquivo',
  envioLendo: 'Lendo a planilha…',
  erroVazio: 'O arquivo está vazio.',
  erroTamanho: 'O arquivo passa de 2 MB. Divida a lista em mais de uma planilha.',
  erroFormato: 'Envie uma planilha salva como CSV. No Excel: Arquivo › Salvar como › CSV.',
  comoMontarTitulo: 'Como montar a planilha',
  comoMontarTexto:
    'Uma linha por pessoa. Pessoas com o mesmo texto na coluna Convite ficam no mesmo convite. Só a coluna Nome é obrigatória.',
  dicaExcel: 'No Excel: Arquivo › Salvar como › CSV. No Google Planilhas: Arquivo › Fazer download › CSV.',
  baixarModelo: 'Baixar modelo',
  errosComunsTitulo: 'Erros mais comuns',
  privacidadeTitulo: 'Dados dos convidados',
  privacidade:
    'A planilha traz dados pessoais de outras pessoas. Inclua telefone e e-mail só se forem usados para enviar o convite. O arquivo não fica guardado: entram na lista só os convites que você confirmar.',
  privacidadeRestricoes:
    'Restrições alimentares não entram pela planilha: são dado de saúde e são informadas na confirmação de presença.',
  nomeArquivoModelo: 'modelo-convidados.csv',
  nomeArquivoCorrecao: 'linhas-para-corrigir.csv',
  resumoTudoPronto: (convites: number, pessoas: number) =>
    `${contar(convites, 'convite', 'convites')}, ${contar(pessoas, 'pessoa pronta', 'pessoas prontas')} para entrar na lista.`,
  resumoComProblemas: (validos: number, convites: number, linhas: number) =>
    `${formatarNumero(validos)} de ${contar(convites, 'convite está pronto', 'convites estão prontos')}. ${contar(linhas, 'linha precisa', 'linhas precisam')} de atenção.`,
  resumoNenhumPronto: 'Nenhum convite pronto para importar.',
  orientacaoNenhumPronto: 'Corrija as linhas e envie a planilha de novo.',
  linhasLidas: (arquivo: string, linhas: number) => `${arquivo}, ${contar(linhas, 'linha lida', 'linhas lidas')}`,
  resumoRotulo: 'Totais da planilha',
  rotuloPessoas: (quantidade: number) => pronome(quantidade, 'pessoa', 'pessoas'),
  rotuloAdultos: (quantidade: number) => pronome(quantidade, 'adulto', 'adultos'),
  rotuloCriancas: (quantidade: number) => pronome(quantidade, 'criança', 'crianças'),
  rotuloConvites: (quantidade: number) => pronome(quantidade, 'convite', 'convites'),
  rodapeResumo: (atuais: number, depois: number) =>
    `Hoje o evento tem ${contar(atuais, 'pessoa', 'pessoas')}; depois da importação, ${formatarNumero(depois)}.`,
  acimaDoLimite: (limite: number) =>
    `A importação passaria do limite de ${formatarNumero(limite)} convidados por evento. Divida a lista ou remova pessoas antes.`,
  colunasIgnoradas: (colunas: string[]) => `Colunas não usadas: ${colunas.join(', ')}.`,
  secaoProblemas: 'Linhas para corrigir',
  secaoAvisos: 'Avisos',
  filtroTodos: 'Todos',
  filtroProblemas: 'Filtrar linhas por tipo',
  itemLinha: (linha: number) => `Linha ${formatarNumero(linha)}`,
  semNome: 'sem nome',
  mostrarMais: (quantidade: number) => `Mostrar mais ${formatarNumero(quantidade)}`,
  baixarCorrecao: 'Baixar linhas para corrigir',
  enviarCorrigida: 'Enviar planilha corrigida',
  secaoConvites: 'Convites que serão criados',
  contagemConvites: (quantidade: number) => contar(quantidade, 'convite', 'convites'),
  semGrupo: 'Sem grupo',
  gruposTitulo: 'Grupos da planilha',
  gruposResumo: (novos: number, existentes: number) => {
    if (novos === 0) {
      return existentes === 1 ? 'O grupo já existe no evento.' : 'Todos os grupos já existem no evento.'
    }
    const parteNovos = contar(novos, 'grupo novo', 'grupos novos')
    if (existentes === 0) {
      return `${parteNovos} no evento.`
    }
    return `${parteNovos} e ${contar(existentes, 'que já existe', 'que já existem')} no evento.`
  },
  gruposSemComparacao: 'Não foi possível comparar com os grupos do evento agora.',
  grupoDetalhe: (convites: number, pessoas: number) =>
    `${contar(convites, 'convite', 'convites')}, ${contar(pessoas, 'pessoa', 'pessoas')}`,
  grupoNovo: 'novo',
  grupoExistente: (convites: number) => `já tem ${contar(convites, 'convite', 'convites')}`,
  maisGrupos: (quantidade: number) => `e mais ${contar(quantidade, 'grupo', 'grupos')}`,
  acompanhantes: (quantidade: number) => `+${formatarNumero(quantidade)} ${pronome(quantidade, 'acompanhante', 'acompanhantes')}`,
  crianca: 'Criança',
  ficaDeFora: 'Fica de fora',
  ficaDeForaDetalhe: (linhas: number[]) =>
    `Tem problema ${pronome(linhas.length, 'na linha', 'nas linhas')} ${linhas.map((linha) => formatarNumero(linha)).join(', ')}.`,
  mostrarTodos: (quantidade: number) => `Mostrar todos os ${formatarNumero(quantidade)} convites`,
  importarTudo: (convites: number) => `Importar ${contar(convites, 'convite', 'convites')}`,
  importarValidos: (validos: number) =>
    validos === 1 ? 'Importar só o convite pronto' : `Importar só os ${formatarNumero(validos)} convites prontos`,
  importando: 'Importando…',
  confirmarTitulo: 'Importar só os convites prontos?',
  confirmarTexto: (convitesFora: number, pessoasFora: number) =>
    `${contar(convitesFora, 'convite', 'convites')} (${contar(pessoasFora, 'pessoa', 'pessoas')}) ${pronome(convitesFora, 'fica', 'ficam')} de fora porque ${pronome(convitesFora, 'tem', 'têm')} linhas com problema. Você pode importá-${pronome(convitesFora, 'lo', 'los')} depois, com a planilha corrigida.`,
  confirmarAcao: (validos: number) => `Importar ${contar(validos, 'convite', 'convites')}`,
  confirmarVoltar: 'Voltar e corrigir',
  cancelar: 'Cancelar',
  sucessoTitulo: 'Lista importada',
  sucessoTexto: (convites: number, pessoas: number, anfitriao: string) =>
    `${contar(convites, 'convite', 'convites')} e ${contar(pessoas, 'pessoa', 'pessoas')} ${convites === 1 && pessoas === 1 ? 'foi adicionado' : 'foram adicionados'}${anfitriao ? ` a ${anfitriao}` : ''}.`,
  toastSucesso: (convites: number, pessoas: number) =>
    `${contar(convites, 'convite', 'convites')} e ${contar(pessoas, 'pessoa', 'pessoas')} importados.`,
  verConvidados: 'Ver convidados',
  importarOutra: 'Importar outra planilha',
  conferirDeNovo: 'Conferir de novo',
  voltarConvidados: 'Voltar para convidados',
  acaoImportar: 'Importar planilha',
  vazioImportar: 'Já tem a lista numa planilha? Importe de uma vez.',
  arquivado: 'Este evento está arquivado. Restaure para voltar a editar os convidados.',
  semPermissao: 'Você não tem permissão para alterar convidados.',
  erroInesperado: 'Não foi possível ler a planilha agora. Tente de novo em instantes.',
  anuncioPrevia: (validos: number, linhas: number) =>
    `${contar(validos, 'convite pronto', 'convites prontos')}, ${contar(linhas, 'linha precisa', 'linhas precisam')} de atenção.`,
}
