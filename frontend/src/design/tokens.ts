export const paletas = {
  meiaNoite: {
    50: '#F3F6FB',
    100: '#E8EDF7',
    200: '#C9D3E8',
    300: '#9FB0D3',
    400: '#6F82AD',
    500: '#4A5F8F',
    600: '#2D4373',
    700: '#1F335E',
    800: '#14244A',
    900: '#0E1A33',
    950: '#08101F',
  },
  neutro: {
    0: '#FFFFFF',
    50: '#F7F8FA',
    100: '#F4F5F7',
    200: '#ECEEF2',
    300: '#E4E7EC',
    400: '#D5DAE1',
    500: '#7E8798',
    600: '#5E6779',
    700: '#474F60',
    800: '#2F3646',
    900: '#1E2433',
    950: '#131722',
  },
  sucesso: {
    50: '#F0F8F4',
    100: '#DDF0E6',
    200: '#BCE2CD',
    300: '#8CCBA9',
    400: '#55A87E',
    500: '#3E9A70',
    600: '#2F7D5B',
    700: '#22603F',
    800: '#1A4A31',
    900: '#123423',
    950: '#0A1F15',
  },
  alerta: {
    50: '#FDF8EE',
    100: '#FBEFD9',
    200: '#F5DCAE',
    300: '#EBC27A',
    400: '#D69C40',
    500: '#C4892B',
    600: '#B7791F',
    700: '#96621A',
    800: '#7A4F0F',
    900: '#5A3A0B',
    950: '#382406',
  },
  erro: {
    50: '#FDF3F2',
    100: '#F8E1DF',
    200: '#F0C2BE',
    300: '#E2958F',
    400: '#CD6A62',
    500: '#B4413A',
    600: '#A23832',
    700: '#8E2F29',
    800: '#702520',
    900: '#521B17',
    950: '#33100E',
  },
} as const

export const centelha = {
  sobreEscuro: '#E3B964',
  sobreClaro: '#C99A3A',
  texto: '#A47A26',
} as const

export const neutros = {
  nevoa: paletas.neutro[100],
  branco: paletas.neutro[0],
  prata: paletas.neutro[300],
  grafite: paletas.neutro[600],
  tinta: paletas.neutro[900],
  divisor: '#EEF0F3',
  bordaSuave: paletas.neutro[400],
  trilhoAbas: paletas.neutro[200],
  cabecalhoTabela: paletas.neutro[50],
} as const

export type TomCelebracao = 'rose' | 'orquidea' | 'tangerina' | 'champanhe' | 'jade' | 'neutro'

export interface CoresTom {
  viva: string
  fundo: string
  tinta: string
  tintaProfunda: string
  data: string
}

export const tonsCelebracao: Record<TomCelebracao, CoresTom> = {
  rose: { viva: '#D9837A', fundo: '#F6DEDA', tinta: '#9C3F3A', tintaProfunda: '#3A1512', data: '#7A3530' },
  orquidea: { viva: '#A57CC7', fundo: '#ECE1F5', tinta: '#6B3F8C', tintaProfunda: '#24103A', data: '#5C3580' },
  tangerina: { viva: '#F0955A', fundo: '#FCE3CF', tinta: '#9A4A12', tintaProfunda: '#3D1A04', data: '#7A3A0E' },
  champanhe: { viva: '#D9AE4F', fundo: '#F6EBCF', tinta: '#7D5B12', tintaProfunda: '#2E2105', data: '#6B4E10' },
  jade: { viva: '#3F9E8F', fundo: '#D8EEEA', tinta: '#1F6358', tintaProfunda: '#0F332D', data: '#1A5249' },
  neutro: {
    viva: paletas.meiaNoite[400],
    fundo: paletas.meiaNoite[100],
    tinta: paletas.meiaNoite[600],
    tintaProfunda: paletas.meiaNoite[900],
    data: paletas.meiaNoite[600],
  },
}

export type FaseEvento = 'planejamento' | 'retaFinal' | 'realizado' | 'atrasado'

export interface CoresFase {
  ponto: string
  texto: string
  fundo: string
}

export const fases: Record<FaseEvento, CoresFase> = {
  planejamento: { ponto: paletas.meiaNoite[600], texto: paletas.meiaNoite[600], fundo: paletas.meiaNoite[100] },
  retaFinal: { ponto: paletas.alerta[600], texto: paletas.alerta[800], fundo: paletas.alerta[100] },
  realizado: { ponto: paletas.sucesso[600], texto: paletas.sucesso[700], fundo: paletas.sucesso[100] },
  atrasado: { ponto: paletas.erro[500], texto: paletas.erro[700], fundo: paletas.erro[100] },
}

