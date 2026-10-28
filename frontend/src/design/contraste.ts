import { cores, fases, paletas, tonsCelebracao, type FaseEvento, type TomCelebracao } from './tokens'

export type NivelContraste = 'texto' | 'textoGrande' | 'componente'

export interface ParContraste {
  descricao: string
  frente: string
  fundo: string
  nivel: NivelContraste
}

export const MINIMO_CONTRASTE: Record<NivelContraste, number> = {
  texto: 4.5,
  textoGrande: 3,
  componente: 3,
}

function canalLinear(canal: number): number {
  const normalizado = canal / 255
  return normalizado <= 0.04045 ? normalizado / 12.92 : ((normalizado + 0.055) / 1.055) ** 2.4
}

export function luminanciaRelativa(hex: string): number {
  const valor = hex.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(valor)) {
    throw new Error(`Cor inválida: ${hex}`)
  }
  const vermelho = canalLinear(parseInt(valor.slice(0, 2), 16))
  const verde = canalLinear(parseInt(valor.slice(2, 4), 16))
  const azul = canalLinear(parseInt(valor.slice(4, 6), 16))
  return 0.2126 * vermelho + 0.7152 * verde + 0.0722 * azul
}

export function razaoContraste(corA: string, corB: string): number {
  const [clara, escura] = [luminanciaRelativa(corA), luminanciaRelativa(corB)].sort((a, b) => b - a) as [number, number]
  return (clara + 0.05) / (escura + 0.05)
}

export function atendeContraste(par: ParContraste): boolean {
  return razaoContraste(par.frente, par.fundo) >= MINIMO_CONTRASTE[par.nivel]
}

