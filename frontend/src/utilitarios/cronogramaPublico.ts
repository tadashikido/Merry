import { CATEGORIAS_FORNECEDOR, type CategoriaFornecedor } from '@/tipos/fornecedores'
import { ROTULOS_CATEGORIA_FORNECEDOR } from '@/textos/fornecedores'
import { TEXTOS_CRONOGRAMA_PUBLICO, TEXTOS_LINKS_CRONOGRAMA } from '@/textos/cronogramaPublico'
import type { DataCalendario, TipoEvento } from '@/tipos/eventos'
import { vocabularioDoTipo } from '@/textos/tiposEvento'
import type { DiaCronograma } from '@/tipos/cronograma'
import type {
  CronogramaPublicoDto,
  DestinoLinkCronogramaDto,
  GerarLinkCronogramaRequest,
  ItemCronogramaPublicoDto,
  SituacaoLinkCronograma,
} from '@/tipos/cronogramaPublico'
import { DIAS_CRONOGRAMA } from '@/tipos/cronograma'
import { formatarDataCalendarioComDiaSemana, formatarDataCalendarioExtenso, formatarNomesAnfitrioes } from '@/utilitarios/formatacao'
import { montarLinkWhatsApp } from '@/utilitarios/rsvp'

export const PADRAO_TOKEN_CRONOGRAMA = /^[A-Za-z0-9_-]{43}$/
export const CAMINHO_CRONOGRAMA_PUBLICO = '/cronograma'

export interface GrupoRoteiro<T extends Pick<ItemCronogramaPublicoDto, 'dia' | 'data'> = ItemCronogramaPublicoDto> {
  dia: DiaCronograma
  titulo: string
  itens: T[]
}

export interface DadosMensagemCronograma {
  nomePrimeiraPessoa: string
  nomeSegundaPessoa: string | null
  data: DataCalendario
}

export function tokenCronogramaValido(token: string | null | undefined): boolean {
  return PADRAO_TOKEN_CRONOGRAMA.test(token ?? '')
}

export function montarUrlCronogramaPublico(token: string, origem: string = window.location.origin): string {
  return `${origem.replace(/\/+$/, '')}${CAMINHO_CRONOGRAMA_PUBLICO}/${encodeURIComponent(token)}`
}

export function rotuloCategoria(categoria: string | null | undefined): string | null {
  if (!categoria) {
    return null
  }
  const conhecida = CATEGORIAS_FORNECEDOR.find((valor): valor is CategoriaFornecedor => valor === categoria)
  return conhecida ? ROTULOS_CATEGORIA_FORNECEDOR[conhecida] : categoria
}

export function rotuloFiltro(dados: Pick<CronogramaPublicoDto, 'filtro'>): string {
  const { tipo, rotulo } = dados.filtro
  return tipo === 'Geral' || !rotulo ? TEXTOS_CRONOGRAMA_PUBLICO.filtroGeral : TEXTOS_CRONOGRAMA_PUBLICO.filtroSeus(rotulo)
}

export function tituloDia(dia: DiaCronograma, data: DataCalendario): string {
  const extenso = formatarDataCalendarioComDiaSemana(data)
  if (dia === 'Vespera') {
    return TEXTOS_CRONOGRAMA_PUBLICO.vespera(extenso)
  }
  if (dia === 'DiaSeguinte') {
    return TEXTOS_CRONOGRAMA_PUBLICO.diaSeguinte(extenso)
  }
  return TEXTOS_CRONOGRAMA_PUBLICO.diaDoEvento
}

export function agruparRoteiro<T extends Pick<ItemCronogramaPublicoDto, 'dia' | 'data'> = ItemCronogramaPublicoDto>(
  itens: T[],
): GrupoRoteiro<T>[] {
  return DIAS_CRONOGRAMA.map((dia) => {
    const doDia = itens.filter((item) => item.dia === dia)
    return { dia, titulo: doDia.length > 0 ? tituloDia(dia, doDia[0]!.data) : '', itens: doDia }
  }).filter((grupo) => grupo.itens.length > 0)
}