export const coresMarca = {
  meiaNoite: paletas.meiaNoite[800],
  meiaNoiteProfundo: paletas.meiaNoite[900],
  meiaNoiteMedio: paletas.meiaNoite[600],
  centelha: centelha.sobreEscuro,
  centelhaClara: centelha.sobreClaro,
  nevoa: neutros.nevoa,
  branco: neutros.branco,
  prata: neutros.prata,
  grafite: neutros.grafite,
  tinta: neutros.tinta,
} as const

export const cores = {
  rail: paletas.meiaNoite[900],
  railIcone: paletas.meiaNoite[300],
  railAtivo: centelha.sobreEscuro,
  railAtivoIcone: paletas.meiaNoite[900],
  railAvatar: paletas.meiaNoite[600],
  navegacao: neutros.branco,
  navegacaoTexto: neutros.grafite,
  navegacaoAtivo: paletas.meiaNoite[800],
  navegacaoSimbolo: paletas.meiaNoite[800],
  centelha: centelha.sobreEscuro,
  centelhaClara: centelha.sobreClaro,
  centelhaTexto: centelha.texto,
  destaque: tonsCelebracao.champanhe.fundo,
  destaqueTexto: tonsCelebracao.champanhe.tinta,
  lateralEscura: paletas.meiaNoite[800],
  lateralEscuraTexto: neutros.branco,
  lateralEscuraApoio: paletas.meiaNoite[200],
  primaria: paletas.meiaNoite[800],
  primariaEscura: paletas.meiaNoite[900],
  primariaSuave: paletas.meiaNoite[100],
  acento: paletas.meiaNoite[300],
  acentoClaro: paletas.meiaNoite[200],
  acentoTexto: paletas.meiaNoite[600],
  acentoSuave: paletas.meiaNoite[50],
  assistente: paletas.meiaNoite[50],
  fundo: neutros.nevoa,
  superficie: neutros.branco,
  superficieSutil: neutros.cabecalhoTabela,
  borda: neutros.prata,
  divisoria: neutros.divisor,
  bordaSuave: neutros.bordaSuave,
  bordaControle: paletas.meiaNoite[200],
  bordaCampo: paletas.neutro[500],
  trilho: neutros.trilhoAbas,
  texto: neutros.tinta,
  titulo: paletas.meiaNoite[800],
  textoSecundario: paletas.neutro[700],
  textoApoio: neutros.grafite,
  placeholder: neutros.grafite,
  neutro: paletas.neutro[700],
  neutroSuave: paletas.neutro[200],
  sucesso: paletas.sucesso[600],
  sucessoTexto: paletas.sucesso[700],
  sucessoSuave: paletas.sucesso[100],
  alerta: paletas.alerta[700],
  alertaTexto: paletas.alerta[800],
  alertaSuave: paletas.alerta[100],
  alertaForte: paletas.alerta[900],
  erro: paletas.erro[600],
  erroTexto: paletas.erro[700],
  erroSuave: paletas.erro[100],
  informacao: paletas.meiaNoite[600],
  informacaoTexto: paletas.meiaNoite[600],
  informacaoSuave: paletas.meiaNoite[100],
  toast: paletas.meiaNoite[900],
  toastTexto: neutros.branco,
  toastApoio: paletas.meiaNoite[200],
  toastAcao: centelha.sobreEscuro,
  toastSucesso: paletas.sucesso[300],
  toastErro: paletas.erro[300],
  toastInformacao: paletas.meiaNoite[300],
  toastAlerta: paletas.alerta[300],
  fundoAnfitriao: paletas.meiaNoite[50],
  fundoConvite: neutros.nevoa,
  cartaoConvite: neutros.branco,
  bordaConvite: neutros.prata,
  bordaPublica: neutros.prata,
  controlePublico: paletas.neutro[500],
  textoPublico: paletas.meiaNoite[800],
  apoioPublico: neutros.grafite,
  operacaoFundo: paletas.meiaNoite[900],
  operacaoSuperficie: paletas.meiaNoite[800],
  operacaoTexto: paletas.meiaNoite[50],
  operacaoApoio: paletas.meiaNoite[200],
  operacaoBorda: paletas.meiaNoite[400],
  operacaoDivisoria: paletas.meiaNoite[700],
  operacaoDestaque: centelha.sobreEscuro,
  operacaoSucesso: paletas.sucesso[300],
  operacaoCartao: paletas.meiaNoite[50],
  operacaoCartaoTexto: paletas.meiaNoite[900],
  operacaoCartaoApoio: neutros.grafite,
  operacaoCartaoBorda: paletas.meiaNoite[200],
  operacaoAoVivo: paletas.erro[300],
  operacaoAoVivoFundo: paletas.erro[950],
  operacaoAcao: centelha.sobreEscuro,
  operacaoAcaoTexto: paletas.meiaNoite[900],
  veu: 'rgba(8, 16, 31, 0.5)',
} as const

