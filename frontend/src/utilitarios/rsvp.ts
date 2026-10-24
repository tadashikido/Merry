import { tratamentoDoConvite } from '@/textos/acessoAnfitriao'
import { TEXTOS_COBRANCA } from '@/textos/confirmacoes'
import { TEXTOS_ENVIO_CONVITE } from '@/textos/rsvp'
import { aceitaSegundoNome, ehTipoEvento, vocabularioDoTipo, vocabularioOuNeutro } from '@/textos/tiposEvento'
import type { EventoDto, DataCalendario, TipoEvento } from '@/tipos/eventos'
import type { ConviteDto } from '@/tipos/convidados'
import type { EscolhaPresencaRsvp, PessoaRsvpDto } from '@/tipos/rsvp'
import { diferencaEmDias, lerDataCalendario, paraInstanteUtc } from '@/utilitarios/dataCalendario'
import { formatarDataCalendarioExtenso, formatarNomesEmFrase } from '@/utilitarios/formatacao'

export const PADRAO_TOKEN_RSVP = /^[A-Za-z0-9_-]{43}$/
export const DIAS_ANTECEDENCIA_PADRAO_RSVP = 10
export const URL_WHATSAPP = 'https://wa.me/'
const CODIGO_BRASIL = '55'
const MILISSEGUNDOS_DIA = 86_400_000

export function tokenRsvpValido(token: string | null | undefined): boolean {
  return PADRAO_TOKEN_RSVP.test(token ?? '')
}

export function montarUrlRsvp(token: string, origem: string = window.location.origin): string {
  return `${origem.replace(/\/+$/, '')}/rsvp/${encodeURIComponent(token)}`
}

export const PARAMETRO_PREVIA_RSVP = 'previa'

export function montarUrlPrevia(token: string, origem: string = window.location.origin): string {
  return `${montarUrlRsvp(token, origem)}?${PARAMETRO_PREVIA_RSVP}=1`
}

export function primeiroTelefone(convite: Pick<ConviteDto, 'convidados'>): string | null {
  return convite.convidados.find((convidado) => Boolean(convidado.telefone))?.telefone ?? null
}

export function telefoneWhatsApp(telefone: string | null | undefined): string | null {
  const texto = (telefone ?? '').trim()
  if (texto === '') {
    return null
  }
  const digitos = texto.replace(/\D/g, '')
  if (texto.startsWith('+')) {
    return digitos.length >= 10 ? digitos : null
  }
  if (digitos.length === 10 || digitos.length === 11) {
    return `${CODIGO_BRASIL}${digitos}`
  }
  return digitos.length >= 12 && digitos.length <= 15 ? digitos : null
}

export function montarLinkWhatsApp(telefone: string | null | undefined, mensagem: string): string {
  const numero = telefoneWhatsApp(telefone)
  return `${URL_WHATSAPP}${numero ?? ''}?text=${encodeURIComponent(mensagem)}`
}

export function montarMensagemConvite(
  evento: Pick<EventoDto, 'tipo' | 'nomePrimeiraPessoa' | 'nomeSegundaPessoa' | 'data' | 'dataLimiteRsvpEfetiva'>,
  convite: Pick<ConviteDto, 'nome'>,
  url: string,
): string {
  const varios = Boolean(evento.nomeSegundaPessoa?.trim())
  const nomes = formatarNomesEmFrase(evento.nomePrimeiraPessoa, evento.nomeSegundaPessoa)
  return TEXTOS_ENVIO_CONVITE.mensagemPronta({
    nomeConvite: convite.nome,
    celebracao: vocabularioDoTipo(evento.tipo).celebracao(nomes, varios),
    varios,
    data: formatarDataCalendarioExtenso(evento.data),
    dataLimite: formatarDiaMes(evento.dataLimiteRsvpEfetiva),
    url,
  })
}

