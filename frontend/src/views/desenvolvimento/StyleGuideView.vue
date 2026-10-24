<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'

import LayoutPainel from '@/layouts/LayoutPainel.vue'
import LayoutPublico from '@/layouts/LayoutPublico.vue'
import LayoutAutenticacao from '@/layouts/LayoutAutenticacao.vue'
import NavegacaoEvento from '@/layouts/NavegacaoEvento.vue'
import RailNavegacao from '@/layouts/RailNavegacao.vue'
import { ITENS_RAIL_ASSESSORIA } from '@/layouts/menuPainel'
import { gruposNavegacaoEvento } from '@/layouts/modulosEvento'
import type { ContextoEvento, ItemRail } from '@/layouts/tipos'
import EstadoPrimeiroAcesso from '@/componentes/base/EstadoPrimeiroAcesso.vue'
import { NOMES_ICONES } from '@/design/icones'
import CabecalhoPagina from '@/componentes/base/CabecalhoPagina.vue'
import CanaisContato from '@/componentes/base/CanaisContato.vue'
import IndiceCategorias from '@/componentes/base/IndiceCategorias.vue'
import LinhaFornecedor from '@/componentes/base/LinhaFornecedor.vue'
import { TEXTOS_FORNECEDORES } from '@/textos/fornecedores'
import type { CategoriaFornecedor, FornecedorResumoDto } from '@/tipos/fornecedores'
import { agruparPorCategoria, contarPorCategoria } from '@/utilitarios/fornecedores'
import ListagemDados from '@/componentes/base/ListagemDados.vue'
import CampoFormulario from '@/componentes/base/CampoFormulario.vue'
import EstadoVazio from '@/componentes/base/EstadoVazio.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import BadgeStatus from '@/componentes/base/BadgeStatus.vue'
import MarcaProduto from '@/componentes/base/MarcaProduto.vue'
import CampoSenha from '@/componentes/base/CampoSenha.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import IndicadorAbertura from '@/componentes/base/IndicadorAbertura.vue'
import ResumoUsuario from '@/componentes/base/ResumoUsuario.vue'
import NomesAnfitrioes from '@/componentes/base/NomesAnfitrioes.vue'
import ContagemRegressiva from '@/componentes/base/ContagemRegressiva.vue'
import ListaDetalhes from '@/componentes/base/ListaDetalhes.vue'
import ResumoContagem from '@/componentes/base/ResumoContagem.vue'
import ListaRepetivel from '@/componentes/base/ListaRepetivel.vue'
import CampoSugestoes from '@/componentes/base/CampoSugestoes.vue'
import IndicadorEtapas from '@/componentes/base/IndicadorEtapas.vue'
import EnvioArquivo from '@/componentes/base/EnvioArquivo.vue'
import ListaProblemasLinha from '@/componentes/base/ListaProblemasLinha.vue'
import DialogoConfirmacao from '@/componentes/base/DialogoConfirmacao.vue'
import CabecalhoConvite from '@/componentes/base/CabecalhoConvite.vue'
import EscolhaPresenca from '@/componentes/base/EscolhaPresenca.vue'
import BarraAcaoFixa from '@/componentes/base/BarraAcaoFixa.vue'
import MenuAcoes from '@/componentes/base/MenuAcoes.vue'
import SeloConfirmacao from '@/componentes/base/SeloConfirmacao.vue'
import SeletorRestricaoAlimentar from '@/componentes/base/SeletorRestricaoAlimentar.vue'
import AvisoPrivacidade from '@/componentes/base/AvisoPrivacidade.vue'
import CaixaConsentimento from '@/componentes/base/CaixaConsentimento.vue'
import ResumoCardapio from '@/componentes/base/ResumoCardapio.vue'
import BarraProgressoEnvio from '@/componentes/base/BarraProgressoEnvio.vue'
import IndicadorPrazo from '@/componentes/base/IndicadorPrazo.vue'
import LugarAcesso from '@/componentes/base/LugarAcesso.vue'
import ParLugares from '@/componentes/base/ParLugares.vue'
import ItemTarefa from '@/componentes/base/ItemTarefa.vue'
import BlocoPendenciasTarefas from '@/componentes/tarefas/BlocoPendenciasTarefas.vue'
import { ROTULOS_CATEGORIA_TAREFA, ROTULOS_RESPONSAVEL_TAREFA, TEXTOS_TAREFAS } from '@/textos/tarefas'
import ItemModeloChecklist from '@/componentes/base/ItemModeloChecklist.vue'
import ProgressoChecklist from '@/componentes/base/ProgressoChecklist.vue'
import ReguaMarcos from '@/componentes/base/ReguaMarcos.vue'
import OpcaoCopia from '@/componentes/base/OpcaoCopia.vue'
import LinhaCronograma from '@/componentes/base/LinhaCronograma.vue'
import AtalhosPreenchimento from '@/componentes/base/AtalhosPreenchimento.vue'
import { TEXTOS_CRONOGRAMA } from '@/textos/cronograma'
import ListaNaoCopiado from '@/componentes/base/ListaNaoCopiado.vue'
import { TEXTOS_DUPLICACAO_EVENTO } from '@/textos/duplicacaoEvento'
import {
  COMPLEMENTO_MARCO_CHECKLIST,
  ROTULOS_MARCO_CHECKLIST,
  TEXTOS_CHECKLIST,
  TEXTOS_MODELOS_CHECKLIST,
  descreverPrazoRelativo,
} from '@/textos/checklist'
import type { ItemModeloChecklistDto } from '@/tipos/checklist'
import { agruparPorMarco } from '@/utilitarios/checklist'
import { badgeTarefa, metadadosTarefa } from '@/utilitarios/tarefas'
import { ROTULOS_SITUACAO_ACESSO, TEXTOS_ACESSO_ANFITRIAO } from '@/textos/acessoAnfitriao'
import LayoutImpressao from '@/layouts/LayoutImpressao.vue'
import { TEXTOS_CONFIRMACOES, TEXTOS_FICHA_BUFFET } from '@/textos/confirmacoes'
import { segmentosEnvio } from '@/utilitarios/painelConfirmacoes'
import { ROTULOS_TIPO_RESTRICAO, TEXTOS_DADOS_SENSIVEIS } from '@/textos/dadosSensiveis'
import type { RestricaoPessoaFormulario } from '@/tipos/dadosSensiveis'
import { TEXTOS_ENVIO_CONVITE, TEXTOS_RSVP } from '@/textos/rsvp'
import type { EscolhaPresencaRsvp } from '@/tipos/rsvp'
import type { TarefaDto } from '@/tipos/tarefas'
import type { ItemMenuAcoes, MarcoRegua, PassoPrimeiroAcesso, TextosEnvioArquivo, TextosListaProblemas, TextosListaRepetivel, VarianteStatus } from '@/componentes/base/tipos'
import { useNotificacao } from '@/composables/useNotificacao'
import { useConfirmarExclusao } from '@/composables/useConfirmarExclusao'
import { useFormulario } from '@/composables/useFormulario'
import { MINIMO_CONTRASTE, PARES_CONTRASTE, atendeContraste, razaoContraste } from '@/design/contraste'
import { breakpoints, cores, coresMarca, espacamento, raio, ritmo, sombra, tipografia } from '@/design/tokens'
import { MENSAGENS_PADRAO } from '@/textos/mensagens'
import { NOME_PRODUTO, ROTULOS_ACOES } from '@/textos/rotulos'
import { MENSAGENS_AUTENTICACAO, ROTULOS_CAMPOS_AUTENTICACAO, TEXTOS_ENTRAR } from '@/textos/autenticacao'
import { formatarData, formatarDataExtenso, formatarDataHora, formatarHora, formatarMoeda } from '@/utilitarios/formatacao'
import { email, obrigatorio, tamanhoMaximo } from '@/utilitarios/validacao'
import {
  COLUNAS_DEMONSTRACAO,
  CONVIDADOS_DEMONSTRACAO,
  VARIANTE_POR_SITUACAO,
  type ConvidadoDemonstracao,
} from './dadosDemonstracao'
import { CONTAGENS_DEMONSTRACAO, DETALHES_DEMONSTRACAO, FASES_DEMONSTRACAO } from './dadosDemonstracao'
import {
  GRUPOS_DEMONSTRACAO,
  TOTAIS_DEMONSTRACAO,
  TOTAIS_GRANDES_DEMONSTRACAO,
  TOTAIS_ZERADOS_DEMONSTRACAO,
  type PessoaDemonstracao,
} from './dadosDemonstracao'
import { FILTROS_PROBLEMAS_DEMONSTRACAO, PROBLEMAS_DEMONSTRACAO } from './dadosDemonstracao'
import {
  ALERTAS_DEMONSTRACAO,
  ALERTAS_VAZIOS_DEMONSTRACAO,
  HOJE_DEMONSTRACAO,
  PARCELAS_DEMONSTRACAO,
  PENDENCIAS_DEMONSTRACAO,
  RESUMO_PAGAMENTOS_DEMONSTRACAO,
  TAREFAS_DEMONSTRACAO,
  VINCULOS_DEMONSTRACAO,
} from './dadosDemonstracao'
import BlocoAlertasPagamentos from '@/componentes/base/BlocoAlertasPagamentos.vue'
import LinhaHoje from '@/componentes/base/LinhaHoje.vue'
import LinhaParcela from '@/componentes/base/LinhaParcela.vue'
import AnexoContrato from '@/componentes/base/AnexoContrato.vue'
import LinhaFornecedorEvento from '@/componentes/base/LinhaFornecedorEvento.vue'
import ResumoOrcamento from '@/componentes/base/ResumoOrcamento.vue'
import { TEXTOS_CONTRATO } from '@/textos/fornecedoresEvento'
import { calcularResumoLocal } from '@/utilitarios/fornecedoresEvento'
import { TEXTOS_CONVIDADOS } from '@/textos/convidados'
import AbasSecao from '@/componentes/base/AbasSecao.vue'
import CabecalhoOperacao from '@/componentes/base/CabecalhoOperacao.vue'
import ItemRoteiro from '@/componentes/base/ItemRoteiro.vue'
import LinhaDestinoLink from '@/componentes/base/LinhaDestinoLink.vue'
import CartaoAgora from '@/componentes/base/CartaoAgora.vue'
import ContatoUmToque from '@/componentes/base/ContatoUmToque.vue'
import FaixaFaseDia from '@/componentes/base/FaixaFaseDia.vue'
import LinhaOperacao from '@/componentes/base/LinhaOperacao.vue'
import LinhaProximo from '@/componentes/base/LinhaProximo.vue'
import PainelAgoraProximo from '@/componentes/base/PainelAgoraProximo.vue'
import RelogioOperacao from '@/componentes/base/RelogioOperacao.vue'
import SuperficieOperacao from '@/componentes/base/SuperficieOperacao.vue'
import OcupacaoMesa from '@/componentes/base/OcupacaoMesa.vue'
import LinhaPessoaMesa from '@/componentes/base/LinhaPessoaMesa.vue'
import { TEXTOS_MESAS } from '@/textos/mesas'
import type { ItemPainelGrandeDia } from '@/tipos/grandeDia'
import { ABAS_MODELOS } from '@/layouts/abasModelos'
import { TEXTOS_ABAS_MODELOS } from '@/textos/modelosCronograma'
import { complementoResumoConvidados, itensResumoConvidados } from '@/utilitarios/resumoConvidados'
import { ROTULOS_FASE, TEXTOS_EVENTOS, VARIANTE_FASE } from '@/textos/eventos'

const resumoOrcamentoDemonstracao = calcularResumoLocal(VINCULOS_DEMONSTRACAO)
const contratoDemonstracao = VINCULOS_DEMONSTRACAO[0]?.contrato ?? null

const tarefasDemonstracao = ref<TarefaDto[]>(TAREFAS_DEMONSTRACAO.map((tarefa) => ({ ...tarefa })))

const tarefasAnfitriaoDemonstracao = TAREFAS_DEMONSTRACAO.filter((tarefa) => tarefa.responsavel === 'Anfitriao')

function alternarTarefaDemonstracao(tarefa: TarefaDto) {
  const concluir = tarefa.status !== 'Concluida'
  Object.assign(tarefa, {
    status: concluir ? 'Concluida' : 'AFazer',
    concluidaEm: concluir ? new Date().toISOString() : null,
    concluidaPor: concluir ? 'Assessoria' : null,
    atrasada: concluir ? false : TAREFAS_DEMONSTRACAO.find((item) => item.id === tarefa.id)?.atrasada ?? false,
    venceNaSemana: concluir ? false : TAREFAS_DEMONSTRACAO.find((item) => item.id === tarefa.id)?.venceNaSemana ?? false,
  })
}

const itensRail: ItemRail[] = [
  ...ITENS_RAIL_ASSESSORIA,
  { rotulo: 'Style guide', icone: 'paleta', rota: { name: 'style-guide' }, prefixoAtivo: '/style-guide' },
]

const eventoDemonstracao: ContextoEvento = {
  nomePrimeiraPessoa: 'Ana',
  nomeSegundaPessoa: 'João',
  data: '2026-12-12',
  diasRestantes: 75,
}
const ID_DEMONSTRACAO = '00000000-0000-4000-8000-000000000000'
const gruposDemonstracao = gruposNavegacaoEvento(ID_DEMONSTRACAO, 'evento-convidados', () => true, undefined, {
  checklist: { texto: TEXTOS_CHECKLIST.indicadorNavegacao(80), rotuloAcessivel: TEXTOS_CHECKLIST.indicadorNavegacaoAria(80) },
})
const gruposAnfitriaoDemonstracao = gruposNavegacaoEvento(
  ID_DEMONSTRACAO,
  'evento',
  (modulo) => modulo.chave !== 'restricoes' && modulo.chave !== 'checklist',
)
const itensModeloDemonstracao: ItemModeloChecklistDto[] = [
  { id: 'm1', titulo: 'Reservar local da cerimônia e da recepção', descricao: null, responsavel: 'Assessoria', categoria: 'Cerimonia', diasAntesDoEvento: 365 },
  { id: 'm2', titulo: 'Contratar buffet', descricao: 'Pedir três orçamentos com cardápio e serviço de bebidas.', responsavel: 'Assessoria', categoria: 'Fornecedores', diasAntesDoEvento: 365 },
  { id: 'm3', titulo: 'Escolher os trajes dos anfitriões', descricao: null, responsavel: 'Anfitriao', categoria: 'TrajesBeleza', diasAntesDoEvento: 180 },
  { id: 'm4', titulo: 'Contratar o espaço do evento', descricao: null, responsavel: 'Anfitriao', categoria: 'Documentos', diasAntesDoEvento: 90 },
  { id: 'm5', titulo: 'Enviar o número final de convidados ao buffet', descricao: null, responsavel: 'Assessoria', categoria: 'Recepcao', diasAntesDoEvento: 30 },
  { id: 'm6', titulo: 'Enviar fotos para o álbum', descricao: null, responsavel: 'Assessoria', categoria: 'Geral', diasAntesDoEvento: -15 },
]
const gruposModeloDemonstracao = agruparPorMarco(itensModeloDemonstracao, (item) => item.diasAntesDoEvento)
const marcosModeloDemonstracao: MarcoRegua[] = gruposModeloDemonstracao.map((grupo, indice) => ({
  chave: grupo.marco,
  rotulo: ROTULOS_MARCO_CHECKLIST[grupo.marco],
  complemento: COMPLEMENTO_MARCO_CHECKLIST[grupo.marco],
  detalhe: TEXTOS_MODELOS_CHECKLIST.resumoItens(grupo.itens.length),
  concluido: indice === 0,
}))
function itensDoMarcoDemonstracao(chave: string): ItemModeloChecklistDto[] {
  return gruposModeloDemonstracao.find((grupo) => grupo.marco === chave)?.itens ?? []
}
function metadadosModeloDemonstracao(item: ItemModeloChecklistDto): string[] {
  return item.categoria === 'Geral'
    ? [ROTULOS_RESPONSAVEL_TAREFA[item.responsavel]]
    : [ROTULOS_RESPONSAVEL_TAREFA[item.responsavel], ROTULOS_CATEGORIA_TAREFA[item.categoria]]
}
const passosPrimeiroAcessoDemonstracao: PassoPrimeiroAcesso[] = [
  { chave: 'dados', rotulo: 'Dados do evento', concluido: true },
  { chave: 'anfitriao', rotulo: 'Convidar os anfitriões', concluido: false },
  { chave: 'checklist', rotulo: 'Checklist', concluido: false },
  { chave: 'convidados', rotulo: 'Convidados', concluido: false },
]
const FORNECEDORES_DEMONSTRACAO: FornecedorResumoDto[] = [
  { id: 'f1', categoria: 'Buffet', nomeEmpresa: 'Buffet Oliveira', responsavel: 'Carla Oliveira', telefone: '11987654321', email: 'contato@buffetoliveira.com.br', site: 'https://buffetoliveira.com.br', instagram: 'buffetoliveira', arquivado: false, atualizadoEm: '2026-09-30T10:00:00Z' },
  { id: 'f2', categoria: 'Buffet', nomeEmpresa: 'Buffet São João', responsavel: 'Marta Souza', telefone: '1133224455', email: null, site: null, instagram: null, arquivado: false, atualizadoEm: '2026-09-30T10:00:00Z' },
  { id: 'f3', categoria: 'Fotografia', nomeEmpresa: 'Fotografia Ângela Lima', responsavel: null, telefone: null, email: 'angela@fotografia.com.br', site: null, instagram: 'angelalimafoto', arquivado: false, atualizadoEm: '2026-09-30T10:00:00Z' },
  { id: 'f4', categoria: 'Decoracao', nomeEmpresa: 'Florista Jardim', responsavel: 'Rui Prado', telefone: '21999887766', email: null, site: null, instagram: null, arquivado: true, atualizadoEm: '2026-09-30T10:00:00Z' },
]
const fornecedoresAtivosDemonstracao = FORNECEDORES_DEMONSTRACAO.filter((fornecedor) => !fornecedor.arquivado)
const contagensFornecedoresDemonstracao = contarPorCategoria(fornecedoresAtivosDemonstracao)
const categoriaDemonstracao = ref<CategoriaFornecedor | null>(null)
const gruposFornecedoresDemonstracao = computed(() =>
  agruparPorCategoria(
    fornecedoresAtivosDemonstracao.filter(
      (fornecedor) => categoriaDemonstracao.value === null || fornecedor.categoria === categoriaDemonstracao.value,
    ),
  ),
)
const nomesIcones = [...NOMES_ICONES]
const segmentoDemonstracao = ref('Todos')
const opcoesSegmentoDemonstracao = ['Todos', 'Confirmados', 'Pendentes']

function mostrarToastComDesfazer() {
  notificacao.sucesso('Evento de Ana & João arquivado.', {
    desfazer: () => notificacao.sucesso('Evento de Ana & João restaurado.'),
  })
}

const secoes = [
  { id: 'marca', titulo: 'Marca' },
  { id: 'cores', titulo: 'Cores e contraste' },
  { id: 'tipografia', titulo: 'Tipografia' },
  { id: 'espaco', titulo: 'Espaço, ritmo e raio' },
  { id: 'primitivas', titulo: 'Primitivas de layout' },
  { id: 'iconografia', titulo: 'Iconografia' },
  { id: 'textos', titulo: 'Textos e formatos' },
  { id: 'acoes', titulo: 'Botões e status' },
  { id: 'formulario', titulo: 'Formulário' },
  { id: 'listagem', titulo: 'Listagem' },
  { id: 'estados', titulo: 'Os 8 estados' },
  { id: 'feedback', titulo: 'Confirmação e toast' },
  { id: 'autenticacao', titulo: 'Autenticação' },
  { id: 'evento', titulo: 'Evento' },
  { id: 'convidados', titulo: 'Convidados' },
  { id: 'importacao', titulo: 'Importação' },
  { id: 'rsvp', titulo: 'Confirmação de presença' },
  { id: 'dados-sensiveis', titulo: 'Dados sensíveis' },
  { id: 'confirmacoes', titulo: 'Confirmações e buffet' },
  { id: 'mesas', titulo: 'Mesas' },
  { id: 'acesso-anfitriao', titulo: 'Acesso dos anfitriões' },
  { id: 'tarefas', titulo: 'Tarefas' },
  { id: 'checklist', titulo: 'Checklist' },
  { id: 'fornecedores', titulo: 'Fornecedores' },
  { id: 'fornecedores-evento', titulo: 'Fornecedores do evento' },
  { id: 'cronograma', titulo: 'Cronograma do dia' },
  { id: 'modelos-cronograma', titulo: 'Modelos de cronograma' },
  { id: 'cronograma-publico', titulo: 'Cronograma para a equipe' },
  { id: 'grande-dia', titulo: 'Grande Dia' },
  { id: 'duplicacao', titulo: 'Duplicar evento' },
  { id: 'navegacao', titulo: 'Navegação e workspace' },
  { id: 'contextos', titulo: 'Dois contextos' },
  { id: 'layouts', titulo: 'Layouts' },
  { id: 'regras', titulo: 'Regras de uso' },
]