export const PARES_CONTRASTE: ParContraste[] = [
  { descricao: 'Texto principal sobre superfície', frente: cores.texto, fundo: cores.superficie, nivel: 'texto' },
  { descricao: 'Texto principal sobre fundo', frente: cores.texto, fundo: cores.fundo, nivel: 'texto' },
  { descricao: 'Texto secundário sobre superfície', frente: cores.textoSecundario, fundo: cores.superficie, nivel: 'texto' },
  { descricao: 'Texto secundário sobre fundo', frente: cores.textoSecundario, fundo: cores.fundo, nivel: 'texto' },
  { descricao: 'Texto de apoio sobre superfície', frente: cores.textoApoio, fundo: cores.superficie, nivel: 'texto' },
  { descricao: 'Texto de apoio sobre fundo', frente: cores.textoApoio, fundo: cores.fundo, nivel: 'texto' },
  { descricao: 'Texto de apoio sobre superfície sutil', frente: cores.textoApoio, fundo: cores.superficieSutil, nivel: 'texto' },
  { descricao: 'Texto secundário sobre neutro suave', frente: cores.textoSecundario, fundo: cores.neutroSuave, nivel: 'texto' },
  { descricao: 'Texto principal sobre primária suave', frente: cores.texto, fundo: cores.primariaSuave, nivel: 'texto' },
  { descricao: 'Item ativo da navegação do evento', frente: cores.primaria, fundo: cores.primariaSuave, nivel: 'texto' },
  { descricao: 'Texto de apoio sobre primária suave', frente: cores.textoApoio, fundo: cores.primariaSuave, nivel: 'texto' },
  { descricao: 'Placeholder sobre campo', frente: cores.placeholder, fundo: cores.superficie, nivel: 'texto' },
  { descricao: 'Botão primário', frente: cores.superficie, fundo: cores.primaria, nivel: 'texto' },
  { descricao: 'Botão primário em hover', frente: cores.superficie, fundo: cores.primariaEscura, nivel: 'texto' },
  { descricao: 'Botão secundário', frente: cores.texto, fundo: cores.superficie, nivel: 'texto' },
  { descricao: 'Botão ghost sobre superfície', frente: cores.primaria, fundo: cores.superficie, nivel: 'texto' },
  { descricao: 'Botão destrutivo', frente: cores.superficie, fundo: cores.erro, nivel: 'texto' },
  { descricao: 'Link sobre superfície', frente: cores.primaria, fundo: cores.superficie, nivel: 'texto' },
  { descricao: 'Link sobre fundo', frente: cores.primaria, fundo: cores.fundo, nivel: 'texto' },
  { descricao: 'Rail: ícone inativo', frente: cores.railIcone, fundo: cores.rail, nivel: 'texto' },
  { descricao: 'Rail: ícone ativo sobre centelha', frente: cores.railAtivoIcone, fundo: cores.railAtivo, nivel: 'texto' },
  { descricao: 'Rail: centelha ativa sobre o rail', frente: cores.railAtivo, fundo: cores.rail, nivel: 'componente' },
  { descricao: 'Rail: inicial do usuário', frente: cores.lateralEscuraTexto, fundo: cores.railAvatar, nivel: 'texto' },
  { descricao: 'Gaveta: item inativo', frente: cores.navegacaoTexto, fundo: cores.navegacao, nivel: 'texto' },
  { descricao: 'Gaveta: item ativo', frente: cores.navegacaoAtivo, fundo: cores.primariaSuave, nivel: 'texto' },
  { descricao: 'Título meia-noite sobre névoa', frente: cores.titulo, fundo: cores.fundo, nivel: 'texto' },
  { descricao: 'Título meia-noite sobre superfície', frente: cores.titulo, fundo: cores.superficie, nivel: 'texto' },
  { descricao: 'Botão destaque', frente: cores.destaqueTexto, fundo: cores.destaque, nivel: 'texto' },
  { descricao: 'Botão de ação de linha', frente: cores.titulo, fundo: cores.primariaSuave, nivel: 'texto' },
  { descricao: 'Aba segmentada inativa sobre o trilho', frente: cores.textoApoio, fundo: cores.trilho, nivel: 'texto' },
  { descricao: 'Lateral escura: texto', frente: cores.lateralEscuraTexto, fundo: cores.lateralEscura, nivel: 'texto' },
  { descricao: 'Lateral escura: apoio', frente: cores.lateralEscuraApoio, fundo: cores.lateralEscura, nivel: 'texto' },
  { descricao: 'Lateral escura: rótulo em centelha', frente: cores.centelha, fundo: cores.lateralEscura, nivel: 'texto' },
  { descricao: '“&” em centelha texto sobre superfície (≥ 24 px)', frente: cores.centelhaTexto, fundo: cores.superficie, nivel: 'textoGrande' },
  { descricao: '“&” em centelha texto sobre névoa (≥ 24 px)', frente: cores.centelhaTexto, fundo: cores.fundo, nivel: 'textoGrande' },
  { descricao: 'Filtro em pílula ativo', frente: cores.superficie, fundo: cores.primaria, nivel: 'texto' },
  { descricao: 'Badge neutro', frente: paletas.neutro[700], fundo: paletas.neutro[200], nivel: 'texto' },
  { descricao: 'Badge de sucesso', frente: paletas.sucesso[700], fundo: paletas.sucesso[100], nivel: 'texto' },
  { descricao: 'Badge de alerta', frente: paletas.alerta[700], fundo: paletas.alerta[100], nivel: 'texto' },
  { descricao: 'Badge de erro', frente: paletas.erro[700], fundo: paletas.erro[100], nivel: 'texto' },
  { descricao: 'Badge informativo', frente: paletas.meiaNoite[600], fundo: paletas.meiaNoite[100], nivel: 'texto' },
  { descricao: 'Badge primário', frente: paletas.meiaNoite[600], fundo: paletas.meiaNoite[100], nivel: 'texto' },
  { descricao: 'Toast: mensagem', frente: cores.toastTexto, fundo: cores.toast, nivel: 'texto' },
  { descricao: 'Toast: detalhe', frente: cores.toastApoio, fundo: cores.toast, nivel: 'texto' },
  { descricao: 'Toast: ação Desfazer', frente: cores.toastAcao, fundo: cores.toast, nivel: 'texto' },
  { descricao: 'Toast: ícone de sucesso', frente: cores.toastSucesso, fundo: cores.toast, nivel: 'componente' },
  { descricao: 'Toast: ícone de erro', frente: cores.toastErro, fundo: cores.toast, nivel: 'componente' },
  { descricao: 'Mensagem de erro de campo', frente: cores.erro, fundo: cores.superficie, nivel: 'texto' },
  { descricao: 'Mensagem de formulário de erro', frente: cores.erroTexto, fundo: cores.erroSuave, nivel: 'texto' },
  { descricao: 'Mensagem de formulário de sucesso', frente: cores.sucessoTexto, fundo: cores.sucessoSuave, nivel: 'texto' },
  { descricao: 'Mensagem de formulário informativa', frente: cores.informacaoTexto, fundo: cores.informacaoSuave, nivel: 'texto' },
  { descricao: 'Aviso de dados incompletos', frente: cores.alertaForte, fundo: cores.alertaSuave, nivel: 'texto' },
  { descricao: 'Texto principal sobre tint de erro', frente: cores.texto, fundo: cores.erroSuave, nivel: 'texto' },
  { descricao: 'Requisito de senha atendido', frente: cores.sucesso, fundo: cores.superficie, nivel: 'texto' },
  { descricao: 'Alerta sobre superfície', frente: cores.alerta, fundo: cores.superficie, nivel: 'texto' },
  { descricao: 'Informação sobre superfície', frente: cores.informacao, fundo: cores.superficie, nivel: 'texto' },
  { descricao: 'Acento de texto sobre superfície', frente: cores.acentoTexto, fundo: cores.superficie, nivel: 'texto' },
  { descricao: '“&” dos nomes dos anfitriões sobre fundo', frente: cores.acentoTexto, fundo: cores.fundo, nivel: 'texto' },
  { descricao: '“&” dos nomes dos anfitriões sobre fundo dos anfitriões', frente: cores.acentoTexto, fundo: cores.fundoAnfitriao, nivel: 'texto' },
  { descricao: 'Número da contagem regressiva', frente: cores.primaria, fundo: cores.superficie, nivel: 'textoGrande' },
  { descricao: 'Borda de campo sobre superfície', frente: cores.bordaCampo, fundo: cores.superficie, nivel: 'componente' },
  { descricao: 'Borda de campo sobre fundo', frente: cores.bordaCampo, fundo: cores.fundo, nivel: 'componente' },
  { descricao: 'Anel de foco sobre primária suave', frente: cores.primaria, fundo: cores.primariaSuave, nivel: 'componente' },
  { descricao: 'Selo concluído em verde de sucesso sobre superfície', frente: cores.sucesso, fundo: cores.superficie, nivel: 'texto' },
  { descricao: 'Texto sobre verde de sucesso', frente: cores.superficie, fundo: cores.sucesso, nivel: 'texto' },
  { descricao: 'Anel de foco sobre superfície', frente: cores.primaria, fundo: cores.superficie, nivel: 'componente' },
  { descricao: 'Anel de foco sobre fundo', frente: cores.primaria, fundo: cores.fundo, nivel: 'componente' },
  { descricao: 'Convite: texto sobre fundo do convite', frente: cores.texto, fundo: cores.fundoConvite, nivel: 'texto' },
  { descricao: 'Convite: texto público sobre fundo do convite', frente: cores.textoPublico, fundo: cores.fundoConvite, nivel: 'texto' },
  { descricao: 'Convite: apoio público sobre fundo do convite', frente: cores.apoioPublico, fundo: cores.fundoConvite, nivel: 'texto' },
  { descricao: 'Convite: apoio público sobre cartão', frente: cores.apoioPublico, fundo: cores.cartaoConvite, nivel: 'texto' },
  { descricao: 'Convite: “&” em acento sobre cartão', frente: cores.acentoTexto, fundo: cores.cartaoConvite, nivel: 'texto' },
  { descricao: 'Convite: “&” em acento sobre fundo do convite', frente: cores.acentoTexto, fundo: cores.fundoConvite, nivel: 'texto' },
  { descricao: 'Convite: opção marcada', frente: cores.primaria, fundo: cores.primariaSuave, nivel: 'texto' },
  { descricao: 'Convite: botão primário', frente: cores.superficie, fundo: cores.primaria, nivel: 'texto' },
  { descricao: 'Orçamento: régua contratada sobre trilho', frente: cores.primaria, fundo: cores.trilho, nivel: 'componente' },
  { descricao: 'Orçamento: régua acima do orçado sobre trilho', frente: cores.alertaTexto, fundo: cores.trilho, nivel: 'componente' },
  { descricao: 'Orçamento: total contratado (serifa) sobre superfície', frente: cores.primaria, fundo: cores.superficie, nivel: 'textoGrande' },
  { descricao: 'Fornecedores: categoria do índice em foco do ponteiro', frente: cores.texto, fundo: cores.superficieSutil, nivel: 'texto' },
  { descricao: 'Fornecedores: canal de contato em foco do ponteiro', frente: cores.primaria, fundo: cores.superficieSutil, nivel: 'texto' },
  { descricao: 'Fornecedores: contagem editorial do índice sobre o fundo', frente: cores.primaria, fundo: cores.fundo, nivel: 'texto' },
  { descricao: 'Financeiro: dia da parcela vencida sobre superfície', frente: cores.erroTexto, fundo: cores.superficie, nivel: 'texto' },
  { descricao: 'Financeiro: dia da parcela que vence em breve sobre superfície', frente: cores.alertaTexto, fundo: cores.superficie, nivel: 'texto' },
  { descricao: 'Duplicação: aviso de tarefas atrasadas sobre fundo', frente: cores.alertaTexto, fundo: cores.fundo, nivel: 'texto' },
  { descricao: 'Financeiro: rótulo da linha do hoje sobre superfície', frente: cores.erroTexto, fundo: cores.superficie, nivel: 'texto' },
  { descricao: 'Financeiro: traço da linha do hoje sobre superfície', frente: cores.erro, fundo: cores.superficie, nivel: 'componente' },
  { descricao: 'Financeiro: camada paga junto da camada a pagar', frente: cores.primariaEscura, fundo: cores.acento, nivel: 'componente' },
  { descricao: 'Financeiro: total pago (serifa) sobre superfície', frente: cores.primaria, fundo: cores.superficie, nivel: 'textoGrande' },
  { descricao: 'Financeiro: hachura do orçamento livre sobre trilho', frente: cores.bordaCampo, fundo: cores.trilho, nivel: 'componente' },
  { descricao: 'Financeiro: indicador vencido sobre superfície', frente: cores.erroTexto, fundo: cores.superficie, nivel: 'textoGrande' },
  { descricao: 'Operação: texto sobre fundo', frente: cores.operacaoTexto, fundo: cores.operacaoFundo, nivel: 'texto' },
  { descricao: 'Operação: apoio sobre fundo', frente: cores.operacaoApoio, fundo: cores.operacaoFundo, nivel: 'texto' },
  { descricao: 'Operação: texto sobre superfície', frente: cores.operacaoTexto, fundo: cores.operacaoSuperficie, nivel: 'texto' },
  { descricao: 'Operação: apoio sobre superfície', frente: cores.operacaoApoio, fundo: cores.operacaoSuperficie, nivel: 'texto' },
  { descricao: 'Operação: destaque sobre fundo', frente: cores.operacaoDestaque, fundo: cores.operacaoFundo, nivel: 'texto' },
  { descricao: 'Operação: destaque sobre superfície', frente: cores.operacaoDestaque, fundo: cores.operacaoSuperficie, nivel: 'texto' },
  { descricao: 'Operação: selo feito sobre fundo', frente: cores.operacaoSucesso, fundo: cores.operacaoFundo, nivel: 'texto' },
  { descricao: 'Operação: anel de foco sobre fundo', frente: cores.operacaoDestaque, fundo: cores.operacaoFundo, nivel: 'componente' },
  { descricao: 'Operação: nó do fio sobre fundo', frente: cores.operacaoApoio, fundo: cores.operacaoFundo, nivel: 'componente' },
  { descricao: 'Grande Dia: texto do cartão Agora', frente: cores.operacaoCartaoTexto, fundo: cores.operacaoCartao, nivel: 'texto' },
  { descricao: 'Grande Dia: apoio do cartão Agora', frente: cores.operacaoCartaoApoio, fundo: cores.operacaoCartao, nivel: 'texto' },
  { descricao: 'Grande Dia: contorno do contato no cartão Agora', frente: cores.operacaoCartaoApoio, fundo: cores.operacaoCartao, nivel: 'componente' },
  { descricao: 'Grande Dia: selo ao vivo', frente: cores.operacaoAoVivo, fundo: cores.operacaoAoVivoFundo, nivel: 'texto' },
  { descricao: 'Grande Dia: ação principal', frente: cores.operacaoAcaoTexto, fundo: cores.operacaoAcao, nivel: 'texto' },
  { descricao: 'Grande Dia: ação principal sobre fundo', frente: cores.operacaoAcao, fundo: cores.operacaoFundo, nivel: 'componente' },
  { descricao: 'Grande Dia: relógio sobre superfície', frente: cores.operacaoTexto, fundo: cores.operacaoSuperficie, nivel: 'textoGrande' },
  { descricao: 'Grande Dia: anel de foco sobre o cartão Agora', frente: cores.acentoTexto, fundo: cores.operacaoCartao, nivel: 'componente' },
  ...paresDosTons(),
  ...paresDasFases(),
]

