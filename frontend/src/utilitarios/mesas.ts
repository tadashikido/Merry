import { TEXTOS_MESAS } from '@/textos/mesas'
import type { MesaResumoDto } from '@/tipos/convidados'
import type { AvisoSaidaMesaDto, MapaMesasDto, MesaDto, PessoaMesaDto } from '@/tipos/mesas'
import { contemTexto, normalizarParaBusca } from '@/utilitarios/busca'
import { faixaConfirmacao } from '@/utilitarios/painelConfirmacoes'

export const GRUPO_SEM_GRUPO = '__sem-grupo__'
export const FILTRO_TODOS = '__todos__'

export interface FiltrosMesas {
  busca: string
  grupo: string
  convite: string
}

export interface OpcaoFiltro {
  valor: string
  rotulo: string
}

export interface GrupoConvite {
  conviteId: string
  convite: string
  pessoas: PessoaMesaDto[]
}

export interface MesaComPessoas {
  mesa: MesaDto
  pessoas: PessoaMesaDto[]
  visiveis: PessoaMesaDto[]
}

export interface OpcaoSentar {
  mesa: MesaDto
  livres: number
  cabe: boolean
  atual: boolean
}

export function rotuloMesa(
  mesa: Pick<MesaResumoDto, 'numero' | 'nome' | 'especial'>,
  rotuloEspecial: string = TEXTOS_MESAS.rotuloMesaAnfitrioes,
): string {
  if (mesa.especial && !mesa.nome) {
    return rotuloEspecial
  }
  return TEXTOS_MESAS.rotuloMesa(mesa.numero, mesa.nome)
}

export function rotuloMesaAviso(aviso: AvisoSaidaMesaDto, rotuloEspecial?: string): string | null {
  if (aviso.mesaNumero === null) {
    return null
  }
  return rotuloMesa({ numero: aviso.mesaNumero, nome: aviso.mesaNome, especial: aviso.mesaEspecial ?? false }, rotuloEspecial)
}

export function chaveGrupoMesa(grupo: string | null): string {
  const normalizado = normalizarParaBusca(grupo)
  return normalizado === '' ? GRUPO_SEM_GRUPO : normalizado
}

export function lugaresLivres(mesa: Pick<MesaDto, 'capacidade' | 'ocupacao'>): number {
  return Math.max(mesa.capacidade - mesa.ocupacao, 0)
}

export function filtrarPessoas(pessoas: readonly PessoaMesaDto[], filtros: FiltrosMesas): PessoaMesaDto[] {
  return pessoas.filter(
    (pessoa) =>
      contemTexto(filtros.busca, pessoa.nome, pessoa.convite) &&
      (filtros.grupo === FILTRO_TODOS || chaveGrupoMesa(pessoa.grupo) === filtros.grupo) &&
      (filtros.convite === FILTRO_TODOS || pessoa.conviteId === filtros.convite),
  )
}

export function filtrosAtivos(filtros: FiltrosMesas): boolean {
  return normalizarParaBusca(filtros.busca) !== '' || filtros.grupo !== FILTRO_TODOS || filtros.convite !== FILTRO_TODOS
}

export function opcoesGrupo(pessoas: readonly PessoaMesaDto[]): OpcaoFiltro[] {
  const grupos = new Map<string, string>()
  for (const pessoa of pessoas) {
    const chave = chaveGrupoMesa(pessoa.grupo)
    if (!grupos.has(chave)) {
      grupos.set(chave, chave === GRUPO_SEM_GRUPO ? TEXTOS_MESAS.semGrupo : (pessoa.grupo ?? TEXTOS_MESAS.semGrupo))
    }
  }
  const opcoes = [...grupos.entries()]
    .map(([valor, rotulo]) => ({ valor, rotulo }))
    .sort((a, b) => (a.valor === GRUPO_SEM_GRUPO ? 1 : b.valor === GRUPO_SEM_GRUPO ? -1 : a.rotulo.localeCompare(b.rotulo, 'pt-BR')))
  return [{ valor: FILTRO_TODOS, rotulo: TEXTOS_MESAS.filtroTodos }, ...opcoes]
}