const dialogoRevogacaoVisivel = ref(false)
const localCronogramaDemonstracao = ref('Paróquia São José')
const atalhosLocalDemonstracao = [
  { rotulo: TEXTOS_CRONOGRAMA.atalhoLocal('Cerimônia', 'Paróquia São José'), valor: 'Paróquia São José' },
  { rotulo: TEXTOS_CRONOGRAMA.atalhoLocal('Recepção', 'Espaço Villa Real'), valor: 'Espaço Villa Real' },
]
const copiaTarefasDemonstracao = ref(true)
const copiaFornecedoresDemonstracao = ref(false)
const copiaVaziaDemonstracao = ref(false)
const copiaCarregandoDemonstracao = ref(true)

const convitesDemonstracao = { total: 60, naoEnviados: 4, enviados: 11, visualizados: 45, respondidos: 38, aguardandoResposta: 22 }
const segmentosDemonstracao = segmentosEnvio(convitesDemonstracao)
const segmentosVaziosDemonstracao = segmentosEnvio({ total: 0, naoEnviados: 0, enviados: 0, visualizados: 0, respondidos: 0, aguardandoResposta: 0 })
const contagemFichaDemonstracao = [
  { chave: 'adultos', rotulo: TEXTOS_FICHA_BUFFET.adultos, valor: 88 },
  { chave: 'criancas', rotulo: TEXTOS_FICHA_BUFFET.criancas, valor: 8 },
  { chave: 'total', rotulo: TEXTOS_FICHA_BUFFET.total, valor: 96 },
]

const escolhasDemonstracao = ref<{ celia: EscolhaPresencaRsvp | null; antonio: EscolhaPresencaRsvp | null; lia: EscolhaPresencaRsvp | null }>({
  celia: 'Confirmado',
  antonio: null,
  lia: 'Recusado',
})
const erroEscolhaDemonstracao = ref<string | null>(null)
const seloAnimadoDemonstracao = ref(false)
const restricaoNovaDemonstracao = ref<RestricaoPessoaFormulario>({
  situacao: 'manter',
  tipos: [],
  outraRestricao: '',
  necessidadeEspecial: '',
})
const restricaoRegistradaDemonstracao = ref<RestricaoPessoaFormulario>({
  situacao: 'manter',
  tipos: [],
  outraRestricao: '',
  necessidadeEspecial: '',
})
const restricaoPainelDemonstracao = ref<RestricaoPessoaFormulario>({
  situacao: 'informar',
  tipos: ['SemGluten'],
  outraRestricao: '',
  necessidadeEspecial: 'Cadeira de rodas',
})
const consentimentoDemonstracao = ref(false)
const erroConsentimentoDemonstracao = ref<string | null>(null)
const linhasCardapioDemonstracao = [
  { chave: 'SemGluten', rotulo: ROTULOS_TIPO_RESTRICAO.SemGluten, valor: 2 },
  { chave: 'Vegana', rotulo: ROTULOS_TIPO_RESTRICAO.Vegana, valor: 1 },
  { chave: 'outras', rotulo: TEXTOS_DADOS_SENSIVEIS.outrasRestricoes, valor: 1 },
  { chave: 'necessidades', rotulo: TEXTOS_DADOS_SENSIVEIS.necessidadesEspeciais, valor: 1 },
]

function validarConsentimentoDemonstracao() {
  erroConsentimentoDemonstracao.value = consentimentoDemonstracao.value ? null : TEXTOS_DADOS_SENSIVEIS.erroConsentimento
}
const ultimaAcaoMenuDemonstracao = ref('')
const itensMenuDemonstracao: ItemMenuAcoes[] = [
  { chave: 'copiarLink', rotulo: TEXTOS_ENVIO_CONVITE.copiarLink, icone: 'ie ie-link' },
  { chave: 'copiarMensagem', rotulo: TEXTOS_ENVIO_CONVITE.copiarMensagem, icone: 'ie ie-copiar' },
  { chave: 'marcarEnviado', rotulo: TEXTOS_ENVIO_CONVITE.marcarEnviado, icone: 'ie ie-enviar' },
  { chave: 'revogar', rotulo: TEXTOS_ENVIO_CONVITE.revogarLink, icone: 'ie ie-bloquear', perigoso: true },
]
const faltamDemonstracao = computed(() => Object.values(escolhasDemonstracao.value).filter((escolha) => !escolha).length)

function validarEscolhasDemonstracao() {
  erroEscolhaDemonstracao.value = escolhasDemonstracao.value.antonio ? null : TEXTOS_RSVP.faltaEscolha
}

function repetirSeloDemonstracao() {
  seloAnimadoDemonstracao.value = false
  requestAnimationFrame(() => {
    seloAnimadoDemonstracao.value = true
  })
}

function itemPainelDemonstracao(dados: Partial<ItemPainelGrandeDia>): ItemPainelGrandeDia {
  return {
    chave: dados.atividade ?? 'item',
    dia: 'DiaDoEvento',
    inicio: '16:30',
    termino: null,
    terminaEmOutroDia: false,
    atividade: 'Cerimônia',
    local: null,
    responsavel: null,
    fornecedor: null,
    contato: null,
    instrucoes: null,
    situacao: 'Depois',
    concluidoEm: null,
    cerimonia: false,
    ...dados,
  }
}

const itensPainelDemonstracao: ItemPainelGrandeDia[] = [
  itemPainelDemonstracao({ inicio: '14:00', termino: '15:30', atividade: 'Montagem do buffet', situacao: 'Feito', concluidoEm: '2027-05-15T18:20:00Z' }),
  itemPainelDemonstracao({ inicio: '16:00', termino: '17:00', atividade: 'Maquiagem da noiva', responsavel: 'Ana', situacao: 'Agora' }),
  itemPainelDemonstracao({
    inicio: '16:30',
    termino: '17:15',
    atividade: 'Cerimônia',
    local: 'Capela São José',
    responsavel: 'Fernanda',
    fornecedor: 'Coral Harmonia',
    contato: { nome: 'Coral Harmonia', telefone: '11987654321' },
    instrucoes: 'Coral entra às 16:25.',
    situacao: 'Agora',
    cerimonia: true,
  }),
  itemPainelDemonstracao({ inicio: '17:15', termino: '18:00', atividade: 'Fotos com a família', responsavel: 'Ana', fornecedor: 'Estúdio Luz', situacao: 'Proximo' }),
  itemPainelDemonstracao({ inicio: '18:00', atividade: 'Recepção', responsavel: 'Carlos', situacao: 'Depois' }),
  itemPainelDemonstracao({ inicio: '18:30', atividade: 'Entrada dos anfitriões', situacao: 'Depois' }),
]

const nomesCores: Record<keyof typeof cores, string> = {
  navegacao: 'Navegação',
  navegacaoTexto: 'Navegação · texto',
  navegacaoAtivo: 'Navegação · ativo',
  navegacaoSimbolo: 'Navegação · símbolo',
  primaria: 'Primária · azul-marinho',
  primariaEscura: 'Marinho profundo (hover de link)',
  primariaSuave: 'Primária suave · seleção e item ativo',
  acento: 'Acento · marinho claro (decorativo)',
  acentoClaro: 'Marinho névoa (decorativo)',
  acentoTexto: 'Acento para texto',
  acentoSuave: 'Acento suave',
  assistente: 'Fundo do assistente',
  fundo: 'Fundo',
  superficie: 'Superfície',
  superficieSutil: 'Superfície sutil',
  borda: 'Borda',
  divisoria: 'Divisória',
  bordaControle: 'Borda de controle',
  bordaCampo: 'Borda de campo',
  trilho: 'Trilho de progresso',
  texto: 'Texto',
  textoSecundario: 'Texto secundário',
  textoApoio: 'Texto de apoio',
  placeholder: 'Placeholder',
  neutro: 'Neutro',
  neutroSuave: 'Neutro suave',
  sucesso: 'Sucesso',
  sucessoTexto: 'Sucesso · texto',
  sucessoSuave: 'Sucesso · tint',
  alerta: 'Alerta',
  alertaTexto: 'Alerta · texto',
  alertaSuave: 'Alerta · tint',
  alertaForte: 'Alerta · texto forte',
  erro: 'Erro',
  erroTexto: 'Erro · texto',
  erroSuave: 'Erro · tint',
  informacao: 'Informação',
  informacaoTexto: 'Informação · texto',
  informacaoSuave: 'Informação · tint',
  toast: 'Toast',
  toastTexto: 'Toast · texto',
  toastApoio: 'Toast · apoio',
  toastAcao: 'Toast · ação',
  toastSucesso: 'Toast · sucesso',
  toastErro: 'Toast · erro',
  toastInformacao: 'Toast · informação',
  toastAlerta: 'Toast · alerta',
  fundoAnfitriao: 'Fundo dos anfitriões',
  fundoConvite: 'Fundo do convite',
  cartaoConvite: 'Cartão do convite',
  bordaConvite: 'Borda do convite',
  bordaPublica: 'Borda das páginas públicas',
  controlePublico: 'Controle das páginas públicas',
  textoPublico: 'Texto das páginas públicas',
  apoioPublico: 'Apoio das páginas públicas',
  operacaoFundo: 'Operação · fundo',
  operacaoSuperficie: 'Operação · superfície',
  operacaoTexto: 'Operação · texto',
  operacaoApoio: 'Operação · apoio',
  operacaoBorda: 'Operação · borda',
  operacaoDivisoria: 'Operação · divisória',
  operacaoDestaque: 'Operação · destaque',
  operacaoSucesso: 'Operação · feito',
  operacaoCartao: 'Grande Dia · cartão Agora',
  operacaoCartaoTexto: 'Grande Dia · texto do cartão',
  operacaoCartaoApoio: 'Grande Dia · apoio do cartão',
  operacaoCartaoBorda: 'Grande Dia · contorno no cartão',
  operacaoAoVivo: 'Grande Dia · ao vivo',
  operacaoAoVivoFundo: 'Grande Dia · fundo do ao vivo',
  operacaoAcao: 'Grande Dia · ação principal',
  operacaoAcaoTexto: 'Grande Dia · texto da ação',
  veu: 'Véu de diálogo',
}

function paraKebab(nome: string): string {
  return nome.replace(/[A-Z]/g, (letra) => `-${letra.toLowerCase()}`)
}

const amostrasCores = (Object.keys(cores) as (keyof typeof cores)[]).map((chave) => ({
  chave,
  nome: nomesCores[chave],
  valor: cores[chave],
  variavel: `--p-cor-${paraKebab(chave)}`,
}))

const paresContraste = PARES_CONTRASTE.map((par) => ({
  ...par,
  razao: razaoContraste(par.frente, par.fundo).toFixed(2).replace('.', ','),
  minimo: String(MINIMO_CONTRASTE[par.nivel]).replace('.', ','),
  aprovado: atendeContraste(par),
}))

const amostrasTipografia = [
  { nome: 'Display · Jost 64/68 leve', tamanho: tipografia.tamanhos.display, familia: 'display', texto: 'Ana & João' },
  { nome: 'H1 · Jost 36/44 leve', tamanho: tipografia.tamanhos.pagina, familia: 'display', texto: 'O seu grande dia' },
  { nome: 'H1 no celular · Jost 30 leve', tamanho: tipografia.tamanhos.paginaCelular, familia: 'display', texto: 'Convidados' },
  { nome: 'Subtítulo H2 · Jost 22/30 médio', tamanho: tipografia.tamanhos.secao, familia: 'subtitulo', texto: 'Lista de convidados' },
  { nome: 'Título de cartão · Jost 17 médio', tamanho: tipografia.tamanhos.titulo, familia: 'subtitulo', texto: 'Confirmar buffet para 460 pessoas' },
  { nome: 'Tagline · Jost 14 caixa alta 0.3em', tamanho: tipografia.tamanhos.tagline, familia: 'tagline', texto: 'Planejem o seu grande dia juntos' },
  { nome: 'Interface · Jost 16/26', tamanho: tipografia.tamanhos.corpo, familia: 'interface', texto: 'Os anfitriões aprovaram a decoração em 28/09.' },
  { nome: 'Controle · Jost 14', tamanho: tipografia.tamanhos.controle, familia: 'interface', texto: 'Adicionar convidado' },
  { nome: 'Rótulo · Jost 12 médio caixa alta 0.14em', tamanho: tipografia.tamanhos.rotulo, familia: 'rotulo', texto: 'Orçamento' },
  { nome: 'Destaque · Cormorant Garamond 22/32', tamanho: tipografia.tamanhos.secao, familia: 'serif', texto: 'Eventos que conectam as pessoas que importam.' },
  { nome: 'Corpo editorial · Cormorant Garamond 16/26', tamanho: tipografia.tamanhos.corpo, familia: 'serif', texto: 'Reúnam fornecedores, orçamento e convidados num só lugar.' },
  { nome: 'Legenda · Cormorant Garamond 13 itálico', tamanho: tipografia.tamanhos.apoio, familia: 'legenda', texto: 'Mesa posta com flores brancas e velas' },
]

const amostrasMarca = Object.entries(coresMarca).map(([chave, valor]) => ({ chave, valor }))

const amostrasRitmo = [
  { chave: 'secao', uso: 'Entre seções principais da página', valor: ritmo.secao },
  { chave: 'bloco', uso: 'Entre blocos e cartões de uma seção', valor: ritmo.bloco },
  { chave: 'cartao', uso: 'Padding e espaço interno de cartões', valor: ritmo.cartao },
  { chave: 'grupo', uso: 'Entre campos de formulário e itens curtos', valor: ritmo.grupo },
  { chave: 'campo', uso: 'Entre rótulo e campo, título e apoio', valor: ritmo.campo },
]

const amostrasPrimitivas = [
  { classe: '.pilha + .pilha--secao | --bloco | --cartao | --grupo | --campo', uso: 'Empilha filhos com o espaço do ritmo escolhido; no celular seção e bloco encolhem um passo.' },
  { classe: '.grade, .grade--indicadores, .grade--larga', uso: 'Cartões lado a lado que quebram sozinhos (mínimo 256, 192 ou 352 px), gap de 24 px.' },
  { classe: '.pagina-ampla | .pagina-formulario | .pagina-leitura', uso: 'Largura máxima centralizada: listas e painéis (1536 px), formulários (768 px), texto corrido (608 px).' },
  { classe: '.cartao', uso: 'Superfície branca com hairline, raio de 12 px e padding de 24 px. Sem sombra.' },
  { classe: '.cabecalho-secao', uso: 'Título e apoio à esquerda, ações à direita; quebra no celular.' },
  { classe: '.texto-tagline | .texto-rotulo | .texto-destaque | .texto-corrido | .texto-legenda', uso: 'Estilos de texto do Celebri. Tagline só uma vez por página, no topo.' },
]

const amostrasEspaco = Object.entries(espacamento).map(([chave, valor]) => ({ chave, valor }))
const amostrasRaio = Object.entries(raio).map(([chave, valor]) => ({ chave, valor }))
const amostrasSombra = Object.entries(sombra).map(([chave, valor]) => ({ chave, valor }))
const amostrasBreakpoints = [
  { nome: 'Celular', faixa: `até ${breakpoints.tablet - 1} px`, comportamento: 'Barra clara com gaveta, margem de 16 px, listagem em cartões, ações em largura total e 48 px' },
  { nome: 'Tablet', faixa: `${breakpoints.tablet} a ${breakpoints.notebook - 1} px`, comportamento: 'Barra clara com gaveta, margem de 24 px, tabela sem colunas secundárias' },
  { nome: 'Notebook', faixa: `${breakpoints.notebook} a ${breakpoints.desktop - 1} px`, comportamento: 'Rail de 72 px e, dentro de um evento, navegação do evento de 232 px' },
  { nome: 'Desktop', faixa: `${breakpoints.desktop} a ${breakpoints.amplo - 1} px`, comportamento: 'Conteúdo ocupa a largura útil com margem de 40 px; grades em 3 ou 4 colunas' },
  { nome: 'Amplo', faixa: `a partir de ${breakpoints.amplo} px`, comportamento: 'Conteúdo limitado a 1536 px e centralizado, margens iguais dos dois lados' },
]

const dataExemplo = '2026-12-12T19:30:00Z'
const formatos = [
  { nome: 'Data', funcao: 'formatarData', resultado: formatarData(dataExemplo) },
  { nome: 'Data por extenso', funcao: 'formatarDataExtenso', resultado: formatarDataExtenso(dataExemplo) },
  { nome: 'Hora', funcao: 'formatarHora', resultado: formatarHora(dataExemplo) },
  { nome: 'Data e hora', funcao: 'formatarDataHora', resultado: formatarDataHora(dataExemplo) },
  { nome: 'Moeda', funcao: 'formatarMoeda', resultado: formatarMoeda(1234.5) },
  { nome: 'Valor ausente', funcao: 'formatarData(null)', resultado: formatarData(null) },
]

const rotulosAcoes = Object.values(ROTULOS_ACOES)

const variantesStatus: { variante: VarianteStatus; texto: string }[] = [
  { variante: 'neutro', texto: 'Rascunho' },
  { variante: 'sucesso', texto: 'Confirmado' },
  { variante: 'alerta', texto: 'Pendente' },
  { variante: 'erro', texto: 'Pagamento recusado' },
  { variante: 'informacao', texto: 'Convite enviado' },
]

const roteador = useRouter()
const senhaDemonstracao = ref('')
const senhaDemonstracaoSimples = ref('')
const notificacao = useNotificacao()
const { confirmarExclusao } = useConfirmarExclusao()

const salvando = ref(false)
const formulario = useFormulario(
  { nome: '', email: '', observacao: '' },
  { nome: [obrigatorio, tamanhoMaximo(80)], email: [obrigatorio, email], observacao: [tamanhoMaximo(200)] },
)

function salvarFormulario() {
  if (!formulario.validar()) {
    const campo = formulario.primeiroCampoInvalido.value
    if (campo) {
      document.getElementById(`demo-${String(campo)}`)?.focus()
    }
    return
  }
  salvando.value = true
  window.setTimeout(() => {
    salvando.value = false
    notificacao.sucesso(MENSAGENS_PADRAO.salvoComSucesso)
    formulario.redefinir()
  }, 800)
}

type EstadoListagem = 'dados' | 'carregando' | 'vazio' | 'erro'
const estadosListagem: { rotulo: string; valor: EstadoListagem }[] = [
  { rotulo: 'Com dados', valor: 'dados' },
  { rotulo: 'Carregando', valor: 'carregando' },
  { rotulo: 'Vazia', valor: 'vazio' },
  { rotulo: 'Erro', valor: 'erro' },
]
const estadoListagem = ref<EstadoListagem>('dados')
const convidados = ref<ConvidadoDemonstracao[]>([...CONVIDADOS_DEMONSTRACAO])
const busca = ref('')
const filtroSituacao = ref<string | null>(null)
const opcoesSituacao = ['Confirmado', 'Pendente', 'Recusado']

const convidadosVisiveis = computed(() => {
  if (estadoListagem.value === 'vazio') {
    return []
  }
  const termo = busca.value.trim().toLocaleLowerCase('pt-BR')
  return convidados.value.filter(
    (convidado) =>
      (!termo || convidado.nome.toLocaleLowerCase('pt-BR').includes(termo)) &&
      (!filtroSituacao.value || convidado.situacao === filtroSituacao.value),
  )
})