export const tipografia = {
  familias: {
    display: "'Fraunces Variable', Georgia, 'Times New Roman', serif",
    interface: "'Plus Jakarta Sans Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    serif: "'Fraunces Variable', Georgia, 'Times New Roman', serif",
  },
  tamanhos: {
    rotulo: '0.75rem',
    rotuloNavegacao: '0.6875rem',
    apoio: '0.8125rem',
    controle: '0.875rem',
    tagline: '0.75rem',
    corpo: '0.9375rem',
    botao: '0.9375rem',
    titulo: '1.125rem',
    apoioEditorial: '1.125rem',
    secao: '1.5rem',
    cartaoEvento: '1.625rem',
    paginaCelular: '2rem',
    tituloGrande: '2.25rem',
    pagina: '2.75rem',
    display: '3.5rem',
    operacao: '1.5rem',
    relogio: '3.5rem',
  },
  pesos: {
    leve: 400,
    regular: 400,
    editorial: 450,
    medio: 500,
    seminegrito: 600,
    negrito: 700,
  },
  entrelinhas: {
    display: 1.05,
    titulo: 1.15,
    interface: 1.35,
    corpo: 1.6,
    leitura: 1.6,
  },
  espacamentoLetras: {
    tagline: '0.16em',
    rotulo: '0.16em',
    etiqueta: '0.08em',
    display: '-0.02em',
  },
} as const

export const espacamento = {
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
} as const

export const ritmo = {
  secao: espacamento[16],
  bloco: espacamento[10],
  cartao: espacamento[6],
  grupo: espacamento[4],
  campo: espacamento[2],
} as const

export const raio = {
  tag: '6px',
  campo: '12px',
  controle: '12px',
  aba: '10px',
  trilhoAbas: '14px',
  tile: '14px',
  cartaoEvento: '18px',
  painel: '20px',
  cartaoAmplo: '22px',
  folha: '28px',
  total: '999px',
} as const

export const sombra = {
  suave: '0 1px 2px rgba(14, 26, 51, 0.08)',
  cartao: '0 1px 2px rgba(14, 26, 51, 0.04), 0 8px 24px rgba(14, 26, 51, 0.05)',
  sobreposicao: '0 12px 32px rgba(14, 26, 51, 0.16)',
} as const

export const breakpoints = {
  tablet: 640,
  notebook: 1024,
  desktop: 1280,
  amplo: 1536,
} as const

export const duracao = {
  rapida: '150ms',
  padrao: '200ms',
  lenta: '250ms',
} as const

export const dimensoes = {
  larguraRail: '4.75rem',
  larguraNavegacaoEvento: '15.5rem',
  larguraGaveta: '19rem',
  larguraLateral: '18rem',
  larguraLateralMaxima: '24rem',
  alturaBarraCelular: '3.5rem',
  alturaControle: '2.75rem',
  alturaBotao: '3rem',
  alturaAcaoLinha: '2.75rem',
  alturaPilula: '2.5rem',
  tileIcone: '3rem',
  tileVazio: '4rem',
  pontoFase: '0.4375rem',
  fileteTipo: '0.25rem',
  barraComposicao: '0.5rem',
  larguraAmpla: '96rem',
  larguraFormulario: '48rem',
  larguraLeitura: '38rem',
  larguraPublica: '36rem',
  larguraConvite: '30rem',
  larguraAutenticacao: '26rem',
  alvoToque: '2.75rem',
  alvoToqueMovel: '3rem',
  alvoPresenca: '4.5rem',
  alturaAcaoConvite: '3.25rem',
  colunaHorarioCronograma: '4rem',
  colunaHorarioCronogramaCelular: '3.5rem',
  noCronograma: '0.75rem',
  fioCronograma: '2px',
  colunaHorarioOperacao: '4.75rem',
  colunaRotuloDiaOperacao: '7.5rem',
  alturaAcaoOperacao: '3.5rem',
} as const

export const camadas = {
  cabecalho: 100,
  menu: 200,
} as const

export const tokens = {
  paletas,
  centelha,
  neutros,
  tonsCelebracao,
  fases,
  coresMarca,
  cores,
  tipografia,
  espacamento,
  ritmo,
  raio,
  sombra,
  breakpoints,
  duracao,
  dimensoes,
  camadas,
} as const

export type TokensDesign = typeof tokens