export function opcoesConvite(pessoas: readonly PessoaMesaDto[]): OpcaoFiltro[] {
  const convites = new Map<string, string>()
  for (const pessoa of pessoas) {
    if (!convites.has(pessoa.conviteId)) {
      convites.set(pessoa.conviteId, pessoa.convite)
    }
  }
  return [
    { valor: FILTRO_TODOS, rotulo: TEXTOS_MESAS.filtroTodos },
    ...[...convites.entries()].map(([valor, rotulo]) => ({ valor, rotulo })),
  ]
}

export function agruparPorConvite(pessoas: readonly PessoaMesaDto[]): GrupoConvite[] {
  const grupos = new Map<string, GrupoConvite>()
  for (const pessoa of pessoas) {
    const grupo = grupos.get(pessoa.conviteId)
    if (grupo) {
      grupo.pessoas.push(pessoa)
    } else {
      grupos.set(pessoa.conviteId, { conviteId: pessoa.conviteId, convite: pessoa.convite, pessoas: [pessoa] })
    }
  }
  return [...grupos.values()]
}

export function conviteDeUmaPessoa(convite: string, pessoas: readonly Pick<PessoaMesaDto, 'nome'>[]): boolean {
  return pessoas.length === 1 && normalizarParaBusca(pessoas[0]?.nome) === normalizarParaBusca(convite)
}

export function mesasComPessoas(
  mesas: readonly MesaDto[],
  pessoas: readonly PessoaMesaDto[],
  visiveis: readonly PessoaMesaDto[],
): MesaComPessoas[] {
  const idsVisiveis = new Set(visiveis.map((pessoa) => pessoa.id))
  return mesas.map((mesa) => {
    const daMesa = pessoas.filter((pessoa) => pessoa.mesaId === mesa.id)
    return { mesa, pessoas: daMesa, visiveis: daMesa.filter((pessoa) => idsVisiveis.has(pessoa.id)) }
  })
}

export function semMesaDoConvite(pessoas: readonly PessoaMesaDto[], conviteId: string): PessoaMesaDto[] {
  return pessoas.filter((pessoa) => pessoa.conviteId === conviteId && pessoa.mesaId === null)
}

export function convitesDivididos(pessoas: readonly PessoaMesaDto[]): Set<string> {
  const destinos = new Map<string, Set<string>>()
  for (const pessoa of pessoas) {
    const conjunto = destinos.get(pessoa.conviteId) ?? new Set<string>()
    conjunto.add(pessoa.mesaId ?? '')
    destinos.set(pessoa.conviteId, conjunto)
  }
  const divididos = new Set<string>()
  for (const [conviteId, conjunto] of destinos) {
    const temMesa = [...conjunto].some((destino) => destino !== '')
    if (conjunto.size > 1 && temMesa) {
      divididos.add(conviteId)
    }
  }
  return divididos
}

export function descreverDivisao(
  pessoas: readonly PessoaMesaDto[],
  mesas: readonly MesaDto[],
  conviteId: string,
  rotuloEspecial?: string,
): string {
  const doConvite = pessoas.filter((pessoa) => pessoa.conviteId === conviteId)
  if (doConvite.length === 0) {
    return ''
  }
  const partes: string[] = []
  for (const mesa of mesas) {
    const quantidade = doConvite.filter((pessoa) => pessoa.mesaId === mesa.id).length
    if (quantidade > 0) {
      partes.push(TEXTOS_MESAS.divididoParteMesa(quantidade, rotuloMesa(mesa, rotuloEspecial)))
    }
  }
  const semMesa = doConvite.filter((pessoa) => pessoa.mesaId === null).length
  if (semMesa > 0) {
    partes.push(TEXTOS_MESAS.divididoParteSemMesa(semMesa))
  }
  return TEXTOS_MESAS.conviteDivididoDetalhe(doConvite[0]?.convite ?? '', partes)
}

export function opcoesSentar(mesas: readonly MesaDto[], selecionadas: readonly PessoaMesaDto[]): OpcaoSentar[] {
  return mesas.map((mesa) => {
    const chegando = selecionadas.filter((pessoa) => pessoa.mesaId !== mesa.id).length
    const livres = lugaresLivres(mesa)
    return {
      mesa,
      livres,
      cabe: chegando > 0 && chegando <= livres,
      atual: selecionadas.length > 0 && selecionadas.every((pessoa) => pessoa.mesaId === mesa.id),
    }
  })
}