function excluirConvidado(convidado: ConvidadoDemonstracao) {
  confirmarExclusao({
    nomeItem: convidado.nome,
    aoConfirmar: async () => {
      await aguardar(600)
      convidados.value = convidados.value.filter((item) => item.id !== convidado.id)
    },
  })
}

function aguardar(milissegundos: number): Promise<void> {
  return new Promise((resolver) => window.setTimeout(resolver, milissegundos))
}

function excluirMesaExemplo() {
  confirmarExclusao({ nomeItem: 'Mesa 12', aoConfirmar: () => aguardar(800) })
}

function excluirComFalhaExemplo() {
  confirmarExclusao({
    nomeItem: 'Mesa 13',
    aoConfirmar: async () => {
      await aguardar(800)
      throw new Error('Falha simulada')
    },
  })
}

function restaurarConvidados() {
  convidados.value = [...CONVIDADOS_DEMONSTRACAO]
}

const textosListaDemonstracao: TextosListaRepetivel = {
  rotuloItem: TEXTOS_CONVIDADOS.rotuloPessoaNumero,
  adicionar: TEXTOS_CONVIDADOS.adicionarPessoa,
  remover: TEXTOS_CONVIDADOS.removerPessoa,
  contador: TEXTOS_CONVIDADOS.contadorPessoas,
  limiteAtingido: 'Esta demonstração aceita até 3 pessoas.',
  minimoAtingido: TEXTOS_CONVIDADOS.minimoPessoas,
  adicionado: TEXTOS_CONVIDADOS.pessoaAdicionada,
  removido: TEXTOS_CONVIDADOS.pessoaRemovida,
}
let sequenciaPessoas = 2
const pessoasDemonstracao = ref<PessoaDemonstracao[]>([
  { chave: 'p1', nome: 'Carla Souza' },
  { chave: 'p2', nome: 'Pedro Souza' },
])
function adicionarPessoaDemonstracao() {
  sequenciaPessoas += 1
  pessoasDemonstracao.value.push({ chave: `p${sequenciaPessoas}`, nome: '' })
}
function removerPessoaDemonstracao(indice: number) {
  pessoasDemonstracao.value.splice(indice, 1)
}
const pessoasUnicaDemonstracao: PessoaDemonstracao[] = [{ chave: 'u1', nome: 'Marcos Lima' }]
const grupoDemonstracao = ref('')
const grupoComErroDemonstracao = ref('Um grupo com um nome longo demais para caber no limite de sessenta caracteres')

const etapasDemonstracao = ['Escolha a planilha', 'Confira', 'Pronto']
const etapaDemonstracao = ref(1)
const textosEnvioDemonstracao: TextosEnvioArquivo = {
  rotulo: 'Planilha de convidados (exemplo)',
  instrucao: 'Arraste a planilha aqui ou',
  botao: 'Escolher arquivo',
  trocar: 'Trocar arquivo',
  limites: 'CSV de até 2 MB e 5.000 linhas.',
  carregando: 'Lendo a planilha…',
}
const arquivoDemonstracao = ref<Pick<File, 'name' | 'size'> | null>(null)
function selecionarArquivoDemonstracao(arquivo: File) {
  arquivoDemonstracao.value = { name: arquivo.name, size: arquivo.size }
}
const textosProblemasDemonstracao: TextosListaProblemas = {
  rotulo: 'Linhas para corrigir (exemplo)',
  filtro: 'Filtrar linhas por tipo',
  todos: 'Todos',
  linha: (numero) => `Linha ${numero}`,
  mostrarMais: (quantidade) => `Mostrar mais ${quantidade}`,
  vazio: 'Nenhuma linha com problema.',
}
const confirmacaoVisivel = ref(false)
const confirmacaoExecutando = ref(false)
async function confirmarDemonstracao() {
  confirmacaoExecutando.value = true
  await aguardar(800)
  confirmacaoExecutando.value = false
  confirmacaoVisivel.value = false
  notificacao.sucesso('2 convites e 5 pessoas importados.')
}

const pessoasMesaDemonstracao = [
  { chave: 'm1', nome: 'Carla Souza', apoio: 'Família da noiva', crianca: false, acompanhante: false },
  { chave: 'm2', nome: 'Pedro Souza', apoio: 'Família da noiva', crianca: true, acompanhante: false },
  { chave: 'm3', nome: 'Rui Fontes', apoio: 'Estava na Mesa 3 · Padrinhos', crianca: false, acompanhante: false },
  { chave: 'm4', nome: 'Lia Prado', apoio: 'Amigos da faculdade', crianca: false, acompanhante: true },
]
const pessoasMesaSelecionadas = ref<string[]>(['m2'])

function alternarPessoaMesaDemonstracao(chave: string, valor: boolean) {
  pessoasMesaSelecionadas.value = valor
    ? [...pessoasMesaSelecionadas.value, chave]
    : pessoasMesaSelecionadas.value.filter((item) => item !== chave)
}

const regras = [
  'O design system Celebri é a referência oficial do front: branco predominante, azul-marinho para marca, texto e ação, Jost leve nos títulos, Cormorant Garamond nas frases editoriais e muito respiro. Divergência só por acessibilidade ou regra de negócio, registrada na documentação.',
  'Toda tela consome apenas os tokens, layouts e componentes desta página. Cor, medida, sombra ou fonte literal em tela é proibido.',
  'Padrão novo exige evoluir o style guide antes de usar numa tela: o token ou componente entra aqui, com seus estados, e só depois vai para a tela.',
  'Toda tela deve invocar a skill frontend-design:frontend-design antes de ser desenhada e implementada.',
  'Jost é a voz da marca e da interface: títulos em peso leve (nunca bold), rótulos e botões em peso médio. Cormorant Garamond entra em frases de destaque, títulos de convite e legendas; o “&” dos anfitriões é Cormorant itálico.',
  'Azul-marinho é a cor da marca, do texto e da ação: botão primário cheio, link sublinhado, foco e item ativo (sobre o marinho suave). Marinho claro, marinho névoa e hairline são decorativos e nunca levam texto. Verde de sucesso marca concluído; informação usa azul-petróleo, nunca o marinho.',
  'Espaço só pelo ritmo: seção 64 px, bloco 40 px, cartão 24 px, grupo 16 px, campo 8 px. Use as primitivas .pilha, .grade e as larguras .pagina-ampla, .pagina-formulario e .pagina-leitura em vez de margens soltas.',
  'Listas e painéis usam a largura ampla e se espalham em grade; formulários usam a largura de formulário; texto corrido nunca passa da largura de leitura.',
  'Navegação: rail global de 72 px com ícone e rótulo acessível; dentro de /eventos/:id, a navegação do evento de 232 px. Módulo novo entra em MODULOS_EVENTO (layouts/modulosEvento.ts) com o seu grupo; grupo sem módulo e módulo que ainda não existe não aparecem.',
  'Uma única ação primária por área. Ações destrutivas nunca são primárias fora do diálogo de confirmação.',
  'Exclusão sempre passa pelo diálogo que nomeia o item, com foco inicial em Cancelar; o diálogo mostra Excluir em carregando, fecha ao terminar e emite o toast de sucesso ou de erro.',
  'Status nunca depende só da cor: o badge sempre tem cor, ícone e texto.',
  'Toast escuro no rodapé diz o que aconteceu; “Desfazer” só aparece quando existe operação inversa real.',
  'Toda tela implementa os 8 estados: carregando (skeleton), vazio, erro, sem permissão, sucesso, dados incompletos, confirmação destrutiva e primeiro acesso — mesma estrutura, texto próprio.',
  'Datas, horas e moeda só pelas funções de formatação (pt-BR, fuso de São Paulo).',
  'Mensagens em frases curtas, voz ativa, sem jargão técnico e sem desculpas; erro sempre indica o próximo passo.',
  'Telas de acesso (entrar, cadastro, recuperação de senha) usam o layout de autenticação: painel editorial escuro com a marca e o formulário numa superfície branca. Erros que não pertencem a um campo aparecem na mensagem de formulário.',
  'Nomes dos anfitriões sempre pelo componente de nomes dos anfitriões, com o “&” em Cormorant itálico na cor de acento; o número grande da contagem regressiva aparece só no cabeçalho do evento, nas demais telas a contagem é uma frase curta.',
  'Data do evento é data de calendário (AAAA-MM-DD): formate com as funções de data de calendário, nunca convertendo para Date com fuso.',
  'Totais de pessoas usam o resumo de contagem: número em Jost leve, rótulo no plural correto e detalhe com adultos e crianças; só um número em destaque (marinho) por resumo. Convites e acompanhantes vão no rodapé, nunca somados às pessoas.',
  'Listas que o usuário monta item a item (as pessoas de um convite) usam a lista repetível: blocos numerados, remover por bloco, adicionar no fim, limite visível e foco levado ao bloco novo.',
  'Campos de texto livre que costumam repetir valores (grupo do convite) usam o campo com sugestões: o usuário escolhe um valor existente ou digita um novo.',
  'Ocupação de mesa usa a fileira de lugares: um ponto por lugar, marinho cheio quando ocupado e vazado tracejado quando livre, sempre com o texto “6 de 8”. Pessoas que podem ser movidas usam a linha selecionável de pessoa, e a seleção múltipla abre a barra de ação fixa com “Sentar em…”. Sem salão espacial e sem arrastar-e-soltar: o caminho “selecione e toque na mesa” é o padrão.',
  'Dados de convidados (telefone, e-mail) não aparecem em listagens, URLs nem no título da aba; ficam só no formulário do convite.',
  'Fluxos com passos reais em sequência (importar uma planilha) usam o indicador de etapas: números só quando há sequência, etapa atual em marinho e anunciada; no celular vira uma frase curta com barra de três segmentos.',
  'Envio de arquivo sempre pelo componente de envio: botão real como caminho principal, arrastar e soltar só como atalho, limites de tamanho visíveis e erro que diz como corrigir. O servidor é a autoridade; a checagem no navegador é só conforto.',
  'Problemas por linha de planilha usam a lista de problemas: número da linha, nome, tipo em texto (Erro, Repetida, Aviso) e a mensagem por coluna; filtros por tipo e “Mostrar mais” em listas longas.',
  'Confirmações que não são exclusão usam o diálogo de confirmação: título em pergunta, texto que diz o que acontece e o que fica de fora, foco inicial em voltar e rótulo do botão com a ação exata.',
  'Todo CSV gerado pelo produto (modelo, linhas para corrigir) passa pela neutralização de fórmulas antes de ser baixado.',
  'Andamento por etapas reais (caminho dos convites) usa a barra de progresso segmentada com legenda numérica; prazos usam o indicador de prazo; documentos para fornecedores usam o layout de impressão, sem contatos de convidados e com aviso quando houver dado de saúde.',
  'O convite público (RSVP) usa o layout público na variante convite: fundo marinho névoa, cartão branco com Jost leve e Cormorant Garamond e opções de presença de 72 px, em uma única página — responder em até 3 toques vale mais que dividir em etapas.',
]
</script>

