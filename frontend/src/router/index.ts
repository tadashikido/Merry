import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

import PainelInicioView from '@/views/painel/PainelInicioView.vue'
import { NOME_PRODUTO } from '@/textos/rotulos'
import { TEXTOS_EVENTOS } from '@/textos/eventos'
import { TEXTOS_CHECKLIST, TEXTOS_MODELOS_CHECKLIST } from '@/textos/checklist'
import { TEXTOS_CONFIRMACOES } from '@/textos/confirmacoes'
import { TEXTOS_CONVIDADOS } from '@/textos/convidados'
import { TEXTOS_CRONOGRAMA } from '@/textos/cronograma'
import { TEXTOS_DADOS_SENSIVEIS } from '@/textos/dadosSensiveis'
import { TEXTOS_FINANCEIRO } from '@/textos/financeiro'
import { TEXTOS_FORNECEDORES } from '@/textos/fornecedores'
import { TEXTOS_FORNECEDORES_EVENTO } from '@/textos/fornecedoresEvento'
import { TEXTOS_IMPORTACAO } from '@/textos/importacaoConvidados'
import { TEXTOS_MESAS } from '@/textos/mesas'
import { TEXTOS_MODELOS_CRONOGRAMA } from '@/textos/modelosCronograma'
import { TEXTOS_TAREFAS } from '@/textos/tarefas'
import '@/router/metaRota'

export const TITULO_APLICACAO = NOME_PRODUTO

const rotasDesenvolvimento: RouteRecordRaw[] = import.meta.env.DEV
  ? [
      {
        path: '/style-guide',
        name: 'style-guide',
        component: () => import('@/views/desenvolvimento/StyleGuideView.vue'),
        meta: { titulo: `Style guide · ${TITULO_APLICACAO}` },
      },
    ]
  : []

export const PREFIXO_LEGADO_EVENTOS = '/casamentos'
export const CAMINHO_LEGADO_ACESSO_ANFITRIAO = '/acesso-casal'

export function caminhoEventoDoLegado(caminho: string): string {
  return `/eventos${caminho.slice(PREFIXO_LEGADO_EVENTOS.length)}`
}

