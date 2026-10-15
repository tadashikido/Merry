import { TEXTOS_COBRANCA } from '@/textos/confirmacoes'
import { TEXTOS_ENVIO_CONVITE } from '@/textos/rsvp'
import type { CasamentoDto, DataCalendario } from '@/tipos/casamentos'
import type { ConviteDto } from '@/tipos/convidados'
import type { EscolhaPresencaRsvp, PessoaRsvpDto } from '@/tipos/rsvp'
import { lerDataCalendario, paraInstanteUtc } from '@/utilitarios/dataCalendario'
import { formatarDataCalendarioExtenso } from '@/utilitarios/formatacao'

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
  casamento: Pick<CasamentoDto, 'nomePrimeiraPessoa' | 'nomeSegundaPessoa' | 'data' | 'dataLimiteRsvpEfetiva'>,
  convite: Pick<ConviteDto, 'nome'>,
  url: string,
): string {
  return TEXTOS_ENVIO_CONVITE.mensagemPronta({
    nomeConvite: convite.nome,
    primeiro: casamento.nomePrimeiraPessoa,
    segundo: casamento.nomeSegundaPessoa,
    data: formatarDataCalendarioExtenso(casamento.data),
    dataLimite: formatarDiaMes(casamento.dataLimiteRsvpEfetiva),
    url,
  })
}

export function montarMensagemLembrete(
  casamento: Pick<CasamentoDto, 'nomePrimeiraPessoa' | 'nomeSegundaPessoa' | 'data' | 'dataLimiteRsvpEfetiva'>,
  convite: Pick<ConviteDto, 'nome'>,
  url: string,
): string {
  return TEXTOS_COBRANCA.mensagemLembrete({
    nomeConvite: convite.nome,
    primeiro: casamento.nomePrimeiraPessoa,
    segundo: casamento.nomeSegundaPessoa,
    data: formatarDataCalendarioExtenso(casamento.data),
    dataLimite: formatarDiaMes(casamento.dataLimiteRsvpEfetiva),
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

export function dataLimitePadrao(dataCasamento: DataCalendario | null | undefined): DataCalendario | null {
  if (!lerDataCalendario(dataCasamento)) {
    return null
  }
  const instante = paraInstanteUtc(dataCasamento as DataCalendario)
  if (!instante) {
    return null
  }
  return new Date(instante.getTime() - DIAS_ANTECEDENCIA_PADRAO_RSVP * MILISSEGUNDOS_DIA).toISOString().slice(0, 10)
}

export function escolhaInicial(pessoa: Pick<PessoaRsvpDto, 'resposta'>): EscolhaPresencaRsvp | null {
  return pessoa.resposta === 'Pendente' ? null : pessoa.resposta
}