<template>
  <LayoutPainel :itens-rail="itensRail">
    <template #rodape-menu="{ variante }">
      <ResumoUsuario
        nome="Renata Albuquerque"
        organizacao="Albuquerque Assessoria"
        :variante="variante"
      />
    </template>

    <CabecalhoPagina
      titulo="Style guide"
      descricao="Tokens, layouts e componentes que toda tela do produto usa. Se algo não está aqui, evolua esta página antes de usar na tela."
    >
      <template #trilha>
        <span>Desenvolvimento</span>
      </template>
      <template #acoes>
        <Button
          :label="ROTULOS_ACOES.voltar"
          severity="secondary"
          outlined
          @click="roteador.push({ name: 'inicio' })"
        />
      </template>
    </CabecalhoPagina>

    <nav
      class="guia__indice"
      aria-label="Seções do style guide"
    >
      <a
        v-for="secao in secoes"
        :key="secao.id"
        :href="`#${secao.id}`"
      >{{ secao.titulo }}</a>
    </nav>

    <section
      id="marca"
      class="guia__secao"
      aria-labelledby="titulo-marca"
    >
      <h2
        id="titulo-marca"
        class="guia__titulo-secao"
      >
        Marca
      </h2>
      <p class="guia__texto">
        {{ NOME_PRODUTO }}: enquanto o logotipo oficial não chega, a marca é textual — o nome em Jost leve, azul-marinho, com espaçamento amplo; a inicial faz o papel de símbolo no rail, no topo das páginas públicas e no carregamento. É provisória: não desenhe símbolo nem monte logotipo a partir dela. Margem mínima de 40 px ao redor da marca.
      </p>
      <div class="guia__linha">
        <MarcaProduto
          class="guia__logo-principal"
          destaque
        />
        <MarcaProduto />
        <MarcaProduto tom="claro" />
        <MarcaProduto somente-simbolo />
      </div>
    </section>

    <section
      id="cores"
      class="guia__secao"
      aria-labelledby="titulo-cores"
    >
      <h2
        id="titulo-cores"
        class="guia__titulo-secao"
      >
        Cores e contraste
      </h2>
      <p class="guia__texto">
        Branco puro predominante em fundos e superfícies, hairlines em cinza frio, azul-marinho Celebri para marca, texto, ação e foco, marinho névoa para seleção e fundos de contexto (anfitriões, convite, entrada). Feedback com matiz própria e mais claro que o marinho: verde de sucesso, âmbar de alerta, vermelho de erro e azul-petróleo de informação.
      </p>
      <h3 class="guia__subtitulo">
        Cores oficiais da marca
      </h3>
      <ul class="guia__amostras-cor">
        <li
          v-for="amostra in amostrasMarca"
          :key="amostra.chave"
          class="guia__amostra-cor"
        >
          <span
            class="guia__cor"
            :style="{ background: amostra.valor }"
            aria-hidden="true"
          />
          <span class="guia__cor-nome">{{ amostra.chave }}</span>
          <code class="guia__codigo">{{ amostra.valor }}</code>
        </li>
      </ul>
      <h3 class="guia__subtitulo">
        Cores semânticas
      </h3>
      <ul class="guia__amostras-cor">
        <li
          v-for="amostra in amostrasCores"
          :key="amostra.chave"
          class="guia__amostra-cor"
        >
          <span
            class="guia__cor"
            :style="{ background: amostra.valor }"
            aria-hidden="true"
          />
          <span class="guia__cor-nome">{{ amostra.nome }}</span>
          <code class="guia__codigo">{{ amostra.valor }}</code>
          <code class="guia__codigo">{{ amostra.variavel }}</code>
        </li>
      </ul>

      <h3 class="guia__subtitulo">
        Combinações verificadas (WCAG 2.1 AA)
      </h3>
      <div class="guia__tabela-rolagem">
        <table class="guia__tabela">
          <thead>
            <tr>
              <th scope="col">
                Uso
              </th>
              <th scope="col">
                Amostra
              </th>
              <th scope="col">
                Razão
              </th>
              <th scope="col">
                Mínimo
              </th>
              <th scope="col">
                Resultado
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="par in paresContraste"
              :key="par.descricao"
            >
              <td>{{ par.descricao }}</td>
              <td>
                <span
                  class="guia__par"
                  :style="{ color: par.frente, background: par.fundo, borderColor: par.nivel === 'componente' ? par.frente : 'transparent' }"
                >Aa</span>
              </td>
              <td class="numeros-tabulares">
                {{ par.razao }}:1
              </td>
              <td class="numeros-tabulares">
                {{ par.minimo }}:1
              </td>
              <td>
                <BadgeStatus
                  :texto="par.aprovado ? 'Atende AA' : 'Reprovado'"
                  :variante="par.aprovado ? 'sucesso' : 'erro'"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section
      id="tipografia"
      class="guia__secao"
      aria-labelledby="titulo-tipografia"
    >
      <h2
        id="titulo-tipografia"
        class="guia__titulo-secao"
      >
        Tipografia
      </h2>
      <p class="guia__texto">
        Jost (geométrica, fina) carrega a marca e a interface: títulos em peso leve com bastante espaço, taglines e rótulos em caixa alta espaçada. Cormorant Garamond, serifa fria e fina, traz o tom editorial às frases de destaque, aos títulos de convite e às legendas. Nenhum título em negrito.
      </p>
      <dl class="guia__tipos">
        <div
          v-for="amostra in amostrasTipografia"
          :key="amostra.nome"
          class="guia__tipo"
        >
          <dt class="guia__tipo-nome">
            {{ amostra.nome }} <code class="guia__codigo">{{ amostra.tamanho }}</code>
          </dt>
          <dd
            :class="['guia__tipo-exemplo', `guia__tipo-exemplo--${amostra.familia}`]"
            :style="{ fontSize: amostra.tamanho }"
          >
            {{ amostra.texto }}
          </dd>
        </div>
      </dl>
    </section>

    <section
      id="espaco"
      class="guia__secao"
      aria-labelledby="titulo-espaco"
    >
      <h2
        id="titulo-espaco"
        class="guia__titulo-secao"
      >
        Espaço, ritmo e raio
      </h2>
      <h3 class="guia__subtitulo">
        Ritmo — use estes cinco
      </h3>
      <ul class="guia__espacos">
        <li
          v-for="amostra in amostrasRitmo"
          :key="amostra.chave"
        >
          <code class="guia__codigo">--p-ritmo-{{ amostra.chave }}</code>
          <span
            class="guia__barra"
            :style="{ width: amostra.valor }"
            aria-hidden="true"
          />
          <span class="numeros-tabulares">{{ amostra.valor }} · {{ amostra.uso }}</span>
        </li>
      </ul>
      <h3 class="guia__subtitulo">
        Escala completa (ajuste fino de componentes)
      </h3>
      <ul class="guia__espacos">
        <li
          v-for="amostra in amostrasEspaco"
          :key="amostra.chave"
        >
          <code class="guia__codigo">--p-espaco-{{ amostra.chave }}</code>
          <span
            class="guia__barra"
            :style="{ width: amostra.valor }"
            aria-hidden="true"
          />
          <span class="numeros-tabulares">{{ amostra.valor }}</span>
        </li>
      </ul>
      <h3 class="guia__subtitulo">
        Raio e sombra (sombra só em menus e diálogos)
      </h3>
      <div class="guia__caixas">
        <div
          v-for="amostra in amostrasRaio"
          :key="amostra.chave"
          class="guia__caixa"
          :style="{ borderRadius: amostra.valor }"
        >
          <code class="guia__codigo">--p-raio-{{ amostra.chave }}</code>
        </div>
        <div
          v-for="amostra in amostrasSombra"
          :key="amostra.chave"
          class="guia__caixa guia__caixa--sombra"
          :style="{ boxShadow: amostra.valor }"
        >
          <code class="guia__codigo">--p-sombra-{{ paraKebab(amostra.chave) }}</code>
        </div>
      </div>
      <h3 class="guia__subtitulo">
        Breakpoints
      </h3>
      <div class="guia__tabela-rolagem">
        <table class="guia__tabela">
          <thead>
            <tr>
              <th scope="col">
                Faixa
              </th>
              <th scope="col">
                Largura
              </th>
              <th scope="col">
                Comportamento
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="faixa in amostrasBreakpoints"
              :key="faixa.nome"
            >
              <td>{{ faixa.nome }}</td>
              <td class="numeros-tabulares">
                {{ faixa.faixa }}
              </td>
              <td>{{ faixa.comportamento }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section
      id="primitivas"
      class="guia__secao"
      aria-labelledby="titulo-primitivas"
    >
      <h2
        id="titulo-primitivas"
        class="guia__titulo-secao"
      >
        Primitivas de layout
      </h2>
      <p class="guia__texto">
        Classes globais (estilos/layout.css) que aplicam o ritmo e as larguras. Telas usam estas classes em vez de margens e larguras próprias.
      </p>
      <div class="guia__tabela-rolagem">
        <table class="guia__tabela">
          <thead>
            <tr>
              <th scope="col">
                Classe
              </th>
              <th scope="col">
                Uso
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="primitiva in amostrasPrimitivas"
              :key="primitiva.classe"
            >
              <td><code class="guia__codigo">{{ primitiva.classe }}</code></td>
              <td>{{ primitiva.uso }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        class="pilha pilha--bloco guia__exemplo-primitivas"
        data-teste="guia-primitivas"
      >
        <div class="cabecalho-secao">
          <div>
            <span class="texto-tagline">Planejem o seu grande dia juntos</span>
            <h3 class="guia__exemplo-titulo">
              Convidados
            </h3>
            <p class="texto-legenda">
              Exemplo: tagline, título e ações num cabeçalho de seção.
            </p>
          </div>
          <Button
            label="Adicionar convite"
            icon="ie ie-mais"
          />
        </div>
        <div class="grade grade--indicadores">
          <div
            v-for="indicador in ['Convidados', 'Confirmados', 'Pendentes', 'Recusaram']"
            :key="indicador"
            class="cartao pilha pilha--campo"
          >
            <span class="texto-rotulo">{{ indicador }}</span>
            <span class="guia__exemplo-numero numeros-tabulares">128</span>
          </div>
        </div>
        <p class="texto-destaque">
          Organização, inspiração e tudo para o seu evento em um só lugar.
        </p>
      </div>
    </section>

    <section
      id="iconografia"
      class="guia__secao"
      aria-labelledby="titulo-iconografia"
    >
      <h2
        id="titulo-iconografia"
        class="guia__titulo-secao"
      >
        Iconografia
      </h2>
      <p class="guia__texto">
        Traço 1,6 em grade de 24 px, cantos arredondados, sem preenchimento. Use a classe <code class="guia__codigo">ie ie-nome</code> (inclusive no prop <code class="guia__codigo">icon</code> do PrimeVue). Ícone nunca aparece sozinho sem rótulo ou aria-label.
      </p>
      <ul
        class="guia__icones"
        data-teste="guia-icones"
      >
        <li
          v-for="nome in nomesIcones"
          :key="nome"
          class="guia__icone"
        >
          <span
            :class="['ie', `ie-${nome}`]"
            aria-hidden="true"
          />
          <code class="guia__codigo">{{ nome }}</code>
        </li>
      </ul>
    </section>

    <section
      id="textos"
      class="guia__secao"
      aria-labelledby="titulo-textos"
    >
      <h2
        id="titulo-textos"
        class="guia__titulo-secao"
      >
        Textos e formatos
      </h2>
      <p class="guia__texto">
        Botões com verbo no infinitivo e o mesmo nome no fluxo inteiro: “Excluir” gera “foi excluído”.
      </p>
      <ul class="guia__rotulos">
        <li
          v-for="rotulo in rotulosAcoes"
          :key="rotulo"
        >
          {{ rotulo }}
        </li>
      </ul>
      <div class="guia__tabela-rolagem">
        <table class="guia__tabela">
          <thead>
            <tr>
              <th scope="col">
                Formato
              </th>
              <th scope="col">
                Função
              </th>
              <th scope="col">
                Resultado
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="formato in formatos"
              :key="formato.nome"
            >
              <td>{{ formato.nome }}</td>
              <td><code class="guia__codigo">{{ formato.funcao }}</code></td>
              <td class="numeros-tabulares">
                {{ formato.resultado }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section
      id="acoes"
      class="guia__secao"
      aria-labelledby="titulo-acoes"
    >
      <h2
        id="titulo-acoes"
        class="guia__titulo-secao"
      >
        Botões e status
      </h2>
      <p class="guia__texto">
        Primário, secundário, ghost e destrutivo, 40 px no painel e 48 px no celular. Segmentado para filtros curtos; badge sempre com cor, ícone e texto.
      </p>
      <div class="guia__linha">
        <Button :label="ROTULOS_ACOES.salvar" />
        <Button
          :label="ROTULOS_ACOES.cancelar"
          severity="secondary"
          outlined
        />
        <Button
          :label="ROTULOS_ACOES.limparFiltros"
          severity="secondary"
          text
        />
        <Button
          :label="ROTULOS_ACOES.excluir"
          severity="danger"
        />
        <Button
          :label="ROTULOS_ACOES.salvar"
          loading
        />
        <Button
          :label="ROTULOS_ACOES.salvar"
          disabled
        />
        <Button
          icon="ie ie-editar"
          severity="secondary"
          text
          :aria-label="ROTULOS_ACOES.editar"
        />
      </div>
      <div class="guia__linha">
        <SelectButton
          v-model="segmentoDemonstracao"
          :options="opcoesSegmentoDemonstracao"
          :allow-empty="false"
          aria-label="Filtro de exemplo"
        />
      </div>
      <div class="guia__linha">
        <BadgeStatus
          v-for="status in variantesStatus"
          :key="status.variante"
          :texto="status.texto"
          :variante="status.variante"
        />
      </div>
    </section>

    <section
      id="formulario"
      class="guia__secao"
      aria-labelledby="titulo-formulario"
    >
      <h2
        id="titulo-formulario"
        class="guia__titulo-secao"
      >
        Formulário
      </h2>
      <form
        class="guia__formulario"
        novalidate
        @submit.prevent="salvarFormulario"
      >
        <div class="guia__campos">
          <CampoFormulario
            v-slot="campo"
            rotulo="Nome do convidado"
            id-campo="demo-nome"
            obrigatorio
            :erro="formulario.erros.nome"
          >
            <InputText
              :id="campo.id"
              v-model="formulario.valores.nome"
              autocomplete="name"
              :invalid="campo.invalido"
              :aria-invalid="campo.invalido"
              :aria-describedby="campo.descritoPor"
              aria-required="true"
              @update:model-value="formulario.revalidarAoDigitar('nome')"
              @blur="formulario.validarAoSair('nome')"
            />
          </CampoFormulario>
          <CampoFormulario
            v-slot="campo"
            rotulo="E-mail"
            id-campo="demo-email"
            obrigatorio
            dica="Usado só para enviar a confirmação."
            :erro="formulario.erros.email"
          >
            <InputText
              :id="campo.id"
              v-model="formulario.valores.email"
              type="email"
              autocomplete="email"
              :invalid="campo.invalido"
              :aria-invalid="campo.invalido"
              :aria-describedby="campo.descritoPor"
              aria-required="true"
              @update:model-value="formulario.revalidarAoDigitar('email')"
              @blur="formulario.validarAoSair('email')"
            />
          </CampoFormulario>
          <CampoFormulario
            v-slot="campo"
            class="guia__campo-largo"
            rotulo="Observação"
            id-campo="demo-observacao"
            dica="Restrições alimentares, acessibilidade ou acompanhantes."
            :erro="formulario.erros.observacao"
          >
            <Textarea
              :id="campo.id"
              v-model="formulario.valores.observacao"
              rows="3"
              auto-resize
              :invalid="campo.invalido"
              :aria-invalid="campo.invalido"
              :aria-describedby="campo.descritoPor"
              @update:model-value="formulario.revalidarAoDigitar('observacao')"
              @blur="formulario.validarAoSair('observacao')"
            />
          </CampoFormulario>
        </div>
        <div class="guia__acoes-formulario">
          <Button
            :label="ROTULOS_ACOES.cancelar"
            severity="secondary"
            text
            type="button"
            @click="formulario.redefinir()"
          />
          <Button
            :label="ROTULOS_ACOES.salvar"
            type="submit"
            :loading="salvando"
          />
        </div>
      </form>
    </section>

    <section
      id="listagem"
      class="guia__secao"
      aria-labelledby="titulo-listagem"
    >
      <h2
        id="titulo-listagem"
        class="guia__titulo-secao"
      >
        Listagem
      </h2>
      <div class="guia__linha">
        <SelectButton
          v-model="estadoListagem"
          :options="estadosListagem"
          option-label="rotulo"
          option-value="valor"
          :allow-empty="false"
          aria-label="Estado da listagem de exemplo"
        />
        <Button
          label="Restaurar exemplo"
          severity="secondary"
          text
          @click="restaurarConvidados"
        />
      </div>
      <ListagemDados
        v-model:busca="busca"
        rotulo="Convidados"
        :itens="convidadosVisiveis"
        :colunas="COLUNAS_DEMONSTRACAO"
        chave="id"
        :carregando="estadoListagem === 'carregando'"
        :erro="estadoListagem === 'erro' ? 'Não foi possível carregar os convidados. Tente novamente em instantes.' : null"
        :filtros-ativos="filtroSituacao !== null"
        titulo-vazio="Nenhum convidado ainda"
        descricao-vazio="Adicione o primeiro convidado ou importe a lista dos anfitriões."
        @limpar-filtros="filtroSituacao = null"
        @tentar-novamente="estadoListagem = 'dados'"
      >
        <template #filtros>
          <Select
            v-model="filtroSituacao"
            :options="opcoesSituacao"
            placeholder="Situação"
            show-clear
            aria-label="Filtrar por situação"
          />
        </template>
        <template #acao-vazio>
          <Button label="Adicionar convidado" />
        </template>
        <template #celula-situacao="{ item }">
          <BadgeStatus
            :texto="item.situacao"
            :variante="VARIANTE_POR_SITUACAO[item.situacao]"
          />
        </template>
        <template #celula-respondidoEm="{ item }">
          {{ formatarDataHora(item.respondidoEm) }}
        </template>
        <template #acoes-linha="{ item }">
          <Button
            :label="ROTULOS_ACOES.editar"
            severity="secondary"
            text
            size="small"
          />
          <Button
            :label="ROTULOS_ACOES.excluir"
            severity="danger"
            text
            size="small"
            @click="excluirConvidado(item)"
          />
        </template>
      </ListagemDados>
    </section>

    <section
      id="estados"
      class="guia__secao"
      aria-labelledby="titulo-estados"
    >
      <h2
        id="titulo-estados"
        class="guia__titulo-secao"
      >
        Estados
      </h2>
      <p class="guia__texto">
        Nunca só o estado ideal. Cada módulo usa estes oito padrões com o mesmo layout e a mesma ação principal — o texto muda, a estrutura não.
      </p>
      <div class="guia__grade-estados">
        <div class="guia__painel">
          <span class="guia__rotulo-estado">01 · Carregando</span>
          <EstadoCarregando
            variante="lista"
            :linhas="3"
          />
        </div>
        <div class="guia__painel">
          <span class="guia__rotulo-estado">02 · Vazio</span>
          <EstadoVazio
            titulo="Nenhum presente na lista"
            descricao="Crie a lista de presentes para compartilhar com os convidados."
            icone="presente"
          >
            <template #acao>
              <Button label="Criar lista de presentes" />
            </template>
          </EstadoVazio>
        </div>
        <div class="guia__painel">
          <span class="guia__rotulo-estado">03 · Erro</span>
          <EstadoErro
            titulo="Não conseguimos carregar os convidados."
            mensagem="A conexão caiu por um instante. Nada do que você salvou foi perdido."
            @tentar-novamente="notificacao.sucesso('Tentativa registrada.')"
          />
        </div>
        <div class="guia__painel">
          <span class="guia__rotulo-estado">04 · Sem permissão</span>
          <EstadoErro
            variante="semPermissao"
            titulo="Esta área é da equipe de cerimonial."
            mensagem="As restrições alimentares nominais ficam visíveis só para a assessoria."
            :pode-tentar-novamente="false"
          />
        </div>
        <div class="guia__painel">
          <span class="guia__rotulo-estado">05 · Sucesso</span>
          <p class="guia__texto">
            Toast escuro no rodapé, 5 s, com “Desfazer” quando existe operação inversa.
          </p>
          <Button
            label="Arquivar (exemplo com desfazer)"
            severity="secondary"
            outlined
            data-teste="guia-toast-desfazer"
            @click="mostrarToastComDesfazer"
          />
        </div>
        <div class="guia__painel">
          <span class="guia__rotulo-estado">06 · Dados incompletos</span>
          <MensagemFormulario
            variante="alerta"
            mensagem="Falta o horário da cerimônia."
            data-teste="guia-dados-incompletos"
          >
            <span>Sem ele, o convite digital não mostra a hora.</span>
            <a href="#estados">Adicionar horário</a>
          </MensagemFormulario>
        </div>
        <div class="guia__painel">
          <span class="guia__rotulo-estado">07 · Confirmação destrutiva</span>
          <p class="guia__texto">
            Diálogo que nomeia o item, diz a consequência e usa o verbo exato no botão destrutivo.
          </p>
          <Button
            label="Excluir “Mesa 12”"
            severity="danger"
            outlined
            @click="excluirMesaExemplo"
          />
        </div>
        <div class="guia__painel">
          <span class="guia__rotulo-estado">08 · Primeiro acesso</span>
          <EstadoPrimeiroAcesso
            :titulo="`Boas-vindas ao ${NOME_PRODUTO}.`"
            descricao="Vamos configurar seu primeiro evento. Leva uns 5 minutos."
            :passos="passosPrimeiroAcessoDemonstracao"
            rotulo-acao="Continuar"
            @continuar="notificacao.sucesso('Continuando a configuração.')"
          />
        </div>
      </div>
    </section>

    <section
      id="feedback"
      class="guia__secao"
      aria-labelledby="titulo-feedback"
    >
      <h2
        id="titulo-feedback"
        class="guia__titulo-secao"
      >
        Confirmação e toast
      </h2>
      <div class="guia__linha">
        <Button
          label="Excluir “Mesa 12”"
          severity="danger"
          outlined
          @click="excluirMesaExemplo"
        />
        <Button
          label="Excluir com falha simulada"
          severity="danger"
          text
          @click="excluirComFalhaExemplo"
        />
        <Button
          label="Mostrar toast de sucesso"
          severity="secondary"
          outlined
          @click="notificacao.sucesso(MENSAGENS_PADRAO.salvoComSucesso)"
        />
        <Button
          label="Mostrar toast de erro"
          severity="secondary"
          outlined
          @click="notificacao.erro()"
        />
        <Button
          label="Mostrar toast com desfazer"
          severity="secondary"
          outlined
          @click="mostrarToastComDesfazer"
        />
      </div>
    </section>

    <section
      id="autenticacao"
      class="guia__secao"
      aria-labelledby="titulo-autenticacao"
    >
      <h2
        id="titulo-autenticacao"
        class="guia__titulo-secao"
      >
        Autenticação
      </h2>
      <p class="guia__texto">
        Layout de acesso com painel branco à esquerda (marca textual grande e o slogan em Cormorant Garamond) e o formulário num cartão branco sobre o marinho névoa; no celular, a marca textual vai para uma barra no topo. Campo de senha com mostrar/ocultar e lista de requisitos que marca cada item com ícone e texto. Mensagem de formulário para erros que não pertencem a um campo.
      </p>

      <h3 class="guia__subtitulo">
        Mensagem de formulário
      </h3>
      <div class="guia__pilha">
        <MensagemFormulario
          variante="erro"
          :mensagem="MENSAGENS_AUTENTICACAO.credenciais"
        />
        <MensagemFormulario
          variante="sucesso"
          :mensagem="MENSAGENS_AUTENTICACAO.senhaRedefinida"
        />
        <MensagemFormulario
          variante="informacao"
          :mensagem="MENSAGENS_AUTENTICACAO.sessaoTerminou"
        />
      </div>

      <h3 class="guia__subtitulo">
        Campo de senha
      </h3>
      <div class="guia__pilha">
        <CampoFormulario
          v-slot="{ id, invalido, descritoPor }"
          :rotulo="ROTULOS_CAMPOS_AUTENTICACAO.senha"
          id-campo="demo-senha-requisitos"
        >
          <CampoSenha
            :id="id"
            v-model="senhaDemonstracao"
            :invalido="invalido"
            :descrito-por="descritoPor"
            autocomplete="new-password"
            com-requisitos
          />
        </CampoFormulario>
        <CampoFormulario
          v-slot="{ id, invalido, descritoPor }"
          :rotulo="ROTULOS_CAMPOS_AUTENTICACAO.confirmarSenha"
          id-campo="demo-senha-simples"
          erro="As senhas não são iguais. Digite a mesma senha nos dois campos."
        >
          <CampoSenha
            :id="id"
            v-model="senhaDemonstracaoSimples"
            :invalido="invalido"
            :descrito-por="descritoPor"
            autocomplete="new-password"
          />
        </CampoFormulario>
      </div>

      <h3 class="guia__subtitulo">
        Layout de autenticação
      </h3>
      <div
        class="guia__moldura"
        aria-label="Exemplo do layout de autenticação em largura de celular"
        role="group"
      >
        <LayoutAutenticacao
          :titulo="TEXTOS_ENTRAR.titulo"
          :descricao="TEXTOS_ENTRAR.descricao"
          demonstracao
        >
          <MensagemFormulario
            variante="informacao"
            :mensagem="MENSAGENS_AUTENTICACAO.saiu"
          />
          <Button :label="TEXTOS_ENTRAR.botao" />
          <template #rodape>
            {{ TEXTOS_ENTRAR.semConta }} <a href="#autenticacao">{{ TEXTOS_ENTRAR.criarConta }}</a>
          </template>
        </LayoutAutenticacao>
      </div>

      <h3 class="guia__subtitulo">
        Abertura da sessão e resumo do usuário
      </h3>
      <p class="guia__texto">
        Enquanto a sessão é verificada no primeiro carregamento, a aplicação mostra o indicador abaixo. O resumo do usuário com a ação Sair fica no rodapé do menu do painel (veja o menu desta página).
      </p>
      <div
        class="guia__moldura guia__moldura--baixa"
        role="group"
        aria-label="Exemplo do indicador de abertura da sessão"
      >
        <IndicadorAbertura />
      </div>
    </section>

    <section
      id="evento"
      class="guia__secao"
      aria-labelledby="titulo-evento"
    >
      <h2
        id="titulo-evento"
        class="guia__titulo-secao"
      >
        Evento
      </h2>

      <h3 class="guia__subtitulo">
        Nomes dos anfitriões
      </h3>
      <div class="guia__pilha-larga">
        <NomesAnfitrioes
          primeiro="Ana Beatriz"
          segundo="Bruno"
        />
        <NomesAnfitrioes
          primeiro="Ana Beatriz"
          segundo="Bruno"
          tamanho="cartao"
        />
        <p class="guia__titulo-exemplo">
          <NomesAnfitrioes
            primeiro="Ana Beatriz"
            segundo="Bruno"
            tamanho="titulo"
          />
        </p>
        <NomesAnfitrioes
          primeiro="Maria Eduarda Albuquerque de Vasconcelos Figueiredo"
          segundo="João Guilherme Cavalcanti de Albuquerque Nogueira"
          tamanho="cartao"
        />
      </div>

      <h3 class="guia__subtitulo">
        Fase do evento
      </h3>
      <div class="guia__linha">
        <BadgeStatus
          v-for="fase in FASES_DEMONSTRACAO"
          :key="fase"
          :texto="ROTULOS_FASE[fase]"
          :variante="VARIANTE_FASE[fase]"
        />
        <BadgeStatus :texto="TEXTOS_EVENTOS.statusArquivado" />
      </div>

      <h3 class="guia__subtitulo">
        Contagem regressiva
      </h3>
      <div class="guia__linha">
        <ContagemRegressiva
          v-for="dias in CONTAGENS_DEMONSTRACAO"
          :key="`compacta-${dias}`"
          :dias="dias"
        />
      </div>
      <div class="guia__grade-contagem">
        <ContagemRegressiva
          v-for="dias in CONTAGENS_DEMONSTRACAO"
          :key="`destaque-${dias}`"
          :dias="dias"
          variante="destaque"
        >
          sábado, 15 de maio de 2027, 16:30
        </ContagemRegressiva>
      </div>

      <h3 class="guia__subtitulo">
        Lista de detalhes
      </h3>
      <div class="guia__pilha-larga">
        <ListaDetalhes :itens="DETALHES_DEMONSTRACAO" />
      </div>

      <h3 class="guia__subtitulo">
        Cabeçalho com título rico
      </h3>
      <CabecalhoPagina titulo="Ana Beatriz & Bruno">
        <template #titulo>
          <NomesAnfitrioes
            primeiro="Ana Beatriz"
            segundo="Bruno"
            tamanho="titulo"
          />
        </template>
      </CabecalhoPagina>
    </section>

    <section
      id="convidados"
      class="guia__secao"
      aria-labelledby="titulo-convidados"
    >
      <h2
        id="titulo-convidados"
        class="guia__titulo-secao"
      >
        Convidados
      </h2>

      <h3 class="guia__subtitulo">
        Resumo de contagem
      </h3>
      <p class="guia__texto">
        Números da lista em Jost leve, como a contagem de um livro de presença. Duas colunas no celular, uma linha a partir de 640 px; o número em destaque é o de confirmadas.
      </p>
      <ResumoContagem
        :itens="itensResumoConvidados(TOTAIS_DEMONSTRACAO)"
        rotulo="Totais de convidados (exemplo)"
      >
        <template #rodape>
          {{ complementoResumoConvidados(TOTAIS_DEMONSTRACAO, 150) }}
        </template>
      </ResumoContagem>
      <ResumoContagem
        :itens="itensResumoConvidados(TOTAIS_ZERADOS_DEMONSTRACAO)"
        rotulo="Totais com zeros (exemplo)"
      >
        <template #rodape>
          {{ complementoResumoConvidados(TOTAIS_ZERADOS_DEMONSTRACAO, null) }}
        </template>
      </ResumoContagem>
      <ResumoContagem
        :itens="itensResumoConvidados(TOTAIS_GRANDES_DEMONSTRACAO)"
        rotulo="Totais com números grandes (exemplo)"
      />

      <h3 class="guia__subtitulo">
        Lista repetível
      </h3>
      <div class="guia__pilha-larga">
        <ListaRepetivel
          :itens="pessoasDemonstracao"
          :chave="(pessoa) => pessoa.chave"
          :textos="textosListaDemonstracao"
          :maximo="3"
          @adicionar="adicionarPessoaDemonstracao"
          @remover="removerPessoaDemonstracao"
        >
          <template #default="{ item, prefixo }">
            <CampoFormulario
              v-slot="{ id: idEntrada }"
              rotulo="Nome"
              :id-campo="`${prefixo}-nome`"
              obrigatorio
            >
              <InputText
                :id="idEntrada"
                v-model="item.nome"
              />
            </CampoFormulario>
          </template>
        </ListaRepetivel>
        <ListaRepetivel
          :itens="pessoasUnicaDemonstracao"
          :chave="(pessoa) => pessoa.chave"
          :textos="textosListaDemonstracao"
          :maximo="30"
        >
          <template #default="{ item }">
            <p>{{ item.nome }}: com uma pessoa só, remover fica indisponível.</p>
          </template>
        </ListaRepetivel>
        <ListaRepetivel
          :itens="pessoasUnicaDemonstracao"
          :chave="(pessoa) => pessoa.chave"
          :textos="textosListaDemonstracao"
          :maximo="30"
          desabilitado
        >
          <template #default="{ item }">
            <p>{{ item.nome }}: somente leitura, como num evento arquivado.</p>
          </template>
        </ListaRepetivel>
      </div>

      <h3 class="guia__subtitulo">
        Campo com sugestões
      </h3>
      <div class="guia__pilha">
        <CampoFormulario
          v-slot="{ id: idEntrada, invalido, descritoPor }"
          rotulo="Grupo"
          id-campo="guia-grupo"
          dica="Por exemplo: Família, Amigos do trabalho."
        >
          <CampoSugestoes
            :id="idEntrada"
            v-model="grupoDemonstracao"
            :sugestoes="GRUPOS_DEMONSTRACAO"
            :invalido="invalido"
            :descrito-por="descritoPor"
            :maximo="60"
            rotulo-botao-sugestoes="Mostrar grupos já usados"
          />
        </CampoFormulario>
        <CampoFormulario
          v-slot="{ id: idEntrada, invalido, descritoPor }"
          rotulo="Grupo"
          id-campo="guia-grupo-erro"
          erro="Use até 60 caracteres."
        >
          <CampoSugestoes
            :id="idEntrada"
            v-model="grupoComErroDemonstracao"
            :sugestoes="GRUPOS_DEMONSTRACAO"
            :invalido="invalido"
            :descrito-por="descritoPor"
          />
        </CampoFormulario>
        <CampoFormulario
          v-slot="{ id: idEntrada }"
          rotulo="Grupo"
          id-campo="guia-grupo-desabilitado"
        >
          <CampoSugestoes
            :id="idEntrada"
            model-value="Padrinhos"
            :sugestoes="GRUPOS_DEMONSTRACAO"
            desabilitado
          />
        </CampoFormulario>
      </div>
    </section>

    <section
      id="importacao"
      class="guia__secao"
      aria-labelledby="titulo-importacao"
    >
      <h2
        id="titulo-importacao"
        class="guia__titulo-secao"
      >
        Importação
      </h2>

      <h3 class="guia__subtitulo">
        Indicador de etapas
      </h3>
      <p class="guia__texto">
        Para sequências reais. A etapa atual fica em marinho; no celular, só a frase “Etapa 2 de 3: Confira” e a barra.
      </p>
      <div class="guia__pilha-larga">
        <IndicadorEtapas
          :etapas="etapasDemonstracao"
          :atual="etapaDemonstracao"
          rotulo="Etapas (exemplo)"
        />
        <SelectButton
          v-model="etapaDemonstracao"
          :options="[0, 1, 2]"
          :option-label="(valor: number) => etapasDemonstracao[valor] ?? ''"
          :allow-empty="false"
          aria-label="Escolher etapa da demonstração"
        />
      </div>

      <h3 class="guia__subtitulo">
        Envio de arquivo
      </h3>
      <div class="guia__pilha-larga">
        <EnvioArquivo
          id="guia-envio-vazio"
          :textos="textosEnvioDemonstracao"
          aceite=".csv"
          :arquivo="arquivoDemonstracao"
          @selecionar="selecionarArquivoDemonstracao"
        />
        <EnvioArquivo
          id="guia-envio-carregando"
          :textos="textosEnvioDemonstracao"
          :arquivo="{ name: 'lista-ana-e-bruno.csv', size: 48213 }"
          carregando
        />
        <EnvioArquivo
          id="guia-envio-erro"
          :textos="textosEnvioDemonstracao"
          erro="Envie uma planilha salva como CSV. No Excel: Arquivo › Salvar como › CSV."
        />
        <EnvioArquivo
          id="guia-envio-desabilitado"
          :textos="textosEnvioDemonstracao"
          desabilitado
        />
      </div>

      <h3 class="guia__subtitulo">
        Lista de problemas por linha
      </h3>
      <div class="guia__pilha-larga">
        <ListaProblemasLinha
          :itens="PROBLEMAS_DEMONSTRACAO"
          :filtros="FILTROS_PROBLEMAS_DEMONSTRACAO"
          :textos="textosProblemasDemonstracao"
          :limite="2"
        />
      </div>

      <h3 class="guia__subtitulo">
        Diálogo de confirmação
      </h3>
      <div class="guia__pilha">
        <Button
          label="Importar só os 2 convites prontos"
          data-teste="guia-abrir-confirmacao"
          @click="confirmacaoVisivel = true"
        />
      </div>
      <DialogoConfirmacao
        v-model:visivel="confirmacaoVisivel"
        titulo="Importar só os convites prontos?"
        mensagem="1 convite (3 pessoas) fica de fora porque tem linhas com problema. Você pode importá-lo depois, com a planilha corrigida."
        rotulo-confirmar="Importar 2 convites"
        rotulo-cancelar="Voltar e corrigir"
        :executando="confirmacaoExecutando"
        @confirmar="confirmarDemonstracao"
      />
    </section>

    <section
      id="rsvp"
      class="guia__secao"
      aria-labelledby="titulo-rsvp"
    >
      <h2
        id="titulo-rsvp"
        class="guia__titulo-secao"
      >
        Confirmação de presença
      </h2>
      <p class="guia__texto">
        A página do convidado é o próprio convite: cartão branco sobre o marinho névoa com a inicial da marca, nomes dos anfitriões empilhados em Jost leve, o “&amp;” em Cormorant itálico e a data espaçada. Todo o resto é quieto, grande e direto. Use no layout público, variante convite.
      </p>

      <h3 class="guia__subtitulo">
        Cabeçalho do convite
      </h3>
      <p class="guia__texto">
        Completo no formulário (data por extenso, horário e locais); compacto depois do envio. O título da página são os anfitriões, para dar confiança de que o link é legítimo.
      </p>
      <div
        class="guia__moldura guia__moldura--baixa"
        role="group"
        aria-label="Cabeçalho do convite completo em largura de celular"
      >
        <LayoutPublico demonstracao>
          <CabecalhoConvite
            primeiro="Ana Beatriz"
            segundo="Bruno Carvalho"
            tipo="Casamento"
            data="2027-05-22"
            horario="16:30"
            local-cerimonia="Igreja São José, Centro"
            local-recepcao="Espaço Jardim, Vila Nova"
          />
        </LayoutPublico>
      </div>
      <CabecalhoConvite
        primeiro="Ana Beatriz"
        segundo="Bruno Carvalho"
        tipo="Casamento"
        data="2027-05-22"
        variante="compacto"
      />

      <h3 class="guia__subtitulo">
        Escolha de presença
      </h3>
      <p class="guia__texto">
        Uma pessoa por linha, separadas por divisórias finas. Opções de 72 px; “Vou” marcado fica em marinho sobre o marinho suave; “Não vou”, em neutro — nunca vermelho, recusar não é erro. É um grupo de rádio: setas alternam, e o estado marcado tem ícone e peso, não só cor. O espaço abaixo das opções recebe a seção extra de cada pessoa (restrição alimentar).
      </p>
      <div class="guia__pilha-larga">
        <EscolhaPresenca
          v-model="escolhasDemonstracao.celia"
          nome="Célia Souza"
        />
        <EscolhaPresenca
          v-model="escolhasDemonstracao.antonio"
          nome="Antônio Souza"
          :erro="erroEscolhaDemonstracao"
          @update:model-value="erroEscolhaDemonstracao = null"
        />
        <EscolhaPresenca
          v-model="escolhasDemonstracao.lia"
          nome="Lia Souza"
          :marcador="TEXTOS_RSVP.crianca"
        >
          <p class="guia__texto">
            Área reservada para a seção extra da pessoa.
          </p>
        </EscolhaPresenca>
        <EscolhaPresenca
          :model-value="'Confirmado'"
          nome="Pedro Lima"
          :marcador="TEXTOS_RSVP.acompanhante"
          desabilitado
        />
        <Button
          label="Validar exemplo"
          severity="secondary"
          outlined
          @click="validarEscolhasDemonstracao"
        />
      </div>

      <h3 class="guia__subtitulo">
        Barra de ação fixa
      </h3>
      <p class="guia__texto">
        No celular, fica presa ao rodapé da folha com o status à esquerda (anunciado ao leitor de tela) e a ação primária ocupando o resto; a partir de 640 px vira o último bloco da folha.
      </p>
      <div class="guia__pilha-larga">
        <BarraAcaoFixa>
          <template #status>
            {{ faltamDemonstracao > 0 ? TEXTOS_RSVP.faltam(faltamDemonstracao) : TEXTOS_RSVP.contador(2, 3) }}
          </template>
          <Button :label="TEXTOS_RSVP.enviar" />
        </BarraAcaoFixa>
      </div>

      <h3 class="guia__subtitulo">
        Selo de confirmação
      </h3>
      <p class="guia__texto">
        O único movimento da página: um carimbo leve (escala 0,96 → 1 e opacidade em 250 ms) quando a resposta é enviada. Desligado com movimento reduzido.
      </p>
      <div class="guia__pilha-larga">
        <SeloConfirmacao
          :titulo="TEXTOS_RSVP.enviada"
          :animado="seloAnimadoDemonstracao"
        >
          <p>{{ TEXTOS_RSVP.obrigado('Família Souza') }}</p>
        </SeloConfirmacao>
        <Button
          label="Repetir o carimbo"
          severity="secondary"
          text
          @click="repetirSeloDemonstracao"
        />
      </div>

      <h3 class="guia__subtitulo">
        Menu de ações
      </h3>
      <p class="guia__texto">
        Agrupa ações secundárias de uma linha da listagem. Ações que desfazem algo ficam por último, em vermelho, e sempre pedem confirmação.
      </p>
      <div class="guia__linha">
        <MenuAcoes
          :itens="itensMenuDemonstracao"
          :rotulo="TEXTOS_ENVIO_CONVITE.maisAcoes"
          @selecionar="ultimaAcaoMenuDemonstracao = $event"
        />
        <span
          class="guia__texto"
          aria-live="polite"
        >{{ ultimaAcaoMenuDemonstracao ? `Selecionado: ${ultimaAcaoMenuDemonstracao}` : '' }}</span>
      </div>
    </section>

    <section
      id="dados-sensiveis"
      class="guia__secao"
      aria-labelledby="titulo-dados-sensiveis"
    >
      <h2
        id="titulo-dados-sensiveis"
        class="guia__titulo-secao"
      >
        Dados sensíveis
      </h2>
      <p class="guia__texto">
        Restrição alimentar e necessidade especial são dados de saúde (LGPD). O padrão é uma anotação discreta na margem do convite: fechada por padrão, aberta só por quem precisa, sem cor de destaque. O conteúdo informado nunca volta para a página pública — ela mostra apenas que há registro.
      </p>

      <h3 class="guia__subtitulo">
        Seletor de restrição alimentar
      </h3>
      <p class="guia__texto">
        Fica no espaço extra da escolha de presença, só para quem vai. Etiquetas são botões de alternância (<code>aria-pressed</code>) com ícone de marcado — nunca só cor. No painel, a variante já vem aberta e sem o fio da margem.
      </p>
      <div class="guia__pilha-larga">
        <EscolhaPresenca
          :model-value="'Confirmado'"
          nome="Lia Souza"
          :marcador="TEXTOS_RSVP.crianca"
        >
          <SeletorRestricaoAlimentar
            v-model="restricaoNovaDemonstracao"
            nome="Lia Souza"
          />
        </EscolhaPresenca>
        <EscolhaPresenca
          :model-value="'Confirmado'"
          nome="Célia Souza"
        >
          <SeletorRestricaoAlimentar
            v-model="restricaoRegistradaDemonstracao"
            nome="Célia Souza"
            possui-registro
          />
        </EscolhaPresenca>
        <SeletorRestricaoAlimentar
          v-model="restricaoPainelDemonstracao"
          nome="Rafael Lima"
          variante="painel"
          :erro="TEXTOS_DADOS_SENSIVEIS.erroOutraLonga"
        />
      </div>

      <h3 class="guia__subtitulo">
        Aviso de privacidade e consentimento
      </h3>
      <p class="guia__texto">
        O aviso é texto corrido em grafite sobre papel, sem ícone de alerta: informa finalidade, quem vê e o prazo de exclusão (em dias vindos da API). A caixa de consentimento só aparece quando há algo a enviar, nunca vem marcada e, se faltar, recebe o foco com a mensagem de erro ligada por <code>aria-describedby</code>.
      </p>
      <div class="guia__pilha-larga">
        <AvisoPrivacidade :dias-retencao="30">
          <CaixaConsentimento
            v-model="consentimentoDemonstracao"
            id-campo="guia-consentimento"
            :texto="TEXTOS_DADOS_SENSIVEIS.consentimento"
            :erro="erroConsentimentoDemonstracao"
          />
        </AvisoPrivacidade>
        <Button
          label="Validar exemplo"
          severity="secondary"
          outlined
          @click="validarConsentimentoDemonstracao"
        />
      </div>

      <h3 class="guia__subtitulo">
        Resumo em cardápio
      </h3>
      <p class="guia__texto">
        Para listas que vão para fornecedores (buffet): linhas com pontilhado até o número, como num cardápio, em vez de cartões com número grande. Título em Jost, número em marinho com algarismos tabulares.
      </p>
      <ResumoCardapio
        :titulo="TEXTOS_DADOS_SENSIVEIS.resumoBuffet"
        :linhas="linhasCardapioDemonstracao"
      >
        <template #rodape>
          {{ TEXTOS_DADOS_SENSIVEIS.totais(5, 4) }}
        </template>
      </ResumoCardapio>
    </section>

    <section
      id="confirmacoes"
      class="guia__secao"
      aria-labelledby="titulo-confirmacoes"
    >
      <h2
        id="titulo-confirmacoes"
        class="guia__titulo-secao"
      >
        Confirmações e buffet
      </h2>
      <p class="guia__texto">
        O painel usa uma forma para cada natureza de dado: pessoas no resumo de contagem, convites no caminho segmentado, restrições no cardápio pontilhado. Nada de fileira de cartões iguais.
      </p>

      <h3 class="guia__subtitulo">
        Caminho dos convites
      </h3>
      <p class="guia__texto">
        Barra única, lida da esquerda para a direita porque é uma sequência real: não enviado, enviado, visualizado. Cores por token (neutro, informação, marinho), separadas por 2 px de superfície e sempre acompanhadas da legenda com número — nunca só cor. Respondidos ficam fora da barra, no rodapé, porque são outra dimensão.
      </p>
      <div class="guia__pilha-larga">
        <BarraProgressoEnvio
          :titulo="TEXTOS_CONFIRMACOES.caminhoTitulo"
          :segmentos="segmentosDemonstracao"
          rotulo-acessivel="60 convites: 4 não enviados, 11 enviados, 45 visualizados"
        >
          <template #rodape>
            {{ TEXTOS_CONFIRMACOES.respondidos(38, 22) }}
          </template>
        </BarraProgressoEnvio>
        <BarraProgressoEnvio
          :titulo="TEXTOS_CONFIRMACOES.caminhoTitulo"
          :segmentos="segmentosVaziosDemonstracao"
          rotulo-acessivel=""
          :vazio="TEXTOS_CONFIRMACOES.semConvitesBarra"
        />
      </div>

      <h3 class="guia__subtitulo">
        Indicador de prazo
      </h3>
      <p class="guia__texto">
        Data limite de resposta com os dias que faltam. Fio marinho no normal, âmbar a partir de 3 dias, neutro quando encerrado. A ação opcional fica à direita.
      </p>
      <div class="guia__pilha-larga">
        <IndicadorPrazo
          data-limite="2027-05-12"
          :dias-restantes="12"
          aceita-respostas
        >
          <template #acao>
            <Button
              :label="TEXTOS_CONFIRMACOES.alterarPrazo"
              severity="secondary"
              text
            />
          </template>
        </IndicadorPrazo>
        <IndicadorPrazo
          data-limite="2027-05-12"
          :dias-restantes="2"
          aceita-respostas
        />
        <IndicadorPrazo
          data-limite="2027-05-12"
          :dias-restantes="-3"
          :aceita-respostas="false"
        />
      </div>

      <h3 class="guia__subtitulo">
        Layout de impressão
      </h3>
      <p class="guia__texto">
        Folha A4 para documentos que saem do sistema (ficha do buffet). As ações ficam acima da folha e somem na impressão, junto com fundo, borda e sombra. Conteúdo só em tinta e grafite, legível em fotocópia.
      </p>
      <div
        class="guia__moldura"
        role="group"
        aria-label="Exemplo do layout de impressão"
      >
        <LayoutImpressao
          demonstracao
          :rotulo-acoes="TEXTOS_FICHA_BUFFET.acoesRotulo"
        >
          <template #acoes>
            <span>{{ TEXTOS_FICHA_BUFFET.voltar }}</span>
            <Button
              :label="TEXTOS_FICHA_BUFFET.imprimir"
              icon="ie ie-imprimir"
            />
          </template>
          <ResumoCardapio
            :titulo="TEXTOS_FICHA_BUFFET.contagem"
            :linhas="contagemFichaDemonstracao"
          />
        </LayoutImpressao>
      </div>
    </section>

    <section
      id="mesas"
      class="guia__secao"
      aria-labelledby="titulo-mesas"
    >
      <h2
        id="titulo-mesas"
        class="guia__titulo-secao"
      >
        Mesas
      </h2>
      <p class="guia__texto">
        O mapa de mesas é uma lista, não um salão desenhado. A assinatura visual é a fileira de lugares: o anel de cadeiras desenrolado em linha, um ponto por lugar. Ela aparece no painel de cada mesa, nas opções do diálogo “Sentar em…” (versão compacta) e na impressão. Acima de 15 lugares a fileira quebra em duas.
      </p>

      <h3 class="guia__subtitulo">
        Ocupação da mesa
      </h3>
      <div class="guia__pilha-larga">
        <OcupacaoMesa
          :ocupados="0"
          :lugares="8"
        />
        <OcupacaoMesa
          :ocupados="5"
          :lugares="8"
        />
        <OcupacaoMesa
          :ocupados="8"
          :lugares="8"
        />
        <OcupacaoMesa
          :ocupados="17"
          :lugares="24"
        />
        <OcupacaoMesa
          :ocupados="4"
          :lugares="10"
          compacta
        />
      </div>

      <h3 class="guia__subtitulo">
        Linha de pessoa selecionável
      </h3>
      <p class="guia__texto">
        Caixa de seleção com o nome como rótulo, apoio (grupo, convite ou “Estava na Mesa 3”) e marcas de criança e acompanhante. Selecionada em marinho suave com borda marinho. Sem caixa de seleção quando o evento está arquivado. O slot “extra” recebe o aviso de convite dividido.
      </p>
      <ul class="guia__pilha-larga guia__lista-mesas">
        <li
          v-for="pessoa in pessoasMesaDemonstracao"
          :key="pessoa.chave"
        >
          <LinhaPessoaMesa
            :nome="pessoa.nome"
            :apoio="pessoa.apoio"
            :crianca="pessoa.crianca"
            :acompanhante="pessoa.acompanhante"
            :selecionada="pessoasMesaSelecionadas.includes(pessoa.chave)"
            @update:selecionada="alternarPessoaMesaDemonstracao(pessoa.chave, $event)"
          >
            <template
              v-if="pessoa.chave === 'm3'"
              #extra
            >
              <BadgeStatus
                :texto="TEXTOS_MESAS.conviteDividido"
                variante="alerta"
              />
            </template>
          </LinhaPessoaMesa>
        </li>
        <li>
          <LinhaPessoaMesa
            nome="Marcos Lima"
            apoio="Somente leitura (evento arquivado)"
            :selecionavel="false"
          />
        </li>
      </ul>

      <h3 class="guia__subtitulo">
        Barra de seleção
      </h3>
      <p class="guia__texto">
        A barra de ação fixa ganhou a variante “selecao”: fica fixa no rodapé também no desktop, em painel com borda, botões com largura do texto a partir de 640 px e 48 px de altura no celular. Ela aparece só quando há seleção: contagem anunciada com “Limpar”, “Tirar da mesa” secundária quando alguém selecionado já está sentado e “Sentar em…” primária.
      </p>
      <div class="guia__pilha-larga guia__barra-mesas">
        <BarraAcaoFixa variante="selecao">
          <template #status>
            {{ TEXTOS_MESAS.selecionadas(pessoasMesaSelecionadas.length) }}
          </template>
          <Button
            :label="TEXTOS_MESAS.tirarDaMesa"
            severity="secondary"
            outlined
          />
          <Button
            :label="TEXTOS_MESAS.sentarEm"
            icon="ie ie-mesa"
          />
        </BarraAcaoFixa>
      </div>
    </section>

    <section
      id="acesso-anfitriao"
      class="guia__secao"
      aria-labelledby="titulo-acesso-anfitriao-guia"
    >
      <h2
        id="titulo-acesso-anfitriao-guia"
        class="guia__titulo-secao"
      >
        Acesso dos anfitriões
      </h2>
      <p class="guia__texto">
        Dois lugares à mesa, ligados pelo "&amp;" em Cormorant itálico: a estrutura mostra de relance quantos acessos restam (limite de 2). Use ParLugares com dois LugarAcesso. O lugar vazio tem borda tracejada sobre o fundo e uma única ação secundária; o formulário de convite abre dentro do próprio lugar. Situação sempre com texto (BadgeStatus) e data em números tabulares. Revogar fica no menu de ações e só é confirmado no diálogo com botão destrutivo.
      </p>
      <h3 class="guia__subtitulo">
        Estados do lugar
      </h3>
      <div class="guia__pilha-larga">
        <ParLugares :rotulo="TEXTOS_ACESSO_ANFITRIAO.rotuloLista">
          <template #primeiro>
            <LugarAcesso
              situacao="ativo"
              titulo="Lívia Moraes"
              subtitulo="livia@exemplo.com"
              :rotulo-situacao="ROTULOS_SITUACAO_ACESSO.Ativo"
              :detalhe="TEXTOS_ACESSO_ANFITRIAO.ativoDesde('05/10/2026')"
            >
              <template #acoes>
                <MenuAcoes
                  :itens="[{ chave: 'revogar', rotulo: TEXTOS_ACESSO_ANFITRIAO.revogar, icone: 'ie ie-usuario-menos', perigoso: true }]"
                  :rotulo="TEXTOS_ACESSO_ANFITRIAO.acoesLugar('Lívia Moraes')"
                  @selecionar="dialogoRevogacaoVisivel = true"
                />
              </template>
            </LugarAcesso>
          </template>
          <template #segundo>
            <LugarAcesso
              situacao="vazio"
              :titulo="TEXTOS_ACESSO_ANFITRIAO.lugarVazio"
              :subtitulo="TEXTOS_ACESSO_ANFITRIAO.lugarVazioApoio"
            >
              <template #acoes>
                <Button
                  :label="TEXTOS_ACESSO_ANFITRIAO.convidar"
                  icon="ie ie-usuario-mais"
                  severity="secondary"
                  outlined
                />
              </template>
            </LugarAcesso>
          </template>
        </ParLugares>
        <ParLugares rotulo="Convites aguardando aceite">
          <template #primeiro>
            <LugarAcesso
              situacao="pendente"
              titulo="Rafael Souza"
              subtitulo="rafael@exemplo.com"
              :rotulo-situacao="ROTULOS_SITUACAO_ACESSO.Pendente"
              :detalhe="TEXTOS_ACESSO_ANFITRIAO.expiraEm('12/10/2026')"
            >
              <template #acoes>
                <Button
                  :label="TEXTOS_ACESSO_ANFITRIAO.reenviar"
                  icon="ie ie-enviar"
                  severity="secondary"
                  text
                />
              </template>
            </LugarAcesso>
          </template>
          <template #segundo>
            <LugarAcesso
              situacao="expirado"
              titulo="Bruno Lima"
              subtitulo="bruno@exemplo.com"
              :rotulo-situacao="ROTULOS_SITUACAO_ACESSO.Expirado"
              :detalhe="TEXTOS_ACESSO_ANFITRIAO.expirouEm('01/10/2026')"
            >
              <template #acoes>
                <Button
                  :label="TEXTOS_ACESSO_ANFITRIAO.reenviar"
                  icon="ie ie-enviar"
                  severity="secondary"
                  outlined
                />
              </template>
            </LugarAcesso>
          </template>
        </ParLugares>
      </div>
      <h3 class="guia__subtitulo">
        Confirmação destrutiva
      </h3>
      <p class="guia__texto">
        DialogoConfirmacao com a prop perigoso: foco inicial em Cancelar e botão de confirmação destrutivo. Use para revogar acessos; exclusão de itens continua no padrão de exclusão.
      </p>
      <Button
        label="Abrir confirmação de revogação"
        severity="secondary"
        outlined
        data-teste="demonstrar-revogacao"
        @click="dialogoRevogacaoVisivel = true"
      />
      <DialogoConfirmacao
        v-model:visivel="dialogoRevogacaoVisivel"
        :titulo="TEXTOS_ACESSO_ANFITRIAO.revogarTitulo('Lívia Moraes')"
        :mensagem="TEXTOS_ACESSO_ANFITRIAO.revogarMensagemAtivo('Lívia Moraes')"
        :rotulo-confirmar="TEXTOS_ACESSO_ANFITRIAO.revogar"
        :rotulo-cancelar="TEXTOS_ACESSO_ANFITRIAO.cancelar"
        perigoso
        @confirmar="dialogoRevogacaoVisivel = false"
      />
    </section>

    <section
      id="navegacao"
      class="guia__secao"
      aria-labelledby="titulo-navegacao"
    >
      <h2
        id="titulo-navegacao"
        class="guia__titulo-secao"
      >
        Navegação e workspace do evento
      </h2>
      <p class="guia__texto">
        O rail global (72 px) serve à carteira. Dentro de <code class="guia__codigo">/eventos/:id</code>, surge a navegação do evento (232 px) com o nome dos anfitriões, a data e a contagem, e os módulos agrupados em Planejar, Pessoas, Dinheiro &amp; documentos e Execução. Grupos sem módulo não aparecem. Um módulo novo é registrado em <code class="guia__codigo">MODULOS_EVENTO</code> (<code class="guia__codigo">layouts/modulosEvento.ts</code>) com <code class="guia__codigo">grupo</code>, <code class="guia__codigo">rota</code> e <code class="guia__codigo">rotasRelacionadas</code>; o papel Anfitrião só vê módulos cujas rotas não são <code class="guia__codigo">somenteAssessoria</code>.
      </p>
      <div
        class="guia__workspace"
        data-teste="guia-workspace"
      >
        <div class="guia__workspace-rail">
          <MarcaProduto
            somente-simbolo
            tom="claro"
          />
          <RailNavegacao :itens="itensRail" />
        </div>
        <div class="guia__workspace-navegacao">
          <NavegacaoEvento
            :evento="eventoDemonstracao"
            :grupos="gruposDemonstracao"
          />
        </div>
        <div class="guia__workspace-navegacao guia__workspace-navegacao--anfitriao">
          <NavegacaoEvento
            :evento="eventoDemonstracao"
            :grupos="gruposAnfitriaoDemonstracao"
          />
        </div>
      </div>
    </section>

    <section
      id="contextos"
      class="guia__secao"
      aria-labelledby="titulo-contextos"
    >
      <h2
        id="titulo-contextos"
        class="guia__titulo-secao"
      >
        Dois contextos, um sistema
      </h2>
      <p class="guia__texto">
        Mesmos tokens e componentes; muda a densidade, a proporção serifa/sans e a quantidade de ações por tela.
      </p>
      <div class="guia__contextos">
        <div class="guia__contexto">
          <span class="guia__rotulo-estado">Cerimonialista</span>
          <strong>Denso, escaneável, sans</strong>
          <div class="guia__contexto-linha">
            <span>Buffet</span>
            <BadgeStatus
              texto="Assinado"
              variante="sucesso"
            />
          </div>
          <div class="guia__contexto-linha">
            <span>Decoração</span>
            <BadgeStatus
              texto="Aguardando assinatura"
              variante="alerta"
            />
          </div>
        </div>
        <div class="guia__contexto guia__contexto--anfitriao">
          <span class="guia__rotulo-estado">Anfitriões</span>
          <span class="guia__contexto-frase">Seu evento está tomando forma.</span>
          <span class="guia__texto">Mais ar, serifa editorial, uma decisão por vez.</span>
        </div>
      </div>
    </section>

    <section
      id="layouts"
      class="guia__secao"
      aria-labelledby="titulo-layouts"
    >
      <h2
        id="titulo-layouts"
        class="guia__titulo-secao"
      >
        Layouts
      </h2>
      <p class="guia__texto">
        Esta página usa o layout do painel: reduza a janela abaixo de 1024 px para ver o rail virar barra escura com gaveta. Ao lado, o layout público padrão em largura de celular; o convite (RSVP) usa a variante convite.
      </p>
      <div
        class="guia__moldura"
        aria-label="Exemplo do layout público em largura de celular"
        role="group"
      >
        <LayoutPublico demonstracao>
          <template #marca>
            <MarcaProduto somente-simbolo />
          </template>
          <p class="guia__publico-nomes">
            Lívia &amp; Rafael
          </p>
          <p class="guia__publico-data">
            {{ formatarDataExtenso(dataExemplo) }}
          </p>
          <p>Queremos muito celebrar com você. Confirme sua presença até 30 de novembro para organizarmos as mesas com carinho.</p>
          <Button label="Confirmar presença" />
          <template #rodape>
            Dúvidas? Fale com a cerimonialista pelo WhatsApp.
          </template>
        </LayoutPublico>
      </div>
    </section>

    <section
      id="tarefas"
      class="guia__secao"
      aria-labelledby="titulo-tarefas-guia"
    >
      <h2
        id="titulo-tarefas-guia"
        class="guia__titulo-secao"
      >
        Tarefas
      </h2>
      <p class="guia__texto">
        ItemTarefa é a linha de tarefa: o anel de conclusão (24 px visível, alvo de 44 px e 48 px em toque) preenche em verde de sucesso ao concluir; é o único movimento da tela e respeita a redução de movimento. Título 16 em peso médio, metadados 13 em texto de apoio, no máximo um badge (Atrasada, Vence hoje, Esta semana, Em andamento, Concluída ou Cancelada) — "A fazer" no prazo não leva badge. Concluída fica riscada; cancelada tem anel tracejado e não alterna. As ações de gestão ficam no MenuAcoes em modo somente ícone. Clique nos anéis para ver os estados.
      </p>
      <h3 class="guia__subtitulo">
        Estados da linha
      </h3>
      <div class="guia__pilha-larga">
        <ul
          class="guia__lista-tarefas"
          aria-label="Exemplos de tarefas"
        >
          <ItemTarefa
            v-for="tarefa in tarefasDemonstracao"
            :key="tarefa.id"
            :titulo="tarefa.titulo"
            :metadados="metadadosTarefa(tarefa, false)"
            :descricao="tarefa.descricao"
            :badge="badgeTarefa(tarefa)"
            :concluida="tarefa.status === 'Concluida'"
            :cancelada="tarefa.status === 'Cancelada'"
            :rotulo-alternar="tarefa.status === 'Concluida' ? TEXTOS_TAREFAS.reabrirAria(tarefa.titulo) : TEXTOS_TAREFAS.concluirAria(tarefa.titulo)"
            @alternar="alternarTarefaDemonstracao(tarefa)"
          >
            <template #acoes>
              <MenuAcoes
                :itens="[
                  { chave: 'editar', rotulo: TEXTOS_TAREFAS.acaoEditar, icone: 'ie ie-editar' },
                  { chave: 'excluir', rotulo: TEXTOS_TAREFAS.acaoExcluir, icone: 'ie ie-excluir', perigoso: true },
                ]"
                :rotulo="TEXTOS_TAREFAS.maisAcoes"
                :rotulo-acessivel="TEXTOS_TAREFAS.maisAcoesAria(tarefa.titulo)"
                somente-icone
              />
            </template>
          </ItemTarefa>
        </ul>
        <h3 class="guia__subtitulo">
          Visão dos anfitriões e somente leitura
        </h3>
        <ul
          class="guia__lista-tarefas"
          aria-label="Tarefas dos anfitriões"
        >
          <ItemTarefa
            v-for="tarefa in tarefasAnfitriaoDemonstracao"
            :key="tarefa.id"
            :titulo="tarefa.titulo"
            :metadados="metadadosTarefa(tarefa, true)"
            :badge="badgeTarefa(tarefa)"
            :concluida="tarefa.status === 'Concluida'"
            :pode-alternar="false"
            :rotulo-alternar="TEXTOS_TAREFAS.somenteLeituraAria(tarefa.titulo, tarefa.status === 'Concluida' ? 'Concluída' : 'A fazer')"
          />
        </ul>
        <h3 class="guia__subtitulo">
          Pendências no dashboard
        </h3>
        <BlocoPendenciasTarefas :pendencias="PENDENCIAS_DEMONSTRACAO" />
        <BlocoPendenciasTarefas :pendencias="{ totalAtrasadas: 0, totalEstaSemana: 0, eventosComAtraso: 0, atrasadas: [], estaSemana: [] }" />
        <BlocoPendenciasTarefas
          :pendencias="null"
          com-erro
        />
      </div>
    </section>

    <section
      id="checklist"
      class="guia__secao"
      aria-labelledby="titulo-checklist-guia"
    >
      <h2
        id="titulo-checklist-guia"
        class="guia__titulo-secao"
      >
        Checklist
      </h2>
      <p class="guia__texto">
        ReguaMarcos é o elemento memorável do checklist: agrupa itens pela distância até o dia do evento (12 meses, 6 meses, 3 meses, 30 dias, reta final, no dia, depois). O número do marco usa a fonte de exibição em peso leve; o complemento e a contagem ficam em texto de apoio. Uma linha vertical liga os marcos em ordem; o nó do marco preenche em verde de sucesso quando todas as tarefas dele estão encerradas. No celular a régua empilha (rótulo acima da lista). Marcos sem itens não aparecem. A lista de cada marco usa ItemModeloChecklist (no modelo) ou ItemTarefa (no evento).
      </p>
      <h3 class="guia__subtitulo">
        Progresso do checklist
      </h3>
      <div class="guia__pilha-larga">
        <ProgressoChecklist
          :percentual="62"
          :concluidas="16"
          :consideradas="26"
          :canceladas="1"
        />
        <ProgressoChecklist
          :percentual="0"
          :concluidas="0"
          :consideradas="26"
        />
        <ProgressoChecklist
          :percentual="null"
          :concluidas="0"
          :consideradas="0"
        />
      </div>
      <h3 class="guia__subtitulo">
        Régua de marcos com itens de modelo
      </h3>
      <div class="guia__painel-regua">
        <ReguaMarcos
          :marcos="marcosModeloDemonstracao"
          rotulo="Exemplo de modelo por marco"
        >
          <template #marco="{ marco, idTitulo }">
            <ul
              class="guia__lista-modelo"
              :aria-labelledby="idTitulo"
            >
              <ItemModeloChecklist
                v-for="item in itensDoMarcoDemonstracao(marco.chave)"
                :key="item.id"
                :titulo="item.titulo"
                :prazo-relativo="descreverPrazoRelativo(item.diasAntesDoEvento)"
                :metadados="metadadosModeloDemonstracao(item)"
                :descricao="item.descricao"
              >
                <template #acoes>
                  <MenuAcoes
                    :itens="[
                      { chave: 'editar', rotulo: TEXTOS_MODELOS_CHECKLIST.itemEditar, icone: 'ie ie-editar' },
                      { chave: 'excluir', rotulo: TEXTOS_MODELOS_CHECKLIST.itemExcluir, icone: 'ie ie-excluir', perigoso: true },
                    ]"
                    :rotulo="TEXTOS_MODELOS_CHECKLIST.maisAcoes"
                    :rotulo-acessivel="TEXTOS_MODELOS_CHECKLIST.itemMaisAcoesAria(item.titulo)"
                    somente-icone
                  />
                </template>
              </ItemModeloChecklist>
            </ul>
          </template>
        </ReguaMarcos>
      </div>
      <p class="guia__texto">
        Na navegação do evento, o módulo Checklist mostra o percentual à direita do rótulo, em texto de apoio (marinho quando ativo), anunciado como "80% concluído". Veja a seção Navegação e workspace.
      </p>
    </section>

    <section
      id="fornecedores"
      class="guia__secao"
      aria-labelledby="titulo-fornecedores-guia"
    >
      <h2
        id="titulo-fornecedores-guia"
        class="guia__titulo-secao"
      >
        Fornecedores
      </h2>
      <p class="guia__texto">
        A base de fornecedores é a agenda de contatos da assessoria. O elemento memorável é o IndiceCategorias: uma lista de categorias com a contagem em Jost leve editorial (número editorial), que é ao mesmo tempo panorama da base e filtro; a categoria escolhida fica em marinho suave com texto marinho. No celular o índice vira um seletor "Categoria". A lista agrupa por categoria (cabeçalho com a contagem em texto de apoio) e cada fornecedor é uma LinhaFornecedor, com os canais de contato na própria linha. Ícones novos: fornecedor (traço fino) e telefone.
      </p>
      <h3 class="guia__subtitulo">
        Índice de categorias e linhas de fornecedor
      </h3>
      <div class="guia__fornecedores">
        <IndiceCategorias
          v-model="categoriaDemonstracao"
          :itens="contagensFornecedoresDemonstracao"
          rotulo="Categorias de exemplo"
          :rotulo-todas="TEXTOS_FORNECEDORES.todas"
          :total="fornecedoresAtivosDemonstracao.length"
        />
        <div class="guia__painel-fornecedores">
          <section
            v-for="grupo in gruposFornecedoresDemonstracao"
            :key="grupo.categoria"
            :aria-label="grupo.rotulo"
          >
            <h4 class="guia__grupo-fornecedores">
              {{ grupo.rotulo }}
            </h4>
            <ul class="guia__lista-fornecedores">
              <LinhaFornecedor
                v-for="fornecedor in grupo.fornecedores"
                :key="fornecedor.id"
                :nome-empresa="fornecedor.nomeEmpresa"
                :destino="{ name: 'style-guide' }"
                :responsavel="fornecedor.responsavel"
                :telefone="fornecedor.telefone"
                :email="fornecedor.email"
                :site="fornecedor.site"
                :instagram="fornecedor.instagram"
              >
                <template #acoes>
                  <MenuAcoes
                    :itens="[
                      { chave: 'editar', rotulo: TEXTOS_FORNECEDORES.editar, icone: 'ie ie-editar' },
                      { chave: 'arquivar', rotulo: TEXTOS_FORNECEDORES.arquivar, icone: 'ie ie-arquivar' },
                      { chave: 'excluir', rotulo: TEXTOS_FORNECEDORES.excluir, icone: 'ie ie-excluir', perigoso: true },
                    ]"
                    :rotulo="TEXTOS_FORNECEDORES.maisAcoes"
                    :rotulo-acessivel="TEXTOS_FORNECEDORES.maisAcoesAria(fornecedor.nomeEmpresa)"
                    somente-icone
                  />
                </template>
              </LinhaFornecedor>
            </ul>
          </section>
        </div>
      </div>
      <h3 class="guia__subtitulo">
        Linha arquivada, canais completos e estado vazio
      </h3>
      <div class="guia__pilha-larga">
        <ul class="guia__lista-fornecedores guia__painel-fornecedores">
          <LinhaFornecedor
            nome-empresa="Florista Jardim"
            :destino="{ name: 'style-guide' }"
            responsavel="Rui Prado"
            categoria="Decoração"
            telefone="21999887766"
            arquivado
            :rotulo-arquivado="TEXTOS_FORNECEDORES.badgeArquivado"
          />
        </ul>
        <CanaisContato
          nome="Buffet Oliveira"
          telefone="11987654321"
          email="contato@buffetoliveira.com.br"
          site="https://buffetoliveira.com.br"
          instagram="buffetoliveira"
          variante="completa"
        />
        <EstadoVazio
          icone="fornecedor"
          :titulo="TEXTOS_FORNECEDORES.vazioTitulo"
          :descricao="TEXTOS_FORNECEDORES.vazioTexto"
        />
      </div>
      <p class="guia__texto">
        Canais só aparecem quando o valor é válido; os links são montados por funções com esquema fixo (tel:, mailto:, wa.me, instagram.com e só http ou https para site), e os externos abrem em nova aba com rel="noopener noreferrer". Na variante compacta cada canal é um botão-ícone de 44 px com nome acessível ("Ligar para Buffet Oliveira").
      </p>
    </section>

    <section
      id="fornecedores-evento"
      class="guia__secao"
      aria-labelledby="titulo-fornecedores-evento-guia"
    >
      <h2
        id="titulo-fornecedores-evento-guia"
        class="guia__titulo-secao"
      >
        Fornecedores do evento
      </h2>
      <p class="guia__texto">
        O módulo Fornecedores do evento é o livro-caixa de quem vai fazer o quê e por quanto. O elemento memorável é o ResumoOrcamento: uma frase editorial com os dois totais em Jost leve ("R$ 25.900,00 contratados de R$ 43.300,00 orçados") e, por categoria, uma régua fina em que o trecho marinho é o contratado sobre o orçado e o trilho é o que ainda está em aberto. Quando o contratado passa do orçado, a régua fica cheia em âmbar e aparece o selo "acima do orçado" (cor + ícone + texto). É uma tabela acessível (legenda e cabeçalhos para leitor de tela); a régua é decorativa. Vínculos cancelados ficam fora do resumo.
      </p>
      <h3 class="guia__subtitulo">
        Resumo do orçamento
      </h3>
      <ResumoOrcamento :resumo="resumoOrcamentoDemonstracao" />
      <h3 class="guia__subtitulo">
        Linhas de fornecedor do evento (os quatro status)
      </h3>
      <p class="guia__texto">
        LinhaFornecedorEvento: empresa e status na primeira linha, serviço em texto de apoio, valores orçado e contratado em algarismos tabulares, indicador "Contrato" quando há PDF anexado e canais de contato compactos. Status: Cotação (informação), Em negociação (alerta), Contratado (sucesso), Cancelado (neutro, com nome e valores em texto de apoio). O nome vira link para editar só para a assessoria; os anfitriões vê o nome sem link e, no lugar do menu, "Baixar contrato".
      </p>
      <ul class="guia__lista-fornecedores guia__painel-fornecedores">
        <LinhaFornecedorEvento
          v-for="vinculo in VINCULOS_DEMONSTRACAO"
          :key="vinculo.id"
          :nome-empresa="vinculo.fornecedor.nomeEmpresa"
          :status="vinculo.status"
          :servico="vinculo.servico"
          :valor-orcado="vinculo.valorOrcado"
          :valor-contratado="vinculo.valorContratado"
          :possui-contrato="vinculo.contrato !== null"
          :destino="{ name: 'style-guide' }"
          :telefone="vinculo.fornecedor.telefone"
        >
          <template #acoes>
            <MenuAcoes
              :itens="[
                { chave: 'editar', rotulo: 'Editar', icone: 'ie ie-editar' },
                { chave: 'remover', rotulo: 'Remover do evento', icone: 'ie ie-excluir', perigoso: true },
              ]"
              rotulo="Mais ações"
              :rotulo-acessivel="`Mais ações para ${vinculo.fornecedor.nomeEmpresa}`"
              somente-icone
            />
          </template>
        </LinhaFornecedorEvento>
      </ul>
      <h3 class="guia__subtitulo">
        Contrato em PDF
      </h3>
      <p class="guia__texto">
        AnexoContrato: sem anexo mostra a área de envio (PDF até 10 MB, validado pela assinatura do arquivo); com anexo mostra nome, tamanho e data com "Baixar", "Substituir" e "Remover contrato" (este sempre com confirmação destrutiva). O download é sempre um arquivo baixado, nunca aberto dentro do Celebri. Para os anfitriões, só "Baixar".
      </p>
      <div class="guia__pilha-larga">
        <AnexoContrato
          nome-empresa="Doce Ateliê"
          :contrato="null"
        />
        <AnexoContrato
          nome-empresa="Buffet São João"
          :contrato="contratoDemonstracao"
        />
        <AnexoContrato
          nome-empresa="Buffet São João"
          :contrato="contratoDemonstracao"
          :editavel="false"
        />
        <AnexoContrato
          nome-empresa="Florista Jardim"
          :contrato="null"
          :erro="TEXTOS_CONTRATO.erroFormato"
        />
        <AnexoContrato
          nome-empresa="Florista Jardim"
          :contrato="null"
          enviando
        />
      </div>
    </section>

    <section
      id="cronograma"
      class="guia__secao"
      aria-labelledby="titulo-cronograma-guia"
    >
      <h2
        id="titulo-cronograma-guia"
        class="guia__titulo-secao"
      >
        Cronograma do dia
      </h2>
      <p class="guia__texto">
        O cronograma é lido em pé, no celular. LinhaCronograma desenha "o fio do dia": horário de início em Jost com algarismos tabulares numa coluna fixa, um fio marinho contínuo com um nó por item e o conteúdo à direita (atividade, distância da cerimônia, local, responsável, fornecedor, instruções em até duas linhas). O nó do item na hora da cerimônia vira um nó duplo em marinho claro, o único ornamento da tela; conflito de horário troca o nó por um anel âmbar e mostra um selo de alerta com texto. A lista é uma &lt;ol&gt; por dia, dentro de um painel com borda; para a assessoria a linha inteira é um botão que abre a edição, para os anfitriões é texto com o horário lido por extenso. AtalhosPreenchimento oferece valores conhecidos (locais da cerimônia e da recepção) em pílulas com aria-pressed; a pílula do valor atual fica no marinho suave.
      </p>
      <h3 class="guia__subtitulo">
        Linha do cronograma (padrão, cerimônia, conflito, dia seguinte e somente leitura)
      </h3>
      <ol class="guia__cronograma">
        <LinhaCronograma
          inicio="13:00"
          termino="15:00"
          atividade="Making of da noiva"
          local="Hotel Fasano"
          responsavel="Ana"
          fornecedor="Estúdio Luz"
          instrucoes="Chegar 15 minutos antes. Levar o kit de retoque."
          possui-nota-interna
          relativo-cerimonia="3 h 30 antes da cerimônia"
          editavel
          rotulo="Editar Making of da noiva, das 13:00 às 15:00"
        />
        <LinhaCronograma
          inicio="16:30"
          termino="17:15"
          atividade="Cerimônia"
          local="Paróquia São José"
          responsavel="Fernanda"
          fornecedor="Coral Harmonia"
          :relativo-cerimonia="TEXTOS_CRONOGRAMA.relativoCerimonia"
          eh-cerimonia
          :conflitos="[TEXTOS_CRONOGRAMA.conflitoSelo('Retoque da noiva', '17:00')]"
          editavel
          rotulo="Editar Cerimônia, das 16:30 às 17:15"
        />
        <LinhaCronograma
          inicio="21:30"
          termino="02:00"
          termina-em-outro-dia
          atividade="Pista de dança"
          local="Espaço Villa Real"
          fornecedor="DJ Nando"
          relativo-cerimonia="5 h depois da cerimônia"
        />
      </ol>
      <h3 class="guia__subtitulo">
        Atalhos de preenchimento
      </h3>
      <div class="guia__atalhos">
        <AtalhosPreenchimento
          :rotulo="TEXTOS_CRONOGRAMA.rotuloAtalhos"
          :opcoes="atalhosLocalDemonstracao"
          :valor-atual="localCronogramaDemonstracao"
          @escolher="localCronogramaDemonstracao = $event"
        />
        <p
          class="guia__texto"
          data-teste="guia-local-escolhido"
        >
          {{ TEXTOS_CRONOGRAMA.campoLocal }}: {{ localCronogramaDemonstracao }}
        </p>
      </div>
    </section>

    <section
      id="modelos-cronograma"
      class="guia__secao"
      aria-labelledby="titulo-modelos-cronograma-guia"
    >
      <h2
        id="titulo-modelos-cronograma-guia"
        class="guia__titulo-secao"
      >
        Modelos de cronograma
      </h2>
      <p class="guia__texto">
        A área Modelos reúne dois tipos de modelo em páginas irmãs. AbasSecao é a navegação entre elas: links reais (não abas de conteúdo), a aba da página atual em marinho suave com texto marinho e aria-current="page", alvo de 44 px (48 px no toque) e rolagem horizontal própria quando não cabe no celular. No modelo de cronograma, o roteiro usa a mesma LinhaCronograma do evento, com os horários lidos na referência do modelo e a distância até a cerimônia ao lado; o nó da cerimônia com dois anéis é o pivô do roteiro.
      </p>
      <h3 class="guia__subtitulo">
        Abas da seção
      </h3>
      <AbasSecao
        :rotulo="TEXTOS_ABAS_MODELOS.rotulo"
        :abas="ABAS_MODELOS"
        ativa="cronograma"
      />
      <h3 class="guia__subtitulo">
        Item de modelo no roteiro (referência: cerimônia às 16:00)
      </h3>
      <ol class="guia__cronograma">
        <LinhaCronograma
          inicio="10:00"
          termino="14:00"
          atividade="Making of da noiva"
          responsavel="Equipe de beleza"
          fornecedor="Beleza"
          relativo-cerimonia="6 h antes da cerimônia"
          editavel
          rotulo="Editar Making of da noiva, 10:00, 6 h antes da cerimônia"
        />
        <LinhaCronograma
          inicio="16:00"
          termino="17:00"
          atividade="Cerimônia"
          local="Local da cerimônia"
          responsavel="Celebrante"
          :relativo-cerimonia="TEXTOS_CRONOGRAMA.relativoCerimonia"
          eh-cerimonia
          editavel
          rotulo="Editar Cerimônia, 16:00, hora da cerimônia"
        />
      </ol>
    </section>

    <section
      id="cronograma-publico"
      class="guia__secao"
      aria-labelledby="titulo-cronograma-publico-guia"
    >
      <h2
        id="titulo-cronograma-publico-guia"
        class="guia__titulo-secao"
      >
        Cronograma para a equipe
      </h2>
      <p class="guia__texto">
        O link público do cronograma usa o modo operação do board Grande Dia: LayoutPublico com variante "operacao", fundo marinho profundo e texto marinho névoa. A variante remapeia os tokens de texto, superfície, borda e destaque para os tokens operacao-*, então os estados padrão (carregando, vazio, erro) e o botão secundário funcionam sobre o fundo escuro sem estilos próprios. CabecalhoOperacao traz os nomes dos anfitriões em Jost leve com o "&amp;" em Cormorant itálico, a data por extenso, o selo do filtro (equipe completa ou "seus horários") e os locais. ItemRoteiro é a linha somente leitura: horário de início grande com algarismos tabulares numa coluna fixa, término abaixo ("+1" quando passa da meia-noite), fio contínuo com nó cinza, nó duplo em marinho claro no horário da cerimônia, nó verde e selo "Feito" quando o item foi concluído, e instruções num bloco com filete em marinho claro. O cartão claro do board fica reservado ao "Agora" da visão interativa. LinhaDestinoLink é a linha da área de links da assessoria: destino, detalhe, situação (Link ativo, Sem link, Link indisponível) e as ações no slot.
      </p>
      <h3 class="guia__subtitulo">
        Página pública (390 px)
      </h3>
      <div class="guia__operacao">
        <LayoutPublico
          demonstracao
          variante="operacao"
        >
          <CabecalhoOperacao
            primeiro="Ana Beatriz"
            segundo="Bruno"
            data="2027-05-15"
            filtro="Seus horários · Buffet Sabor"
            :locais="[
              { rotulo: 'Cerimônia', valor: '16:30 · Capela São José' },
              { rotulo: 'Recepção', valor: 'Espaço Jardim' },
            ]"
            :nivel-titulo="2"
          />
          <ol class="guia__lista-roteiro">
            <ItemRoteiro
              inicio="14:00"
              termino="15:30"
              atividade="Montagem do buffet"
              local="Espaço Jardim"
              responsavel="Fernanda"
              fornecedor="Buffet Sabor"
              instrucoes="Entrada pela rua lateral. Descarga até 14:30."
              concluido
            />
            <ItemRoteiro
              inicio="16:30"
              termino="17:15"
              atividade="Cerimônia"
              local="Capela São José"
              cerimonia
            />
            <ItemRoteiro
              inicio="21:30"
              termino="02:00"
              termina-em-outro-dia
              atividade="Pista de dança"
              responsavel="Fernanda"
            />
          </ol>
          <EstadoVazio
            icone="cronograma"
            titulo="Ainda não há horários para você."
            descricao="Quando a assessoria incluir seus horários, eles aparecem aqui. Toque em Atualizar para conferir."
          />
          <Button
            label="Atualizar"
            icon="ie ie-recarregar"
            severity="secondary"
            outlined
          />
        </LayoutPublico>
      </div>
      <h3 class="guia__subtitulo">
        Links para a equipe e fornecedores
      </h3>
      <ul class="guia__lista-roteiro">
        <LinhaDestinoLink
          rotulo="Equipe completa"
          detalhe="23 itens"
          situacao="ativo"
        >
          <template #acoes>
            <Button
              label="Enviar pelo WhatsApp"
              icon="ie ie-whatsapp"
              size="small"
              severity="secondary"
              outlined
            />
            <Button
              label="Copiar link"
              icon="ie ie-copiar"
              size="small"
              severity="secondary"
              text
            />
          </template>
        </LinhaDestinoLink>
        <LinhaDestinoLink
          rotulo="Buffet Sabor"
          detalhe="Buffet · 3 itens"
          situacao="semLink"
        >
          <template #acoes>
            <Button
              label="Enviar pelo WhatsApp"
              icon="ie ie-whatsapp"
              size="small"
            />
            <Button
              label="Gerar link"
              icon="ie ie-link"
              size="small"
              severity="secondary"
              text
            />
          </template>
        </LinhaDestinoLink>
        <LinhaDestinoLink
          rotulo="Fernanda"
          detalhe="4 itens"
          situacao="indisponivel"
        />
      </ul>
    </section>

    <section
      id="grande-dia"
      class="guia__secao"
      aria-labelledby="titulo-grande-dia-guia"
    >
      <h2
        id="titulo-grande-dia-guia"
        class="guia__titulo-secao"
      >
        Grande Dia
      </h2>
      <p class="guia__texto">
        O Grande Dia é a visão de operação do roteiro no momento atual, para o celular em uma mão. SuperficieOperacao leva o modo operação escuro para dentro do workspace com a classe global "tema-operacao" (o mesmo remapeamento de tokens da variante "operacao" do LayoutPublico). O único elemento claro da tela é o CartaoAgora (marinho névoa, texto marinho, apoio cinza): atividade em 30 px, "Desde … · até …", local, quem e o slot de contatos. RelogioOperacao mostra a hora em 56 px tabular e o selo "Ao vivo" (vermelho claro sobre vinho profundo, ponto que pulsa só sem preferência de movimento reduzido) ou a fase ("Faltam 12 dias", "Já passou"). LinhaProximo é o bloco com borda do próximo item, com "em N min" em marinho claro e o horário à direita. LinhaOperacao é a linha compacta de Também agora, Depois, Ficou sem marcar e Feitos (horário, atividade, detalhe e ações no slot). ContatoUmToque são as pílulas Ligar e WhatsApp de 48 px. FaixaFaseDia diz que o dia ainda não chegou ou já passou. PainelAgoraProximo compõe tudo a partir dos itens e do minuto atual e é a mesma visão na tela interna e no link público (sem slots de ação no público). BarraAcaoFixa ganhou a variante "operacao": barra escura com a ação principal em marinho claro de 56 px. CartaoAgora, ItemRoteiro e PainelAgoraProximo aceitam rotuloMomento, que nomeia o horário principal pelo tipo do evento ("Hora da cerimônia", "Hora da festa", "Hora do evento") num selo textual junto do anel. A tela interna soma a frase do momento principal em Cormorant itálico com filete, os contatos do momento, os fornecedores do dia e as pessoas confirmadas (ListaFornecedoresDia e ConfirmadosGrandeDia). Rótulos em caixa normal (exceção ao board, que usa caixa alta espaçada, para leitura rápida).
      </p>
      <h3 class="guia__subtitulo">
        No dia (390 px)
      </h3>
      <div class="guia__operacao">
        <SuperficieOperacao>
          <RelogioOperacao
            hora="16:34"
            selo="Ao vivo"
            ao-vivo
          />
          <PainelAgoraProximo
            :itens="itensPainelDemonstracao"
            :minuto-atual="994"
            prefixo="guia-grande-dia"
          >
            <template #contatos="{ item }">
              <ContatoUmToque
                v-if="item.contato"
                :nome="item.contato.nome"
                :telefone="item.contato.telefone"
              />
            </template>
            <template #acoes>
              <Button
                label="Feito"
                icon="ie ie-concluir"
                severity="secondary"
                outlined
                size="small"
              />
            </template>
          </PainelAgoraProximo>
          <ul class="guia__lista-operacao">
            <LinhaOperacao
              inicio="14:00"
              atividade="Montagem do buffet"
              detalhe="Feito às 15:20"
              concluido
            />
          </ul>
          <BarraAcaoFixa variante="operacao">
            <Button
              label="Marcar como feito"
              icon="ie ie-concluir"
            />
          </BarraAcaoFixa>
        </SuperficieOperacao>
      </div>
      <h3 class="guia__subtitulo">
        Peças isoladas e fora do dia
      </h3>
      <div class="guia__operacao">
        <SuperficieOperacao>
          <RelogioOperacao
            hora="10:12"
            selo="Faltam 12 dias"
          />
          <FaixaFaseDia
            titulo="O grande dia ainda não chegou"
            texto="O roteiro abaixo é o planejado. No dia, esta tela mostra o que está acontecendo agora."
          />
          <CartaoAgora
            id-titulo="guia-cartao-agora"
            inicio="21:30"
            termino="02:00"
            termina-em-outro-dia
            atividade="Pista de dança"
            responsavel="Fernanda"
            fornecedor="DJ Lua"
          />
          <LinhaProximo
            id-titulo="guia-linha-proximo"
            inicio="21:00"
            atividade="Corte do bolo"
            quem="Ana · Confeitaria"
            quando="em 1 h 05"
          />
          <ContatoUmToque
            nome="Buffet Sabor"
            telefone="11987654321"
          />
        </SuperficieOperacao>
      </div>
    </section>

    <section
      id="duplicacao"
      class="guia__secao"
      aria-labelledby="titulo-duplicacao-guia"
    >
      <h2
        id="titulo-duplicacao-guia"
        class="guia__titulo-secao"
      >
        Duplicar evento
      </h2>
      <p class="guia__texto">
        A tela Duplicar evento separa o que vai para o evento novo do que fica com os anfitriões de origem. OpcaoCopia é uma linha inteira clicável com caixa de seleção nativa, a quantidade em número editorial (marinho quando marcada, texto de apoio quando desmarcada ou desabilitada), título e descrição ligada por aria-describedby; o número visual é oculto do leitor de tela, que ouve a quantidade por extenso junto ao título. As opções vivem juntas numa única lista com borda e divisórias, nunca como cartões soltos. ListaNaoCopiado nomeia os anfitriões de origem ("Fica com Ana & João") e lista, em tom de apoio e com cadeado decorativo, os dados que nunca são copiados.
      </p>
      <h3 class="guia__subtitulo">
        Opções de cópia (marcada, desmarcada, desabilitada e carregando)
      </h3>
      <ul class="guia__opcoes-copia">
        <OpcaoCopia
          v-model="copiaTarefasDemonstracao"
          id-campo="guia-copia-tarefas"
          :titulo="TEXTOS_DUPLICACAO_EVENTO.opcaoTarefasTitulo"
          :descricao="TEXTOS_DUPLICACAO_EVENTO.opcaoTarefasDetalhe(26)"
          :complemento="TEXTOS_DUPLICACAO_EVENTO.tarefasCanceladas(1)"
          :quantidade="29"
          :rotulo-quantidade="TEXTOS_DUPLICACAO_EVENTO.quantidadeTarefas(29)"
        />
        <OpcaoCopia
          v-model="copiaFornecedoresDemonstracao"
          id-campo="guia-copia-fornecedores"
          :titulo="TEXTOS_DUPLICACAO_EVENTO.opcaoFornecedoresTitulo"
          :descricao="TEXTOS_DUPLICACAO_EVENTO.opcaoFornecedoresDetalhe"
          :complemento="TEXTOS_DUPLICACAO_EVENTO.fornecedoresIgnorados(1)"
          :quantidade="3"
          :rotulo-quantidade="TEXTOS_DUPLICACAO_EVENTO.quantidadeFornecedores(3)"
        />
        <OpcaoCopia
          v-model="copiaVaziaDemonstracao"
          id-campo="guia-copia-vazia"
          :titulo="TEXTOS_DUPLICACAO_EVENTO.opcaoFornecedoresTitulo"
          :descricao="TEXTOS_DUPLICACAO_EVENTO.opcaoFornecedoresVazia"
          :quantidade="0"
          desabilitado
        />
        <OpcaoCopia
          v-model="copiaCarregandoDemonstracao"
          id-campo="guia-copia-carregando"
          :titulo="TEXTOS_DUPLICACAO_EVENTO.opcaoTarefasTitulo"
          :descricao="TEXTOS_DUPLICACAO_EVENTO.opcaoTarefasDetalhe(0)"
          :quantidade="null"
        />
      </ul>
      <h3 class="guia__subtitulo">
        O que fica no evento de origem
      </h3>
      <ListaNaoCopiado
        :titulo="TEXTOS_DUPLICACAO_EVENTO.ficaCom('Ana & João')"
        :itens="TEXTOS_DUPLICACAO_EVENTO.ficaItens"
        id-titulo="guia-fica-com"
      />
    </section>

    <section
      id="financeiro"
      class="guia__secao"
      aria-labelledby="titulo-financeiro-guia"
    >
      <h2
        id="titulo-financeiro-guia"
        class="guia__titulo-secao"
      >
        Financeiro
      </h2>
      <p class="guia__texto">
        O Financeiro organiza as parcelas de todos os fornecedores contratados. O elemento memorável é o Livro de vencimentos: uma lista em ordem de data cortada pela linha do hoje (vermelha, como o "agora" da agenda). Acima dela ficam as vencidas; logo abaixo, os próximos 7 dias em âmbar; depois, o restante; as pagas ficam recolhidas no fim. Dinheiro sempre em algarismos tabulares e calculado em centavos inteiros.
      </p>
      <h3 class="guia__subtitulo">
        Resumo do orçamento com pagamentos
      </h3>
      <p class="guia__texto">
        ResumoOrcamento com exibir-pagamentos: a frase passa a "pagos de … contratados", o apoio traz a pagar, vencidos e orçado, e a régua ganha três camadas (pago em marinho, contratado a pagar em marinho claro e livre no orçamento no trilho) com legenda textual e rótulo acessível com os percentuais. Categoria com parcela vencida mostra o selo de erro com o valor.
      </p>
      <ResumoOrcamento
        :resumo="RESUMO_PAGAMENTOS_DEMONSTRACAO"
        exibir-pagamentos
      />
      <h3 class="guia__subtitulo">
        Parcelas e linha do hoje
      </h3>
      <p class="guia__texto">
        LinhaParcela: bloco de data (dia em Jost leve, mês abreviado), "Fornecedor · número/total", observação e indicador de comprovante em apoio, valor à direita e a situação por BadgeStatus: Vencida (erro), Vence hoje e Vence em N dias (alerta), Pendente (neutro), Paga em … (sucesso). A variante histórico (fornecedor cancelado) usa tons de apoio. LinhaHoje separa passado e futuro com texto, não só cor.
      </p>
      <div class="guia__painel-fornecedores">
        <ul class="guia__lista-fornecedores">
          <LinhaParcela
            v-for="parcela in PARCELAS_DEMONSTRACAO.slice(0, 1)"
            :key="parcela.id"
            :nome-empresa="parcela.nomeEmpresa"
            :numero="parcela.numero"
            :total="parcela.totalParcelas"
            :valor="parcela.valor"
            :vencimento="parcela.vencimento"
            :situacao="parcela.situacao"
            :dias-para-vencimento="parcela.diasParaVencimento"
            :vence-em-breve="parcela.venceEmBreve"
            :observacao="parcela.observacao"
          >
            <template #acoes>
              <MenuAcoes
                :itens="[
                  { chave: 'pagar', rotulo: 'Marcar como paga', icone: 'ie ie-concluir' },
                  { chave: 'editar', rotulo: 'Editar parcela', icone: 'ie ie-editar' },
                  { chave: 'remover', rotulo: 'Remover parcela', icone: 'ie ie-excluir', perigoso: true },
                ]"
                rotulo="Mais ações"
                :rotulo-acessivel="'Ações da parcela ' + parcela.numero + '/' + parcela.totalParcelas + ' de ' + parcela.nomeEmpresa"
                somente-icone
              />
            </template>
          </LinhaParcela>
        </ul>
        <LinhaHoje :hoje="HOJE_DEMONSTRACAO" />
        <ul class="guia__lista-fornecedores">
          <LinhaParcela
            v-for="parcela in PARCELAS_DEMONSTRACAO.slice(1)"
            :key="parcela.id"
            :nome-empresa="parcela.nomeEmpresa"
            :numero="parcela.numero"
            :total="parcela.totalParcelas"
            :valor="parcela.valor"
            :vencimento="parcela.vencimento"
            :situacao="parcela.situacao"
            :dias-para-vencimento="parcela.diasParaVencimento"
            :vence-em-breve="parcela.venceEmBreve"
            :paga-em="parcela.pagaEm"
            :observacao="parcela.observacao"
            :possui-comprovante="parcela.comprovante !== null"
          />
          <LinhaParcela
            nome-empresa="Convites Papel"
            :numero="1"
            :total="1"
            :valor="600"
            vencimento="2026-08-10"
            situacao="Vencida"
            :dias-para-vencimento="-51"
            historico
          />
        </ul>
      </div>
      <h3 class="guia__subtitulo">
        Bloco de pagamentos (dashboard e visão geral)
      </h3>
      <p class="guia__texto">
        BlocoAlertasPagamentos: números editoriais (vencidas em erro; próximos 7 dias) com quantidade e soma, e a lista das parcelas mais urgentes em LinhaParcela compacta; cada linha leva ao Financeiro do evento. No dashboard mostra os anfitriões e "em N eventos"; na visão geral do evento, o link "Ver financeiro". Estados: carregando, erro com "Tentar novamente" e o estado calmo quando está tudo em dia.
      </p>
      <div class="guia__pilha-larga">
        <BlocoAlertasPagamentos
          :alertas="ALERTAS_DEMONSTRACAO"
          contexto="organizacao"
        />
        <BlocoAlertasPagamentos
          :alertas="ALERTAS_VAZIOS_DEMONSTRACAO"
          contexto="evento"
          :destino-financeiro="{ name: 'style-guide' }"
        />
        <BlocoAlertasPagamentos
          :alertas="null"
          carregando
        />
        <BlocoAlertasPagamentos
          :alertas="null"
          com-erro
        />
      </div>
    </section>

    <section
      id="regras"
      class="guia__secao"
      aria-labelledby="titulo-regras"
    >
      <h2
        id="titulo-regras"
        class="guia__titulo-secao"
      >
        Regras de uso
      </h2>
      <ol class="guia__regras">
        <li
          v-for="regra in regras"
          :key="regra"
        >
          {{ regra }}
        </li>
      </ol>
    </section>
  </LayoutPainel>
