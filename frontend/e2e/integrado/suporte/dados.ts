const DOMINIO_TESTE = 'e2e.teste'

function sufixoUnico(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

export function emailUnico(prefixo: string): string {
  return `${prefixo}+${sufixoUnico()}@${DOMINIO_TESTE}`
}

export function nomeUnico(prefixo: string): string {
  return `${prefixo} ${sufixoUnico().slice(-6)}`
}

export function senhaValida(): string {
  return `Senha${sufixoUnico()}9`
}

export function dataFutura(dias = 180): string {
  const data = new Date()
  data.setDate(data.getDate() + dias)
  return data.toISOString().slice(0, 10)
}

export interface Credenciais {
  email: string
  senha: string
}

export interface DadosAssessoria extends Credenciais {
  nomeAssessoria: string
  nome: string
}

export function novaAssessoria(): DadosAssessoria {
  return {
    nomeAssessoria: nomeUnico('Assessoria E2E'),
    nome: 'Ana Cerimonialista',
    email: emailUnico('assessoria'),
    senha: senhaValida(),
  }
}

export interface DadosCasal {
  nomePrimeiraPessoa: string
  nomeSegundaPessoa: string
}

export function novoCasal(): DadosCasal {
  const sufixo = sufixoUnico().slice(-4)
  return {
    nomePrimeiraPessoa: `Marina ${sufixo}`,
    nomeSegundaPessoa: `Rafael ${sufixo}`,
  }
}

export function nomesDoCasal(casal: DadosCasal): RegExp {
  return new RegExp(`${casal.nomePrimeiraPessoa}.*${casal.nomeSegundaPessoa}`)
}

const MINUTOS_POR_DIA = 1440
const DIAS_RELATIVOS = ['Vespera', 'DiaDoCasamento', 'DiaSeguinte'] as const

function partesEmSaoPaulo(): Record<string, string> {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  return Object.fromEntries(partes.map((parte) => [parte.type, parte.value]))
}

export function hojeEmSaoPaulo(): string {
  const partes = partesEmSaoPaulo()
  return `${partes.year}-${partes.month}-${partes.day}`
}

export function minutoAgoraEmSaoPaulo(): number {
  const partes = partesEmSaoPaulo()
  return Number(partes.hour) * 60 + Number(partes.minute)
}

export function posicaoNoRoteiro(minutoAbsoluto: number): { dia: (typeof DIAS_RELATIVOS)[number]; inicio: string } {
  const indiceDia = Math.floor(minutoAbsoluto / MINUTOS_POR_DIA)
  const minutosNoDia = minutoAbsoluto - indiceDia * MINUTOS_POR_DIA
  const horas = String(Math.floor(minutosNoDia / 60)).padStart(2, '0')
  const minutos = String(minutosNoDia % 60).padStart(2, '0')
  return { dia: DIAS_RELATIVOS[indiceDia + 1]!, inicio: `${horas}:${minutos}` }
}