export function rotuloMesaPorId(
  mesas: readonly MesaResumoDto[] | undefined,
  mesaId: string | null | undefined,
  rotuloEspecial?: string,
): string | null {
  if (!mesaId || !mesas) {
    return null
  }
  const mesa = mesas.find((item) => item.id === mesaId)
  return mesa ? rotuloMesa(mesa, rotuloEspecial) : null
}

export function descreverAviso(aviso: AvisoSaidaMesaDto, rotuloEspecial?: string): string {
  const motivo =
    aviso.resposta === 'Recusado'
      ? TEXTOS_MESAS.avisoRecusou
      : aviso.resposta === 'Pendente'
        ? TEXTOS_MESAS.avisoPendente
        : TEXTOS_MESAS.avisoConfirmou
  const rotulo = rotuloMesaAviso(aviso, rotuloEspecial)
  const saida = rotulo ? TEXTOS_MESAS.avisoSaiuDa(rotulo) : TEXTOS_MESAS.avisoMesaExcluida
  return `${motivo}, ${saida}`
}

export function proximoNumeroMesa(mesas: readonly Pick<MesaDto, 'numero'>[]): number {
  const usados = new Set(mesas.map((mesa) => mesa.numero))
  let numero = 1
  while (usados.has(numero) && numero < 999) {
    numero++
  }
  return numero
}

export interface SituacaoFechamentoMesas {
  lugares: number
  confirmados: number
  semMesa: number
  faltamLugares: number
  sobramLugares: number
  maximo: number | null
  faltariamSeTodosVierem: number | null
  mesaEspecial: MesaDto | null
  completas: number
  vazias: number
  criancasSemMesa: number
  convitesDivididos: number
}

export function situacaoFechamentoMesas(
  mapa: Pick<MapaMesasDto, 'mesas' | 'pessoas' | 'totais'>,
  pendentes: number | null,
): SituacaoFechamentoMesas {
  const { totais, mesas, pessoas } = mapa
  const projecao = pendentes !== null && pendentes > 0 ? faixaConfirmacao(totais.confirmados, pendentes).maximo : null
  return {
    lugares: totais.capacidadeTotal,
    confirmados: totais.confirmados,
    semMesa: totais.semMesa,
    faltamLugares: Math.max(totais.semMesa - totais.lugaresLivres, 0),
    sobramLugares: Math.max(totais.lugaresLivres - totais.semMesa, 0),
    maximo: projecao,
    faltariamSeTodosVierem: projecao === null ? null : Math.max(projecao - totais.capacidadeTotal, 0),
    mesaEspecial: mesas.find((mesa) => mesa.especial) ?? null,
    completas: mesas.filter((mesa) => mesa.capacidade > 0 && mesa.ocupacao >= mesa.capacidade).length,
    vazias: mesas.filter((mesa) => mesa.ocupacao === 0).length,
    criancasSemMesa: pessoas.filter((pessoa) => pessoa.mesaId === null && pessoa.faixaEtaria === 'Crianca').length,
    convitesDivididos: convitesDivididos(pessoas).size,
  }
}

export interface GrupoSemMesa {
  chave: string
  rotulo: string
  quantidade: number
}

export function semMesaPorGrupo(pessoas: readonly PessoaMesaDto[]): GrupoSemMesa[] {
  const grupos = new Map<string, GrupoSemMesa>()
  for (const pessoa of pessoas) {
    if (pessoa.mesaId !== null) {
      continue
    }
    const chave = chaveGrupoMesa(pessoa.grupo)
    const existente = grupos.get(chave)
    if (existente) {
      existente.quantidade += 1
    } else {
      const rotulo = chave === GRUPO_SEM_GRUPO ? TEXTOS_MESAS.semGrupo : (pessoa.grupo?.trim() ?? TEXTOS_MESAS.semGrupo)
      grupos.set(chave, { chave, rotulo, quantidade: 1 })
    }
  }
  return [...grupos.values()].sort((a, b) => {
    if (a.chave === GRUPO_SEM_GRUPO || b.chave === GRUPO_SEM_GRUPO) {
      return a.chave === GRUPO_SEM_GRUPO ? 1 : -1
    }
    return b.quantidade - a.quantidade || a.rotulo.localeCompare(b.rotulo, 'pt-BR')
  })
}