</template>

<style scoped>
.guia__lista-operacao {
  margin: 0;
  padding: 0;
}

.guia__operacao {
  max-width: var(--p-dimensao-largura-convite);
  overflow: hidden;
  border-radius: var(--p-raio-folha);
}

.guia__operacao :deep(.layout-publico) {
  min-height: 0;
}

.guia__lista-roteiro {
  margin: 0;
  padding: 0;
}

.guia__painel-regua {
  padding: var(--p-espaco-5) var(--p-espaco-4);
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.guia__lista-modelo {
  margin: 0;
  padding: 0;
}

.guia__lista-tarefas {
  margin: 0;
  padding: 0 var(--p-espaco-2);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
  background: var(--p-cor-superficie);
}

.guia__fornecedores {
  display: grid;
  gap: var(--p-espaco-4);
}

.guia__painel-fornecedores {
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.guia__lista-fornecedores {
  margin: 0;
  padding: 0;
}

.guia__grupo-fornecedores {
  margin: 0;
  padding: var(--p-espaco-4) var(--p-espaco-4) var(--p-espaco-2);
  font-size: var(--p-fonte-tamanho-corpo);
}

@media (min-width: 1024px) {
  .guia__fornecedores {
    grid-template-columns: var(--p-dimensao-largura-navegacao-evento) minmax(0, 1fr);
    align-items: start;
  }
}

.guia__lista-mesas {
  margin: 0;
  padding: 0;
  list-style: none;
}

.guia__barra-mesas :deep(.barra-acao-fixa) {
  position: static;
  margin: 0;
}

.guia__pilha-larga {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-4);
  max-width: var(--p-dimensao-largura-leitura);
}

.guia__titulo-exemplo {
  font-size: var(--p-fonte-tamanho-pagina);
}

.guia__grade-contagem {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
  gap: var(--p-espaco-4);
  margin-top: var(--p-espaco-4);
}

.guia__pilha {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-4);
  max-width: var(--p-dimensao-largura-autenticacao);
}