export function ehHorarioDaCerimonia(
  item: Pick<ItemCronogramaPublicoDto, 'dia' | 'inicio'>,
  horarioCerimonia: string | null,
): boolean {
  return horarioCerimonia !== null && item.dia === 'DiaDoEvento' && item.inicio === horarioCerimonia
}

export function situacaoDestino(destino: Pick<DestinoLinkCronogramaDto, 'link'>): SituacaoLinkCronograma {
  if (!destino.link) {
    return 'semLink'
  }
  return destino.link.token ? 'ativo' : 'indisponivel'
}

export function rotuloDestino(destino: Pick<DestinoLinkCronogramaDto, 'tipo' | 'rotulo'>): string {
  return destino.tipo === 'Geral' ? TEXTOS_LINKS_CRONOGRAMA.equipeCompleta : (destino.rotulo ?? TEXTOS_LINKS_CRONOGRAMA.equipeCompleta)
}

export function chaveDestino(destino: Pick<DestinoLinkCronogramaDto, 'tipo' | 'fornecedorEventoId' | 'responsavel'>): string {
  if (destino.tipo === 'Fornecedor') {
    return `fornecedor:${destino.fornecedorEventoId ?? ''}`
  }
  if (destino.tipo === 'Responsavel') {
    return `responsavel:${destino.responsavel ?? ''}`
  }
  return 'geral'
}

export function requestDoDestino(
  destino: Pick<DestinoLinkCronogramaDto, 'tipo' | 'fornecedorEventoId' | 'responsavel'>,
): GerarLinkCronogramaRequest {
  if (destino.tipo === 'Fornecedor') {
    return { tipo: 'Fornecedor', fornecedorEventoId: destino.fornecedorEventoId }
  }
  if (destino.tipo === 'Responsavel') {
    return { tipo: 'Responsavel', responsavel: destino.responsavel }
  }
  return { tipo: 'Geral' }
}

export function montarMensagemCronograma(
  evento: DadosMensagemCronograma,
  destino: Pick<DestinoLinkCronogramaDto, 'tipo'>,
  url: string,
): string {
  const dados = {
    nomes: formatarNomesAnfitrioes(evento.nomePrimeiraPessoa, evento.nomeSegundaPessoa),
    data: formatarDataCalendarioExtenso(evento.data),
    url,
  }
  return destino.tipo === 'Geral' ? TEXTOS_LINKS_CRONOGRAMA.mensagemGeral(dados) : TEXTOS_LINKS_CRONOGRAMA.mensagemFiltrada(dados)
}

export function montarWhatsAppCronograma(
  evento: DadosMensagemCronograma,
  destino: Pick<DestinoLinkCronogramaDto, 'tipo' | 'telefone'>,
  url: string,
): string {
  const telefone = destino.tipo === 'Fornecedor' ? destino.telefone : null
  return montarLinkWhatsApp(telefone, montarMensagemCronograma(evento, destino, url))
}

export interface DadosLocaisOperacao {
  tipo: TipoEvento
  horarioCerimonia: string | null
  localCerimonia: string | null
  localRecepcao: string | null
}

export function montarLocaisOperacao(evento: DadosLocaisOperacao): { rotulo: string; valor: string }[] {
  const vocabulario = vocabularioDoTipo(evento.tipo)
  const lista: { rotulo: string; valor: string }[] = []
  if (evento.horarioCerimonia || evento.localCerimonia) {
    lista.push({
      rotulo: vocabulario.locais.principal,
      valor: evento.horarioCerimonia
        ? TEXTOS_CRONOGRAMA_PUBLICO.cerimoniaComHorario(evento.horarioCerimonia, evento.localCerimonia)
        : (evento.localCerimonia ?? ''),
    })
  }
  if (evento.localRecepcao) {
    lista.push({ rotulo: vocabulario.locais.secundario, valor: evento.localRecepcao })
  }
  return lista
}