function paresDosTons(): ParContraste[] {
  return (Object.keys(tonsCelebracao) as TomCelebracao[]).flatMap((tom) => {
    const cor = tonsCelebracao[tom]
    return [
      { descricao: `Tom ${tom}: tinta sobre fundo`, frente: cor.tinta, fundo: cor.fundo, nivel: 'texto' as const },
      { descricao: `Tom ${tom}: nome em tinta profunda sobre fundo`, frente: cor.tintaProfunda, fundo: cor.fundo, nivel: 'texto' as const },
      { descricao: `Tom ${tom}: data sobre fundo`, frente: cor.data, fundo: cor.fundo, nivel: 'texto' as const },
      { descricao: `Tom ${tom}: título meia-noite sobre fundo`, frente: cores.titulo, fundo: cor.fundo, nivel: 'texto' as const },
    ]
  })
}

function paresDasFases(): ParContraste[] {
  return (Object.keys(fases) as FaseEvento[]).flatMap((fase) => [
    { descricao: `Fase ${fase}: rótulo sobre fundo`, frente: fases[fase].texto, fundo: fases[fase].fundo, nivel: 'texto' as const },
    { descricao: `Fase ${fase}: ponto sobre fundo`, frente: fases[fase].ponto, fundo: fases[fase].fundo, nivel: 'componente' as const },
  ])
}