.guia__moldura.guia__moldura--baixa {
  height: auto;
}

.guia__moldura--baixa :deep(.indicador-abertura) {
  min-height: auto;
}

.guia__cronograma {
  max-width: var(--p-dimensao-largura-leitura);
  margin: 0;
  padding: 0 var(--p-espaco-2) 0 0;
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.guia__atalhos {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
}

.guia__opcoes-copia {
  max-width: var(--p-dimensao-largura-leitura);
  margin: 0;
  padding: 0;
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.guia__indice {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-2) var(--p-espaco-4);
  margin-bottom: var(--p-espaco-8);
  font-size: var(--p-fonte-tamanho-controle);
}

.guia__secao {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-4);
  padding: var(--p-espaco-8) 0;
  border-top: 1px solid var(--p-cor-borda);
  scroll-margin-top: var(--p-dimensao-altura-barra-celular);
}

.guia__titulo-secao {
  font-size: var(--p-fonte-tamanho-secao);
}

.guia__subtitulo {
  margin-top: var(--p-espaco-4);
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-corpo);
  font-weight: var(--p-fonte-peso-seminegrito);
}

.guia__texto {
  max-width: var(--p-dimensao-largura-leitura);
  color: var(--p-cor-texto-apoio);
}

.guia__codigo {
  font-family: inherit;
  font-size: var(--p-fonte-tamanho-rotulo);
  color: var(--p-cor-texto-apoio);
}