export function montarMensagemLembrete(
  evento: Pick<EventoDto, 'nomePrimeiraPessoa' | 'nomeSegundaPessoa' | 'data' | 'dataLimiteRsvpEfetiva'>,
  convite: Pick<ConviteDto, 'nome'>,
  url: string,
): string {
  return TEXTOS_COBRANCA.mensagemLembrete({
    nomeConvite: convite.nome,
    nomes: formatarNomesEmFrase(evento.nomePrimeiraPessoa, evento.nomeSegundaPessoa),
    data: formatarDataCalendarioExtenso(evento.data),
    dataLimite: formatarDiaMes(evento.dataLimiteRsvpEfetiva),
    url,
  })
}

export function formatarDiaMes(data: DataCalendario): string {
  const extenso = formatarDataCalendarioExtenso(data)
  return extenso.replace(/ de \d{4}$/, '')
}

export function formatarHorarioConvite(horario: string | null | undefined): string | null {
  const correspondencia = /^(\d{2}):(\d{2})$/.exec(horario ?? '')
  if (!correspondencia) {
    return null
  }
  const [, horas, minutos] = correspondencia
  return minutos === '00' ? `${Number(horas)}h` : `${Number(horas)}h${minutos}`
}

export function dataLimitePadrao(dataEvento: DataCalendario | null | undefined): DataCalendario | null {
  if (!lerDataCalendario(dataEvento)) {
    return null
  }
  const instante = paraInstanteUtc(dataEvento as DataCalendario)
  if (!instante) {
    return null
  }
  return new Date(instante.getTime() - DIAS_ANTECEDENCIA_PADRAO_RSVP * MILISSEGUNDOS_DIA).toISOString().slice(0, 10)
}

export function escolhaInicial(pessoa: Pick<PessoaRsvpDto, 'resposta'>): EscolhaPresencaRsvp | null {
  return pessoa.resposta === 'Pendente' ? null : pessoa.resposta
}

export const URL_BUSCA_MAPA = 'https://www.google.com/maps/search/?api=1&query='

export interface LocalConvite {
  chave: 'principal' | 'secundario'
  rotulo: string
  valor: string
}

export function segundoNomeDoConvite(tipo: TipoEvento | null | undefined, segundo: string | null | undefined): string | null {
  const nome = segundo?.trim()
  if (!nome) {
    return null
  }
  return ehTipoEvento(tipo) && !aceitaSegundoNome(tipo) ? null : nome
}

export function celebracaoDoConvite(
  tipo: TipoEvento | null | undefined,
  primeiro: string,
  segundo: string | null | undefined,
): string {
  const outro = segundoNomeDoConvite(tipo, segundo)
  const nomes = formatarNomesEmFrase(primeiro, outro)
  const frase = vocabularioOuNeutro(tipo).celebracao(nomes, tratamentoDoConvite(outro) === 'plural')
  return frase.startsWith(nomes) ? frase.slice(nomes.length).trim() : frase
}

export interface LocaisDoConviteEntrada {
  tipo: TipoEvento | null | undefined
  localCerimonia?: string | null
  localRecepcao?: string | null
}

export function locaisDoConvite(evento: LocaisDoConviteEntrada): LocalConvite[] {
  const vocabulario = vocabularioOuNeutro(evento.tipo)
  const principal = evento.localCerimonia?.trim() ?? ''
  const secundario = evento.localRecepcao?.trim() ?? ''
  const locais: LocalConvite[] = []
  if (principal) {
    locais.push({ chave: 'principal', rotulo: vocabulario.locais.principal, valor: principal })
  }
  if (secundario && secundario.toLocaleLowerCase('pt-BR') !== principal.toLocaleLowerCase('pt-BR')) {
    locais.push({ chave: 'secundario', rotulo: vocabulario.locais.secundario, valor: secundario })
  }
  return locais
}

export function linkMapaDoLocal(local: string): string {
  return `${URL_BUSCA_MAPA}${encodeURIComponent(local.trim())}`
}

export function diasAteOEvento(data: DataCalendario, hoje: DataCalendario): number | null {
  return diferencaEmDias(hoje, data)
}