export function criarRotas(rotasExtras: RouteRecordRaw[] = []): RouteRecordRaw[] {
  return [
    {
      path: '/',
      name: 'inicio',
      component: PainelInicioView,
      meta: { titulo: TITULO_APLICACAO, requerAutenticacao: true },
    },
    {
      path: '/eventos',
      meta: { requerAutenticacao: true },
      children: [
        {
          path: '',
          name: 'eventos',
          component: () => import('@/views/eventos/EventosView.vue'),
          meta: { trilha: { rotulo: TEXTOS_EVENTOS.listaTitulo }, titulo: `Eventos · ${TITULO_APLICACAO}`, somenteAssessoria: true },
        },
        {
          path: 'novo',
          name: 'evento-novo',
          component: () => import('@/views/eventos/EventoFormularioView.vue'),
          meta: { trilha: { pai: 'eventos' }, titulo: `Novo evento · ${TITULO_APLICACAO}`, somenteAssessoria: true },
        },
        {
          path: 'novo/a-partir-de-outro',
          name: 'evento-duplicar',
          component: () => import('@/views/eventos/DuplicarEventoView.vue'),
          props: (rota) => ({ origem: typeof rota.query.origem === 'string' ? rota.query.origem : undefined }),
          meta: { trilha: { pai: 'eventos' }, titulo: `Duplicar evento · ${TITULO_APLICACAO}`, somenteAssessoria: true },
        },
        {
          path: ':id([0-9a-fA-F-]{36})',
          name: 'evento',
          component: () => import('@/views/eventos/EventoView.vue'),
          props: true,
          meta: { trilha: { pai: 'eventos', evento: true }, titulo: `Evento · ${TITULO_APLICACAO}` },
        },
        {
          path: ':id([0-9a-fA-F-]{36})/editar',
          name: 'evento-editar',
          component: () => import('@/views/eventos/EventoFormularioView.vue'),
          props: true,
          meta: { trilha: { pai: 'evento' }, titulo: `Editar evento · ${TITULO_APLICACAO}`, somenteAssessoria: true },
        },
        {
          path: ':id([0-9a-fA-F-]{36})/tarefas',
          name: 'evento-tarefas',
          component: () => import('@/views/tarefas/TarefasView.vue'),
          props: true,
          meta: { trilha: { rotulo: TEXTOS_TAREFAS.titulo, pai: 'evento' }, titulo: `Tarefas · ${TITULO_APLICACAO}` },
        },
        {
          path: ':id([0-9a-fA-F-]{36})/tarefas/nova',
          name: 'tarefa-nova',
          component: () => import('@/views/tarefas/TarefaFormularioView.vue'),
          props: true,
          meta: { trilha: { pai: 'evento-tarefas' }, titulo: `Nova tarefa · ${TITULO_APLICACAO}`, somenteAssessoria: true },
        },
        {
          path: ':id([0-9a-fA-F-]{36})/tarefas/:tarefaId([0-9a-fA-F-]{36})/editar',
          name: 'tarefa-editar',
          component: () => import('@/views/tarefas/TarefaFormularioView.vue'),
          props: true,
          meta: { trilha: { pai: 'evento-tarefas' }, titulo: `Editar tarefa · ${TITULO_APLICACAO}`, somenteAssessoria: true },
        },
        {
          path: ':id([0-9a-fA-F-]{36})/checklist',
          name: 'evento-checklist',
          component: () => import('@/views/checklist/ChecklistView.vue'),
          props: true,
          meta: { trilha: { rotulo: TEXTOS_CHECKLIST.titulo, pai: 'evento' }, titulo: `Checklist · ${TITULO_APLICACAO}`, somenteAssessoria: true },
        },
        {
          path: ':id([0-9a-fA-F-]{36})/cronograma',
          name: 'evento-cronograma',
          component: () => import('@/views/cronograma/CronogramaView.vue'),
          props: true,
          meta: { trilha: { rotulo: TEXTOS_CRONOGRAMA.titulo, pai: 'evento' }, titulo: `Cronograma · ${TITULO_APLICACAO}` },
        },
        {
          path: ':id([0-9a-fA-F-]{36})/grande-dia',
          name: 'evento-grande-dia',
          component: () => import('@/views/grandeDia/GrandeDiaView.vue'),
          props: true,
          meta: { titulo: `Grande Dia · ${TITULO_APLICACAO}` },
        },
        {
          path: ':id([0-9a-fA-F-]{36})/fornecedores',
          name: 'evento-fornecedores',
          component: () => import('@/views/fornecedoresEvento/FornecedoresEventoView.vue'),
          props: true,
          meta: { trilha: { rotulo: TEXTOS_FORNECEDORES_EVENTO.titulo, pai: 'evento' }, titulo: `Fornecedores · ${TITULO_APLICACAO}` },
        },
        {
          path: ':id([0-9a-fA-F-]{36})/financeiro',
          name: 'evento-financeiro',
          component: () => import('@/views/financeiro/FinanceiroEventoView.vue'),
          props: true,
          meta: { trilha: { rotulo: TEXTOS_FINANCEIRO.titulo, pai: 'evento' }, titulo: `Financeiro · ${TITULO_APLICACAO}` },
        },
        {
          path: ':id([0-9a-fA-F-]{36})/fornecedores/novo',
          name: 'fornecedor-evento-novo',
          component: () => import('@/views/fornecedoresEvento/FornecedorEventoFormularioView.vue'),
          props: true,
          meta: { trilha: { pai: 'evento-fornecedores' }, titulo: `Adicionar fornecedor · ${TITULO_APLICACAO}`, somenteAssessoria: true },
        },
        {
          path: ':id([0-9a-fA-F-]{36})/fornecedores/:vinculoId([0-9a-fA-F-]{36})/editar',
          name: 'fornecedor-evento-editar',
          component: () => import('@/views/fornecedoresEvento/FornecedorEventoFormularioView.vue'),
          props: true,
          meta: { trilha: { pai: 'evento-fornecedores' }, titulo: `Editar fornecedor do evento · ${TITULO_APLICACAO}`, somenteAssessoria: true },
        },
        {
          path: ':id([0-9a-fA-F-]{36})/convidados',
          name: 'evento-convidados',
          component: () => import('@/views/convidados/ConvidadosView.vue'),
          props: true,
          meta: { trilha: { rotulo: TEXTOS_CONVIDADOS.listaTitulo, pai: 'evento' }, titulo: `Convidados · ${TITULO_APLICACAO}` },
        },
        {
          path: ':id([0-9a-fA-F-]{36})/restricoes-alimentares',
          name: 'restricoes-alimentares',
          component: () => import('@/views/restricoes/RestricoesAlimentaresView.vue'),
          props: true,
          meta: { trilha: { rotulo: TEXTOS_DADOS_SENSIVEIS.tituloPainel, pai: 'evento-convidados' }, titulo: `Restrições alimentares · ${TITULO_APLICACAO}`, somenteAssessoria: true },
        },
        {
          path: ':id([0-9a-fA-F-]{36})/confirmacoes',
          name: 'painel-confirmacoes',
          component: () => import('@/views/confirmacoes/PainelConfirmacoesView.vue'),
          props: true,
          meta: { trilha: { rotulo: TEXTOS_CONFIRMACOES.titulo, pai: 'evento' }, titulo: `Confirmações · ${TITULO_APLICACAO}` },
        },
        {
          path: ':id([0-9a-fA-F-]{36})/confirmacoes/buffet',
          name: 'impressao-buffet',
          component: () => import('@/views/confirmacoes/ImpressaoBuffetView.vue'),
          props: true,
          meta: { titulo: `Ficha para o buffet · ${TITULO_APLICACAO}`, somenteAssessoria: true },
        },
        {
          path: ':id([0-9a-fA-F-]{36})/mesas',
          name: 'evento-mesas',
          component: () => import('@/views/mesas/MesasView.vue'),
          props: true,
          meta: { trilha: { rotulo: TEXTOS_MESAS.titulo, pai: 'evento' }, titulo: `Mesas · ${TITULO_APLICACAO}` },
        },
        {
          path: ':id([0-9a-fA-F-]{36})/mesas/impressao',
          name: 'impressao-mesas',
          component: () => import('@/views/mesas/ImpressaoMesasView.vue'),
          props: true,
          meta: { titulo: `Mapa de mesas · ${TITULO_APLICACAO}` },
        },
        {
          path: ':id([0-9a-fA-F-]{36})/convidados/novo',
          name: 'convite-novo',
          component: () => import('@/views/convidados/ConviteFormularioView.vue'),
          props: true,
          meta: { trilha: { pai: 'evento-convidados' }, titulo: `Novo convite · ${TITULO_APLICACAO}` },
        },
        {
          path: ':id([0-9a-fA-F-]{36})/convidados/importar',
          name: 'convidados-importar',
          component: () => import('@/views/convidados/ImportarConvidadosView.vue'),
          props: true,
          meta: { trilha: { rotulo: TEXTOS_IMPORTACAO.trilha, pai: 'evento-convidados' }, titulo: `Importar convidados · ${TITULO_APLICACAO}` },
        },
        {
          path: ':id([0-9a-fA-F-]{36})/convidados/:conviteId([0-9a-fA-F-]{36})/editar',
          name: 'convite-editar',
          component: () => import('@/views/convidados/ConviteFormularioView.vue'),
          props: true,
          meta: { trilha: { pai: 'evento-convidados' }, titulo: `Editar convite · ${TITULO_APLICACAO}` },
        },
      ],
    },
    {
      path: '/modelos-checklist',
      meta: { requerAutenticacao: true },
      children: [
        {
          path: '',
          name: 'modelos-checklist',
          component: () => import('@/views/modelosChecklist/ModelosChecklistView.vue'),
          meta: { trilha: { rotulo: TEXTOS_MODELOS_CHECKLIST.titulo }, titulo: `Modelos de checklist · ${TITULO_APLICACAO}`, somenteAssessoria: true },
        },
        {
          path: 'novo',
          name: 'modelo-checklist-novo',
          component: () => import('@/views/modelosChecklist/ModeloChecklistFormularioView.vue'),
          meta: { trilha: { pai: 'modelos-checklist' }, titulo: `Novo modelo · ${TITULO_APLICACAO}`, somenteAssessoria: true },
        },
        {
          path: ':modeloId([0-9a-fA-F-]{36})',
          name: 'modelo-checklist',
          component: () => import('@/views/modelosChecklist/ModeloChecklistView.vue'),
          props: true,
          meta: { trilha: { pai: 'modelos-checklist' }, titulo: `Modelo de checklist · ${TITULO_APLICACAO}`, somenteAssessoria: true },
        },
        {
          path: ':modeloId([0-9a-fA-F-]{36})/editar',
          name: 'modelo-checklist-editar',
          component: () => import('@/views/modelosChecklist/ModeloChecklistFormularioView.vue'),
          props: true,
          meta: { trilha: { pai: 'modelos-checklist' }, titulo: `Editar modelo · ${TITULO_APLICACAO}`, somenteAssessoria: true },
        },
        {
          path: ':modeloId([0-9a-fA-F-]{36})/itens/novo',
          name: 'item-modelo-novo',
          component: () => import('@/views/modelosChecklist/ItemModeloChecklistFormularioView.vue'),
          props: true,
          meta: { trilha: { pai: 'modelo-checklist' }, titulo: `Novo item · ${TITULO_APLICACAO}`, somenteAssessoria: true },
        },
        {
          path: ':modeloId([0-9a-fA-F-]{36})/itens/:itemId([0-9a-fA-F-]{36})/editar',
          name: 'item-modelo-editar',
          component: () => import('@/views/modelosChecklist/ItemModeloChecklistFormularioView.vue'),
          props: true,
          meta: { trilha: { pai: 'modelo-checklist' }, titulo: `Editar item · ${TITULO_APLICACAO}`, somenteAssessoria: true },
        },
      ],
    },
    {
      path: '/modelos-cronograma',
      meta: { requerAutenticacao: true },
      children: [
        {
          path: '',
          name: 'modelos-cronograma',
          component: () => import('@/views/modelosCronograma/ModelosCronogramaView.vue'),
          meta: { trilha: { rotulo: TEXTOS_MODELOS_CRONOGRAMA.titulo }, titulo: `Modelos de cronograma · ${TITULO_APLICACAO}`, somenteAssessoria: true },
        },
        {
          path: 'novo',
          name: 'modelo-cronograma-novo',
          component: () => import('@/views/modelosCronograma/ModeloCronogramaFormularioView.vue'),
          meta: { trilha: { pai: 'modelos-cronograma' }, titulo: `Novo modelo de cronograma · ${TITULO_APLICACAO}`, somenteAssessoria: true },
        },
        {
          path: ':modeloId([0-9a-fA-F-]{36})',
          name: 'modelo-cronograma',
          component: () => import('@/views/modelosCronograma/ModeloCronogramaView.vue'),
          props: true,
          meta: { trilha: { pai: 'modelos-cronograma' }, titulo: `Modelo de cronograma · ${TITULO_APLICACAO}`, somenteAssessoria: true },
        },
        {
          path: ':modeloId([0-9a-fA-F-]{36})/editar',
          name: 'modelo-cronograma-editar',
          component: () => import('@/views/modelosCronograma/ModeloCronogramaFormularioView.vue'),
          props: true,
          meta: { trilha: { pai: 'modelos-cronograma' }, titulo: `Editar modelo de cronograma · ${TITULO_APLICACAO}`, somenteAssessoria: true },
        },
        {
          path: ':modeloId([0-9a-fA-F-]{36})/itens/novo',
          name: 'item-modelo-cronograma-novo',
          component: () => import('@/views/modelosCronograma/ItemModeloCronogramaFormularioView.vue'),
          props: true,
          meta: { trilha: { pai: 'modelo-cronograma' }, titulo: `Novo item · ${TITULO_APLICACAO}`, somenteAssessoria: true },
        },
        {
          path: ':modeloId([0-9a-fA-F-]{36})/itens/:itemId([0-9a-fA-F-]{36})/editar',
          name: 'item-modelo-cronograma-editar',
          component: () => import('@/views/modelosCronograma/ItemModeloCronogramaFormularioView.vue'),
          props: true,
          meta: { trilha: { pai: 'modelo-cronograma' }, titulo: `Editar item · ${TITULO_APLICACAO}`, somenteAssessoria: true },
        },
      ],
    },
    {
      path: '/fornecedores',
      meta: { requerAutenticacao: true },
      children: [
        {
          path: '',
          name: 'fornecedores',
          component: () => import('@/views/fornecedores/FornecedoresView.vue'),
          meta: { trilha: { rotulo: TEXTOS_FORNECEDORES.titulo }, titulo: `Fornecedores · ${TITULO_APLICACAO}`, somenteAssessoria: true },
        },
        {
          path: 'novo',
          name: 'fornecedor-novo',
          component: () => import('@/views/fornecedores/FornecedorFormularioView.vue'),
          meta: { trilha: { pai: 'fornecedores' }, titulo: `Novo fornecedor · ${TITULO_APLICACAO}`, somenteAssessoria: true },
        },
        {
          path: ':fornecedorId([0-9a-fA-F-]{36})',
          name: 'fornecedor',
          component: () => import('@/views/fornecedores/FornecedorView.vue'),
          props: true,
          meta: { trilha: { pai: 'fornecedores' }, titulo: `Fornecedor · ${TITULO_APLICACAO}`, somenteAssessoria: true },
        },
        {
          path: ':fornecedorId([0-9a-fA-F-]{36})/editar',
          name: 'fornecedor-editar',
          component: () => import('@/views/fornecedores/FornecedorFormularioView.vue'),
          props: true,
          meta: { trilha: { pai: 'fornecedores' }, titulo: `Editar fornecedor · ${TITULO_APLICACAO}`, somenteAssessoria: true },
        },
      ],
    },
    {
      path: '/entrar',
      name: 'entrar',
      component: () => import('@/views/autenticacao/EntrarView.vue'),
      meta: { titulo: `Entrar · ${TITULO_APLICACAO}`, somenteVisitante: true },
    },
    {
      path: '/cadastro',
      name: 'cadastro',
      component: () => import('@/views/autenticacao/CadastroView.vue'),
      meta: { titulo: `Criar conta · ${TITULO_APLICACAO}`, somenteVisitante: true },
    },
    {
      path: '/esqueci-senha',
      name: 'esqueci-senha',
      component: () => import('@/views/autenticacao/EsqueciSenhaView.vue'),
      meta: { titulo: `Recuperar acesso · ${TITULO_APLICACAO}`, somenteVisitante: true },
    },
    {
      path: '/rsvp/:token',
      name: 'rsvp',
      component: () => import('@/views/rsvp/RsvpView.vue'),
      props: true,
      meta: { titulo: `Confirmação de presença · ${TITULO_APLICACAO}`, semIndexacao: true },
    },
    {
      path: '/cronograma/:token',
      name: 'cronograma-publico',
      component: () => import('@/views/cronogramaPublico/CronogramaPublicoView.vue'),
      props: true,
      meta: { titulo: `Cronograma do dia · ${TITULO_APLICACAO}`, semIndexacao: true },
    },
    {
      path: '/acesso-anfitriao',
      name: 'aceite-acesso-anfitriao',
      component: () => import('@/views/autenticacao/AceiteAcessoAnfitriaoView.vue'),
      meta: { titulo: `Acesso ao evento · ${TITULO_APLICACAO}`, semIndexacao: true },
    },
    {
      path: '/redefinir-senha',
      name: 'redefinir-senha',
      component: () => import('@/views/autenticacao/RedefinirSenhaView.vue'),
      meta: { titulo: `Nova senha · ${TITULO_APLICACAO}` },
    },
    {
      path: `${PREFIXO_LEGADO_EVENTOS}/:caminho(.*)*`,
      redirect: (rota) => ({ path: caminhoEventoDoLegado(rota.path), query: rota.query, hash: rota.hash }),
    },
    {
      path: CAMINHO_LEGADO_ACESSO_ANFITRIAO,
      redirect: (rota) => ({ name: 'aceite-acesso-anfitriao', query: rota.query, hash: rota.hash }),
    },
    ...rotasExtras,
    {
      path: '/:caminho(.*)*',
      name: 'nao-encontrado',
      component: () => import('@/views/NaoEncontradoView.vue'),
      meta: { titulo: `Página não encontrada · ${TITULO_APLICACAO}` },
    },
  ]
}

export const rotas = criarRotas(rotasDesenvolvimento)

const roteador = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: rotas,
})

export const ID_META_ROBOTS = 'meta-robots-sem-indexacao'

export function aplicarIndexacao(semIndexacao: boolean, documento: Document = document): void {
  const existente = documento.getElementById(ID_META_ROBOTS)
  if (!semIndexacao) {
    existente?.remove()
    return
  }
  if (existente) {
    return
  }
  const meta = documento.createElement('meta')
  meta.id = ID_META_ROBOTS
  meta.name = 'robots'
  meta.content = 'noindex, nofollow'
  documento.head.appendChild(meta)
}

roteador.afterEach((destino) => {
  const titulo = destino.meta.titulo
  document.title = typeof titulo === 'string' ? titulo : TITULO_APLICACAO
  aplicarIndexacao(destino.meta.semIndexacao === true)
})

export default roteador