.guia__amostras-cor {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
  gap: var(--p-espaco-4);
  margin: 0;
  padding: 0;
  list-style: none;
}

.guia__amostra-cor {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
}

.guia__cor {
  height: 4rem;
  margin-bottom: var(--p-espaco-1);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-controle);
}

.guia__cor-nome {
  font-weight: var(--p-fonte-peso-medio);
}

.guia__tabela-rolagem {
  overflow-x: auto;
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.guia__tabela {
  width: 100%;
  font-size: var(--p-fonte-tamanho-controle);
  border-collapse: collapse;
}

.guia__tabela th,
.guia__tabela td {
  padding: var(--p-espaco-3) var(--p-espaco-4);
  text-align: left;
  border-bottom: 1px solid var(--p-cor-borda);
}

.guia__tabela th {
  font-weight: var(--p-fonte-peso-seminegrito);
}

.guia__tabela tbody tr:last-child td {
  border-bottom: 0;
}

.guia__par {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 2rem;
  font-weight: var(--p-fonte-peso-seminegrito);
  border: 2px solid transparent;
  border-radius: var(--p-raio-tag);
}

.guia__tipos {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-5);
  margin: 0;
}

.guia__tipo {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
}

.guia__tipo-nome {
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
}

.guia__tipo-exemplo {
  margin: 0;
  line-height: var(--p-fonte-entrelinha-titulo);
  overflow-wrap: anywhere;
}

.guia__tipo-exemplo--display {
  font-family: var(--p-fonte-display);
  font-variant-numeric: lining-nums;
  font-weight: var(--p-fonte-peso-leve);
  line-height: var(--p-fonte-entrelinha-display);
  letter-spacing: var(--p-fonte-espacamento-letras-display);
}

.guia__tipo-exemplo--subtitulo {
  font-family: var(--p-fonte-display);
  font-weight: var(--p-fonte-peso-medio);
}

.guia__tipo-exemplo--tagline {
  font-family: var(--p-fonte-display);
  letter-spacing: var(--p-fonte-espacamento-letras-tagline);
  text-transform: uppercase;
  color: var(--p-cor-acento-texto);
}

.guia__tipo-exemplo--rotulo {
  font-family: var(--p-fonte-display);
  font-weight: var(--p-fonte-peso-medio);
  letter-spacing: var(--p-fonte-espacamento-letras-rotulo);
  text-transform: uppercase;
  color: var(--p-cor-texto-apoio);
}

.guia__tipo-exemplo--serif {
  font-family: var(--p-fonte-serif);
  line-height: 1.45;
}

.guia__tipo-exemplo--legenda {
  font-family: var(--p-fonte-serif);
  font-style: italic;
  color: var(--p-cor-texto-apoio);
}

.guia__logo-principal {
  --marca-tamanho: var(--p-fonte-tamanho-pagina);
}

.guia__exemplo-primitivas {
  margin-top: var(--p-ritmo-cartao);
  padding: var(--p-ritmo-cartao);
  background: var(--p-cor-fundo);
  border: 1px dashed var(--p-cor-borda-controle);
  border-radius: var(--p-raio-painel);
}

.guia__exemplo-titulo {
  font-size: var(--p-fonte-tamanho-pagina);
  font-weight: var(--p-fonte-peso-leve);
}

.guia__exemplo-numero {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-pagina);
  font-weight: var(--p-fonte-peso-leve);
  line-height: 1;
}

.guia__icones {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr));
  gap: var(--p-espaco-4);
  margin: 0;
  padding: 0;
  list-style: none;
}

.guia__icone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--p-espaco-2);
  font-size: 1.25rem;
}

.guia__icone .guia__codigo {
  font-size: var(--p-fonte-tamanho-rotulo);
}

.guia__rotulo-estado {
  font-size: var(--p-fonte-tamanho-rotulo);
  font-weight: var(--p-fonte-peso-seminegrito);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--p-cor-texto-apoio);
}

.guia__workspace {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-4);
}

.guia__workspace-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--p-espaco-5);
  width: var(--p-dimensao-largura-rail);
  padding: var(--p-espaco-4) 0;
  background: var(--p-cor-navegacao);
  border-radius: var(--p-raio-painel);
}

.guia__workspace-navegacao {
  width: var(--p-dimensao-largura-navegacao-evento);
  padding: var(--p-espaco-6) var(--p-espaco-3);
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.guia__workspace-navegacao--anfitriao {
  background: var(--p-cor-fundo-anfitriao);
  border-color: var(--p-cor-borda-publica);
}

.guia__contextos {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: var(--p-espaco-4);
}

.guia__contexto {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-3);
  padding: var(--p-espaco-5);
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.guia__contexto--anfitriao {
  background: var(--p-cor-assistente);
}

.guia__contexto-linha {
  display: flex;
  justify-content: space-between;
  padding-top: var(--p-espaco-2);
  font-size: var(--p-fonte-tamanho-apoio);
  border-top: 1px solid var(--p-cor-divisoria);
}

.guia__contexto-frase {
  font-family: var(--p-fonte-display);
  font-variant-numeric: lining-nums;
  font-size: 1.625rem;
  font-weight: var(--p-fonte-peso-medio);
  line-height: 1.1;
}

.guia__tipo-exemplo--interface {
  font-family: var(--p-fonte-interface);
}

.guia__espacos {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.guia__espacos li {
  display: grid;
  grid-template-columns: 8rem auto 1fr;
  align-items: center;
  gap: var(--p-espaco-3);
  font-size: var(--p-fonte-tamanho-controle);
}

.guia__barra {
  height: 0.75rem;
  background: var(--p-primary-300);
  border-radius: var(--p-raio-tag);
}

.guia__caixas {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
  gap: var(--p-espaco-4);
}

.guia__caixa {
  display: flex;
  align-items: flex-end;
  height: 6rem;
  padding: var(--p-espaco-3);
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
}

.guia__caixa--sombra {
  border-color: transparent;
  border-radius: var(--p-raio-painel);
}

.guia__rotulos {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.guia__rotulos li {
  padding: var(--p-espaco-1) var(--p-espaco-3);
  font-size: var(--p-fonte-tamanho-controle);
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-controle);
}

.guia__linha {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-espaco-3);
}

.guia__formulario {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-6);
  max-width: 48rem;
  padding: var(--p-espaco-6);
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.guia__campos {
  display: grid;
  gap: var(--p-espaco-5);
}

.guia__acoes-formulario {
  display: flex;
  flex-direction: column-reverse;
  gap: var(--p-espaco-2);
}

.guia__acoes-formulario :deep(.p-button) {
  min-height: var(--p-dimensao-alvo-toque);
}

.guia__grade-estados {
  display: grid;
  gap: var(--p-espaco-4);
}

.guia__painel {
  padding: var(--p-espaco-4);
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.guia__moldura {
  width: 100%;
  max-width: 24rem;
  height: 40rem;
  overflow-y: auto;
  border: 8px solid var(--p-cor-texto);
  border-radius: 2rem;
}

.guia__moldura :deep(.layout-publico) {
  min-height: 100%;
}

.guia__publico-nomes {
  font-family: var(--p-fonte-display);
  font-variant-numeric: lining-nums;
  font-size: var(--p-fonte-tamanho-pagina);
  font-weight: var(--p-fonte-peso-medio);
  line-height: var(--p-fonte-entrelinha-titulo);
  text-align: center;
}

.guia__publico-data {
  color: var(--p-cor-texto-apoio);
  text-align: center;
}

.guia__regras {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-3);
  max-width: var(--p-dimensao-largura-leitura);
  margin: 0;
  padding-left: var(--p-espaco-5);
}

@media (min-width: 640px) {
  .guia__campos {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .guia__campo-largo {
    grid-column: 1 / -1;
  }

  .guia__acoes-formulario {
    flex-direction: row;
    justify-content: flex-end;
  }

  .guia__grade-estados {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
