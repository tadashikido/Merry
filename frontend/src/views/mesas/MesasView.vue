<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'

import LayoutPainelUsuario from '@/layouts/LayoutPainelUsuario.vue'
import BadgeStatus from '@/componentes/base/BadgeStatus.vue'
import BarraAcaoFixa from '@/componentes/base/BarraAcaoFixa.vue'
import CabecalhoPagina from '@/componentes/base/CabecalhoPagina.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import EstadoVazio from '@/componentes/base/EstadoVazio.vue'
import LinhaPessoaMesa from '@/componentes/base/LinhaPessoaMesa.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import MenuAcoes from '@/componentes/base/MenuAcoes.vue'
import OcupacaoMesa from '@/componentes/base/OcupacaoMesa.vue'
import ResumoContagem from '@/componentes/base/ResumoContagem.vue'
import type { ItemContagem, ItemMenuAcoes } from '@/componentes/base/tipos'
import DialogoMesa from '@/componentes/mesas/DialogoMesa.vue'
import DialogoSentarEm from '@/componentes/mesas/DialogoSentarEm.vue'
import { useConfirmarExclusao } from '@/composables/useConfirmarExclusao'
import { useDesfazerExclusao } from '@/composables/useDesfazerExclusao'
import { useNotificacao } from '@/composables/useNotificacao'
import { useTelaPequena } from '@/composables/useTelaPequena'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import { useCasamentosStore } from '@/stores/casamentos'
import { useMesasStore } from '@/stores/mesas'
import { TEXTOS_MESAS } from '@/textos/mesas'
import type { FalhaCasamento } from '@/stores/casamentos'
import type { MesaDto, PessoaMesaDto } from '@/tipos/mesas'
import { baixarTexto } from '@/utilitarios/arquivo'
import { gerarCsvMesas, nomeArquivoMesas } from '@/utilitarios/exportacaoMesas'
import { formatarDataCalendarioComDiaSemana, formatarDataCalendarioCurta, formatarNomesCasal } from '@/utilitarios/formatacao'
import {
  agruparPorConvite,
  conviteDeUmaPessoa,
  convitesDivididos,
  descreverAviso,
  descreverDivisao,
  FILTRO_TODOS,
  filtrarPessoas,
  filtrosAtivos,
  mesasComPessoas,
  opcoesConvite,
  opcoesGrupo,
  proximoNumeroMesa,
  rotuloMesa,
  rotuloMesaAviso,
} from '@/utilitarios/mesas'

type Painel = 'semMesa' | 'mesas'

const props = defineProps<{ id: string }>()

const autenticacao = useAutenticacaoStore()
const casamentos = useCasamentosStore()
const store = useMesasStore()
const roteador = useRouter()
const notificacao = useNotificacao()
const { confirmarExclusao } = useConfirmarExclusao()
const { desfazerExclusao } = useDesfazerExclusao()
const telaPequena = useTelaPequena()

const busca = ref('')
const grupo = ref<string>(FILTRO_TODOS)
const convite = ref<string>(FILTRO_TODOS)
const painelAtivo = ref<Painel>('semMesa')
const selecionados = ref<string[]>([])
const divisaoAberta = ref<string | null>(null)
const anuncio = ref('')

const dialogoMesaVisivel = ref(false)
const mesaEmEdicao = ref<MesaDto | null>(null)
const dialogoSentarVisivel = ref(false)
const sentando = ref(false)
const mensagemSentar = ref<string | null>(null)
const retirando = ref(false)
const dispensando = ref(false)

const casamento = computed(() => (casamentos.atual?.id === props.id ? casamentos.atual : null))
const mapa = computed(() => (store.casamentoId === props.id ? store.mapa : null))
const falha = computed(() => (store.casamentoId === props.id ? store.falha : null))
const arquivado = computed(() => mapa.value?.casamentoArquivado ?? casamento.value?.arquivado ?? false)
const podeEditar = computed(() => mapa.value !== null && !arquivado.value)

const nomes = computed(() =>
  casamento.value ? formatarNomesCasal(casamento.value.nomePrimeiraPessoa, casamento.value.nomeSegundaPessoa) : '',
)
const descricao = computed(() =>
  casamento.value ? `${nomes.value}, ${formatarDataCalendarioComDiaSemana(casamento.value.data)}` : undefined,
)

const filtros = computed(() => ({ busca: busca.value, grupo: grupo.value, convite: convite.value }))
const pessoas = computed(() => mapa.value?.pessoas ?? [])
const mesas = computed(() => mapa.value?.mesas ?? [])
const visiveis = computed(() => filtrarPessoas(pessoas.value, filtros.value))
const comFiltro = computed(() => filtrosAtivos(filtros.value))
const semMesaVisiveis = computed(() => visiveis.value.filter((pessoa) => pessoa.mesaId === null))
const gruposSemMesa = computed(() => agruparPorConvite(semMesaVisiveis.value))
const mesasVisiveis = computed(() => mesasComPessoas(mesas.value, pessoas.value, visiveis.value))
const divididos = computed(() => convitesDivididos(pessoas.value))
const opcoesDeGrupo = computed(() => opcoesGrupo(pessoas.value))
const opcoesDeConvite = computed(() => opcoesConvite(pessoas.value))

const estavaNaMesa = computed(() => {
  const mapaAvisos = new Map<string, string>()
  for (const aviso of mapa.value?.avisosSaida ?? []) {
    const rotulo = rotuloMesaAviso(aviso)
    if (rotulo) {
      mapaAvisos.set(aviso.convidadoId, TEXTOS_MESAS.estavaNaMesa(rotulo))
    }
  }
  return mapaAvisos
})

const pessoasSelecionadas = computed<PessoaMesaDto[]>(() => {
  const conjunto = new Set(selecionados.value)
  return pessoas.value.filter((pessoa) => conjunto.has(pessoa.id))
})
const algumaSentada = computed(() => pessoasSelecionadas.value.some((pessoa) => pessoa.mesaId !== null))

const itensResumo = computed<ItemContagem[]>(() => {
  const totais = mapa.value?.totais
  if (!totais) {
    return []
  }
  return [
    { chave: 'sentados', valor: totais.acomodados, rotulo: TEXTOS_MESAS.sentados(totais.acomodados) },
    { chave: 'livres', valor: totais.lugaresLivres, rotulo: TEXTOS_MESAS.livres(totais.lugaresLivres) },
    { chave: 'sem-mesa', valor: totais.semMesa, rotulo: TEXTOS_MESAS.semMesaTotal, destaque: totais.semMesa > 0 },
    { chave: 'mesas', valor: totais.mesas, rotulo: TEXTOS_MESAS.mesasTotal(totais.mesas) },
  ]
})

const opcoesPainel = computed(() => [
  { valor: 'semMesa', rotulo: TEXTOS_MESAS.abaSemMesa(mapa.value?.totais.semMesa ?? 0) },
  { valor: 'mesas', rotulo: TEXTOS_MESAS.abaMesas(mesas.value.length) },
])

const itensMenuCabecalho: ItemMenuAcoes[] = [
  { chave: 'imprimir', rotulo: TEXTOS_MESAS.imprimir, icone: 'ie ie-imprimir' },
  { chave: 'csv', rotulo: TEXTOS_MESAS.baixarCsv, icone: 'ie ie-exportar' },
]

const itensMenuMesa: ItemMenuAcoes[] = [
  { chave: 'editar', rotulo: TEXTOS_MESAS.editarMesa, icone: 'ie ie-editar' },
  { chave: 'excluir', rotulo: TEXTOS_MESAS.excluirMesa, icone: 'ie ie-excluir', perigoso: true },
]

const mensagemErro = computed(() => {
  if (!falha.value || falha.value.tipo === 'naoEncontrado') {
    return null
  }
  return falha.value.tipo === 'semPermissao' ? TEXTOS_MESAS.semAcesso : TEXTOS_MESAS.erroCarregar
})

watch(
  () => props.id,
  (id) => {
    busca.value = ''
    grupo.value = FILTRO_TODOS
    convite.value = FILTRO_TODOS
    selecionados.value = []
    void casamentos.obter(id)
    void store.carregar(id)
  },
  { immediate: true },
)

watch(
  nomes,
  (valor) => {
    if (valor) {
      document.title = TEXTOS_MESAS.tituloDocumento(valor)
    }
  },
  { immediate: true },
)

watch(pessoas, (atuais) => {
  const existentes = new Set(atuais.map((pessoa) => pessoa.id))
  const mantidos = selecionados.value.filter((id) => existentes.has(id))
  if (mantidos.length !== selecionados.value.length) {
    selecionados.value = mantidos
  }
})

function anunciar(texto: string) {
  anuncio.value = ''
  anuncio.value = texto
}

function estaSelecionada(pessoaId: string): boolean {
  return selecionados.value.includes(pessoaId)
}

function alternar(pessoaId: string, valor: boolean) {
  if (valor && !estaSelecionada(pessoaId)) {
    selecionados.value = [...selecionados.value, pessoaId]
  } else if (!valor) {
    selecionados.value = selecionados.value.filter((id) => id !== pessoaId)
  }
}

function selecionarVarias(ids: string[]) {
  selecionados.value = [...new Set([...selecionados.value, ...ids])]
}

function selecionarVisiveisSemMesa() {
  selecionarVarias(semMesaVisiveis.value.map((pessoa) => pessoa.id))
}

function limparSelecao() {
  selecionados.value = []
}

function restantesDoConvite(pessoasDoGrupo: PessoaMesaDto[]): number {
  return pessoasDoGrupo.filter((pessoa) => !estaSelecionada(pessoa.id)).length
}

function grupoParcial(pessoasDoGrupo: PessoaMesaDto[]): boolean {
  const restantes = restantesDoConvite(pessoasDoGrupo)
  return restantes > 0 && restantes < pessoasDoGrupo.length
}

function apoioSemMesa(pessoa: PessoaMesaDto): string {
  return estavaNaMesa.value.get(pessoa.id) ?? pessoa.grupo ?? TEXTOS_MESAS.semGrupo
}

function alternarDivisao(conviteId: string) {
  divisaoAberta.value = divisaoAberta.value === conviteId ? null : conviteId
}

function limparFiltros() {
  busca.value = ''
  grupo.value = FILTRO_TODOS
  convite.value = FILTRO_TODOS
}

function notificarFalha(falhaAcao: FalhaCasamento) {
  if (falhaAcao.tipo === 'conflito') {
    notificacao.erro(TEXTOS_MESAS.erroConflito)
  } else if (falhaAcao.tipo === 'semPermissao') {
    notificacao.erro(TEXTOS_MESAS.erroSemPermissaoAcao)
  } else if (falhaAcao.tipo === 'conexao') {
    notificacao.erro(TEXTOS_MESAS.erroConexao)
  } else {
    notificacao.erro(falhaAcao.mensagem ?? TEXTOS_MESAS.erroAcao)
  }
}

function novaMesa() {
  mesaEmEdicao.value = null
  dialogoSentarVisivel.value = false
  dialogoMesaVisivel.value = true
}

function aoSalvarMesa(mensagem: string) {
  notificacao.sucesso(mensagem)
}

function acaoMesa(chave: string, mesa: MesaDto) {
  if (chave === 'editar') {
    mesaEmEdicao.value = mesa
    dialogoMesaVisivel.value = true
    return
  }
  const rotulo = rotuloMesa(mesa)
  const casamentoId = props.id
  confirmarExclusao({
    nomeItem: rotulo,
    mensagem: TEXTOS_MESAS.excluirConsequencia(mesa.ocupacao),
    mensagemSucesso: TEXTOS_MESAS.mesaExcluida(rotulo),
    aoConfirmar: () => {
      store.removerMesaComDesfazer(casamentoId, mesa.id, (falha) => {
        notificacao.erro(falha.tipo === 'semPermissao' ? TEXTOS_MESAS.erroSemPermissaoAcao : TEXTOS_MESAS.erroExcluirMesa(rotulo))
      })
    },
    desfazer: () => desfazerExclusao(() => store.desfazerRemocaoMesa(casamentoId, mesa.id), TEXTOS_MESAS.mesaRestaurada(rotulo)),
    aoFecharAviso: () => store.concluirRemocaoMesa(casamentoId, mesa.id),
  })
}

function abrirSentar() {
  mensagemSentar.value = null
  dialogoSentarVisivel.value = true
}

async function sentar(mesaId: string) {
  const mesa = mesas.value.find((item) => item.id === mesaId)
  const ids = pessoasSelecionadas.value.map((pessoa) => pessoa.id)
  if (!mesa || ids.length === 0) {
    return
  }
  sentando.value = true
  mensagemSentar.value = null
  const resultado = await store.sentar(props.id, mesaId, ids)
  sentando.value = false
  if (!resultado.ok) {
    if (resultado.falha.tipo === 'regra') {
      mensagemSentar.value = resultado.falha.mensagem ?? TEXTOS_MESAS.erroAcao
      return
    }
    dialogoSentarVisivel.value = false
    notificarFalha(resultado.falha)
    return
  }
  const mensagem = TEXTOS_MESAS.sentadas(ids.length, rotuloMesa(mesa))
  dialogoSentarVisivel.value = false
  limparSelecao()
  notificacao.sucesso(mensagem)
}

async function retirar() {
  const ids = pessoasSelecionadas.value.filter((pessoa) => pessoa.mesaId !== null).map((pessoa) => pessoa.id)
  if (ids.length === 0) {
    return
  }
  retirando.value = true
  const resultado = await store.retirar(props.id, ids)
  retirando.value = false
  if (!resultado.ok) {
    notificarFalha(resultado.falha)
    return
  }
  const mensagem = TEXTOS_MESAS.retiradas(ids.length)
  limparSelecao()
  notificacao.sucesso(mensagem)
}

async function dispensarAvisos() {
  const ids = (mapa.value?.avisosSaida ?? []).map((aviso) => aviso.convidadoId)
  if (ids.length === 0) {
    return
  }
  dispensando.value = true
  const resultado = await store.dispensarAvisos(props.id, ids)
  dispensando.value = false
  if (!resultado.ok) {
    notificarFalha(resultado.falha)
    return
  }
  anunciar(TEXTOS_MESAS.avisoDispensado)
}

function abrirImpressao() {
  const destino = roteador.resolve({ name: 'impressao-mesas', params: { id: props.id } })
  const janela = window.open(destino.href, '_blank')
  if (janela) {
    janela.opener = null
    return
  }
  void roteador.push(destino)
}

function baixarPlanilha() {
  if (!mapa.value || !casamento.value) {
    return
  }
  baixarTexto(nomeArquivoMesas(casamento.value), gerarCsvMesas(mapa.value))
  notificacao.sucesso(TEXTOS_MESAS.csvBaixado)
}

function acaoCabecalho(chave: string) {
  if (chave === 'imprimir') {
    abrirImpressao()
  } else {
    baixarPlanilha()
  }
}
</script>

<template>
  <LayoutPainelUsuario>
    <template v-if="falha?.tipo === 'naoEncontrado'">
      <EstadoErro
        :titulo="TEXTOS_MESAS.naoEncontradoTitulo"
        :mensagem="TEXTOS_MESAS.naoEncontradoTexto"
        :pode-tentar-novamente="false"
      />
      <RouterLink
        class="mesas__voltar"
        :to="autenticacao.ehCasal && autenticacao.casamentoDoCasal ? { name: 'casamento', params: { id: autenticacao.casamentoDoCasal } } : { name: 'casamentos' }"
        data-teste="voltar-casamentos"
      >
        {{ TEXTOS_MESAS.voltarCasamentos }}
      </RouterLink>
    </template>

    <template v-else>
      <CabecalhoPagina
        :titulo="TEXTOS_MESAS.titulo"
        :descricao="descricao"
      >
        <template #acoes>
          <template v-if="mapa && mesas.length > 0">
            <MenuAcoes
              v-if="telaPequena"
              :itens="itensMenuCabecalho"
              :rotulo="TEXTOS_MESAS.maisAcoes"
              data-teste="menu-exportar"
              @selecionar="acaoCabecalho"
            />
            <template v-else>
              <Button
                :label="TEXTOS_MESAS.imprimir"
                icon="ie ie-imprimir"
                severity="secondary"
                outlined
                data-teste="abrir-impressao"
                @click="abrirImpressao"
              />
              <Button
                :label="TEXTOS_MESAS.baixarCsv"
                icon="ie ie-exportar"
                severity="secondary"
                outlined
                data-teste="baixar-planilha"
                @click="baixarPlanilha"
              />
            </template>
          </template>
          <Button
            v-if="podeEditar"
            :label="TEXTOS_MESAS.novaMesa"
            icon="ie ie-mais"
            data-teste="nova-mesa"
            @click="novaMesa"
          />
        </template>
      </CabecalhoPagina>

      <div class="mesas">
        <p
          class="somente-leitor-tela"
          aria-live="polite"
          data-teste="anuncio-mesas"
        >
          {{ anuncio }}
        </p>

        <MensagemFormulario
          v-if="arquivado"
          variante="informacao"
          :mensagem="TEXTOS_MESAS.arquivado"
          data-teste="aviso-arquivado"
        />

        <EstadoCarregando
          v-if="store.carregando && !mapa"
          variante="lista"
          :linhas="4"
        />

        <EstadoErro
          v-else-if="mensagemErro"
          :titulo="TEXTOS_MESAS.erroCarregar"
          :mensagem="mensagemErro"
          :variante="falha?.tipo === 'semPermissao' ? 'semPermissao' : 'erro'"
          :pode-tentar-novamente="falha?.tipo !== 'semPermissao'"
          @tentar-novamente="store.carregar(id)"
        />

        <template v-else-if="mapa">
          <ResumoContagem
            :itens="itensResumo"
            :rotulo="TEXTOS_MESAS.resumoRotulo"
          />

          <section
            v-if="mapa.avisosSaida.length > 0"
            class="mesas__aviso"
            role="status"
            aria-labelledby="mesas-aviso-titulo"
            data-teste="aviso-saida"
          >
            <span
              class="ie ie-alerta mesas__aviso-icone"
              aria-hidden="true"
            />
            <div class="mesas__aviso-corpo">
              <p
                id="mesas-aviso-titulo"
                class="mesas__aviso-titulo"
              >
                {{ TEXTOS_MESAS.avisoTitulo(mapa.avisosSaida.length) }}
              </p>
              <ul class="mesas__aviso-lista">
                <li
                  v-for="aviso in mapa.avisosSaida"
                  :key="aviso.convidadoId"
                  data-teste="item-aviso-saida"
                >
                  <strong>{{ aviso.nome }}</strong><template v-if="aviso.convite !== aviso.nome">
                    ({{ aviso.convite }})
                  </template> — {{ descreverAviso(aviso) }}, {{ formatarDataCalendarioCurta(aviso.saiuEm.slice(0, 10)) }}
                </li>
              </ul>
            </div>
            <Button
              v-if="podeEditar"
              :label="TEXTOS_MESAS.avisoEntendi"
              severity="secondary"
              outlined
              :loading="dispensando"
              data-teste="dispensar-aviso"
              @click="dispensarAvisos"
            />
          </section>

          <div
            v-if="pessoas.length === 0 && mesas.length === 0"
            class="mesas__vazio"
          >
            <EstadoVazio
              :titulo="TEXTOS_MESAS.vazioMesasTitulo"
              :descricao="TEXTOS_MESAS.vazioMesasTexto"
              icone="mesa"
            >
              <template
                v-if="podeEditar"
                #acao
              >
                <Button
                  :label="TEXTOS_MESAS.novaMesa"
                  icon="ie ie-mais"
                  severity="secondary"
                  outlined
                  data-teste="nova-mesa-vazio"
                  @click="novaMesa"
                />
              </template>
            </EstadoVazio>
          </div>

          <template v-else>
            <div
              class="mesas__filtros"
              role="search"
            >
              <span class="mesas__busca">
                <label
                  for="mesas-busca"
                  class="somente-leitor-tela"
                >{{ TEXTOS_MESAS.buscaRotulo }}</label>
                <InputText
                  id="mesas-busca"
                  v-model="busca"
                  type="search"
                  :placeholder="TEXTOS_MESAS.buscaPlaceholder"
                  data-teste="busca-mesas"
                />
              </span>
              <span class="mesas__filtro">
                <span id="mesas-grupo-rotulo">{{ TEXTOS_MESAS.filtroGrupo }}</span>
                <Select
                  v-model="grupo"
                  aria-labelledby="mesas-grupo-rotulo"
                  :options="opcoesDeGrupo"
                  option-label="rotulo"
                  option-value="valor"
                  data-teste="filtro-grupo"
                />
              </span>
              <span class="mesas__filtro">
                <span id="mesas-convite-rotulo">{{ TEXTOS_MESAS.filtroConvite }}</span>
                <Select
                  v-model="convite"
                  aria-labelledby="mesas-convite-rotulo"
                  :options="opcoesDeConvite"
                  option-label="rotulo"
                  option-value="valor"
                  filter
                  data-teste="filtro-convite"
                />
              </span>
              <p
                class="mesas__resultados"
                aria-live="polite"
                data-teste="resultados-mesas"
              >
                {{ TEXTOS_MESAS.resultados(visiveis.length, pessoas.length) }}
                <Button
                  v-if="comFiltro"
                  :label="TEXTOS_MESAS.limparFiltros"
                  severity="secondary"
                  text
                  size="small"
                  data-teste="limpar-filtros"
                  @click="limparFiltros"
                />
              </p>
            </div>

            <SelectButton
              v-if="telaPequena"
              v-model="painelAtivo"
              class="mesas__abas"
              :options="opcoesPainel"
              option-label="rotulo"
              option-value="valor"
              :allow-empty="false"
              :aria-label="TEXTOS_MESAS.abasRotulo"
              data-teste="abas-mesas"
            />

            <div class="mesas__colunas">
              <section
                v-show="!telaPequena || painelAtivo === 'semMesa'"
                class="mesas__sem-mesa"
                aria-labelledby="mesas-sem-mesa-titulo"
                data-teste="coluna-sem-mesa"
              >
                <header class="mesas__coluna-cabecalho">
                  <h2
                    id="mesas-sem-mesa-titulo"
                    class="mesas__coluna-titulo"
                  >
                    {{ TEXTOS_MESAS.secaoSemMesa }}
                  </h2>
                  <span class="mesas__coluna-contagem numeros-tabulares">{{ TEXTOS_MESAS.contagemSemMesa(mapa.totais.semMesa) }}</span>
                </header>
                <p
                  v-if="podeEditar && mapa.totais.semMesa > 0"
                  class="mesas__instrucao"
                >
                  {{ TEXTOS_MESAS.instrucao }}
                </p>
                <Button
                  v-if="podeEditar && semMesaVisiveis.length > 1"
                  :label="TEXTOS_MESAS.selecionarVisiveis"
                  severity="secondary"
                  text
                  size="small"
                  class="mesas__selecionar-visiveis"
                  data-teste="selecionar-visiveis"
                  @click="selecionarVisiveisSemMesa"
                />

                <p
                  v-if="pessoas.length === 0"
                  class="mesas__nota"
                  data-teste="sem-confirmados"
                >
                  {{ TEXTOS_MESAS.vazioConfirmadosTitulo }}. {{ TEXTOS_MESAS.vazioConfirmadosTexto }}
                  <RouterLink :to="{ name: 'painel-confirmacoes', params: { id } }">
                    {{ TEXTOS_MESAS.verConfirmacoes }}
                  </RouterLink>
                </p>
                <p
                  v-else-if="mapa.totais.semMesa === 0"
                  class="mesas__todos-sentados"
                  data-teste="todos-sentados"
                >
                  {{ TEXTOS_MESAS.todosSentados }}
                </p>
                <p
                  v-else-if="semMesaVisiveis.length === 0"
                  class="mesas__nota"
                >
                  {{ TEXTOS_MESAS.vazioFiltro }}
                </p>

                <ul
                  v-else
                  class="mesas__convites"
                >
                  <li
                    v-for="grupoConvite in gruposSemMesa"
                    :key="grupoConvite.conviteId"
                    class="mesas__convite"
                    data-teste="grupo-convite"
                  >
                    <div class="mesas__convite-cabecalho">
                      <span
                        v-if="!conviteDeUmaPessoa(grupoConvite.convite, grupoConvite.pessoas)"
                        class="mesas__convite-nome"
                      >{{ grupoConvite.convite }}</span>
                      <Button
                        v-if="podeEditar && grupoConvite.pessoas.length > 1 && restantesDoConvite(grupoConvite.pessoas) > 0"
                        :label="TEXTOS_MESAS.selecionarConvite"
                        :aria-label="TEXTOS_MESAS.selecionarConviteAcessivel(grupoConvite.pessoas.length, grupoConvite.convite)"
                        severity="secondary"
                        text
                        size="small"
                        data-teste="selecionar-convite"
                        @click="selecionarVarias(grupoConvite.pessoas.map((pessoa) => pessoa.id))"
                      />
                    </div>
                    <p
                      v-if="podeEditar && grupoParcial(grupoConvite.pessoas)"
                      class="mesas__dica-convite"
                      data-teste="dica-convite"
                    >
                      {{ TEXTOS_MESAS.dicaConvite(restantesDoConvite(grupoConvite.pessoas)) }}
                    </p>
                    <ul class="mesas__pessoas">
                      <li
                        v-for="pessoa in grupoConvite.pessoas"
                        :key="pessoa.id"
                      >
                        <LinhaPessoaMesa
                          :nome="pessoa.nome"
                          :apoio="apoioSemMesa(pessoa)"
                          :crianca="pessoa.faixaEtaria === 'Crianca'"
                          :acompanhante="pessoa.acompanhante"
                          :selecionavel="podeEditar"
                          :selecionada="estaSelecionada(pessoa.id)"
                          @update:selecionada="alternar(pessoa.id, $event)"
                        >
                          <template
                            v-if="divididos.has(pessoa.conviteId)"
                            #extra
                          >
                            <Button
                              :label="TEXTOS_MESAS.conviteDividido"
                              severity="secondary"
                              text
                              size="small"
                              :aria-expanded="divisaoAberta === pessoa.conviteId"
                              data-teste="convite-dividido"
                              @click="alternarDivisao(pessoa.conviteId)"
                            />
                          </template>
                        </LinhaPessoaMesa>
                      </li>
                    </ul>
                    <p
                      v-if="divisaoAberta === grupoConvite.conviteId"
                      class="mesas__divisao"
                      data-teste="detalhe-divisao"
                    >
                      {{ descreverDivisao(pessoas, mesas, grupoConvite.conviteId) }}
                    </p>
                  </li>
                </ul>
              </section>

              <section
                v-show="!telaPequena || painelAtivo === 'mesas'"
                class="mesas__lista"
                aria-labelledby="mesas-lista-titulo"
                data-teste="coluna-mesas"
              >
                <header class="mesas__coluna-cabecalho">
                  <h2
                    id="mesas-lista-titulo"
                    class="mesas__coluna-titulo"
                  >
                    {{ TEXTOS_MESAS.secaoMesas }}
                  </h2>
                </header>

                <EstadoVazio
                  v-if="mesas.length === 0"
                  :titulo="TEXTOS_MESAS.vazioMesasTitulo"
                  :descricao="TEXTOS_MESAS.vazioMesasTexto"
                  icone="mesa"
                >
                  <template
                    v-if="podeEditar"
                    #acao
                  >
                    <Button
                      :label="TEXTOS_MESAS.novaMesa"
                      icon="ie ie-mais"
                      severity="secondary"
                      outlined
                      data-teste="nova-mesa-lista"
                      @click="novaMesa"
                    />
                  </template>
                </EstadoVazio>

                <section
                  v-for="item in mesasVisiveis"
                  :key="item.mesa.id"
                  class="mesas__mesa"
                  :class="{ 'mesas__mesa--especial': item.mesa.especial }"
                  :aria-labelledby="`mesa-${item.mesa.id}`"
                  data-teste="mesa"
                >
                  <header class="mesas__mesa-cabecalho">
                    <h3
                      :id="`mesa-${item.mesa.id}`"
                      class="mesas__mesa-titulo"
                    >
                      {{ rotuloMesa(item.mesa) }}
                    </h3>
                    <OcupacaoMesa
                      :ocupados="item.mesa.ocupacao"
                      :lugares="item.mesa.capacidade"
                    />
                    <MenuAcoes
                      v-if="podeEditar"
                      :itens="itensMenuMesa"
                      :rotulo="TEXTOS_MESAS.maisAcoes"
                      :rotulo-acessivel="TEXTOS_MESAS.acoesMesa(rotuloMesa(item.mesa))"
                      somente-icone
                      data-teste="menu-mesa"
                      @selecionar="acaoMesa($event, item.mesa)"
                    />
                  </header>
                  <p
                    v-if="item.pessoas.length === 0"
                    class="mesas__nota"
                  >
                    {{ TEXTOS_MESAS.mesaVazia }}
                  </p>
                  <p
                    v-else-if="item.visiveis.length === 0"
                    class="mesas__nota"
                  >
                    {{ TEXTOS_MESAS.mesaSemResultado }}
                  </p>
                  <ul
                    v-else
                    class="mesas__pessoas"
                  >
                    <li
                      v-for="pessoa in item.visiveis"
                      :key="pessoa.id"
                    >
                      <LinhaPessoaMesa
                        :nome="pessoa.nome"
                        :apoio="pessoa.convite"
                        :crianca="pessoa.faixaEtaria === 'Crianca'"
                        :acompanhante="pessoa.acompanhante"
                        :selecionavel="podeEditar"
                        :selecionada="estaSelecionada(pessoa.id)"
                        @update:selecionada="alternar(pessoa.id, $event)"
                      >
                        <template
                          v-if="divididos.has(pessoa.conviteId)"
                          #extra
                        >
                          <BadgeStatus
                            :texto="TEXTOS_MESAS.conviteDividido"
                            variante="alerta"
                          />
                        </template>
                      </LinhaPessoaMesa>
                    </li>
                  </ul>
                </section>
              </section>
            </div>

            <div
              v-if="podeEditar && selecionados.length > 0"
              class="mesas__barra"
            >
              <BarraAcaoFixa variante="selecao">
                <template #status>
                  <span data-teste="contagem-selecao">{{ TEXTOS_MESAS.selecionadas(selecionados.length) }}</span>
                  <Button
                    :label="TEXTOS_MESAS.limparSelecao"
                    severity="secondary"
                    text
                    size="small"
                    data-teste="limpar-selecao"
                    @click="limparSelecao"
                  />
                </template>
                <Button
                  v-if="algumaSentada"
                  :label="TEXTOS_MESAS.tirarDaMesa"
                  severity="secondary"
                  outlined
                  :loading="retirando"
                  data-teste="tirar-da-mesa"
                  @click="retirar"
                />
                <Button
                  :label="TEXTOS_MESAS.sentarEm"
                  icon="ie ie-mesa"
                  data-teste="sentar-em"
                  @click="abrirSentar"
                />
              </BarraAcaoFixa>
            </div>
          </template>
        </template>
      </div>

      <DialogoMesa
        v-if="mapa"
        v-model:visivel="dialogoMesaVisivel"
        :casamento-id="id"
        :mesa="mesaEmEdicao"
        :numero-sugerido="proximoNumeroMesa(mesas)"
        @salvo="aoSalvarMesa"
      />
      <DialogoSentarEm
        v-if="mapa"
        v-model:visivel="dialogoSentarVisivel"
        :mesas="mesas"
        :selecionadas="pessoasSelecionadas"
        :executando="sentando"
        :mensagem="mensagemSentar"
        :pode-criar-mesa="podeEditar"
        @escolher="sentar"
        @criar-mesa="novaMesa"
      />
    </template>
  </LayoutPainelUsuario>
</template>

<style scoped>
.mesas {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-6);
}

.mesas__voltar {
  display: inline-block;
  margin-top: var(--p-espaco-4);
}

.mesas__aviso {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: var(--p-espaco-3);
  padding: var(--p-espaco-4);
  background: var(--p-cor-alerta-suave);
  border: 1px solid var(--p-cor-alerta);
  border-radius: var(--p-raio-painel);
}

.mesas__aviso-icone {
  color: var(--p-cor-alerta-texto);
}

.mesas__aviso-corpo {
  display: flex;
  flex: 1 1 16rem;
  flex-direction: column;
  gap: var(--p-espaco-2);
}

.mesas__aviso-titulo {
  margin: 0;
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-alerta-texto);
}

.mesas__aviso-lista {
  margin: 0;
  padding-left: var(--p-espaco-4);
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto);
}

.mesas__filtros {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--p-espaco-3);
}

.mesas__busca {
  display: flex;
  flex: 1 1 16rem;
}

.mesas__busca :deep(.p-inputtext) {
  inline-size: 100%;
}

.mesas__filtro {
  display: flex;
  flex: 1 1 10rem;
  flex-direction: column;
  gap: var(--p-espaco-1);
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-secundario);
}

.mesas__resultados {
  display: flex;
  flex-basis: 100%;
  align-items: center;
  gap: var(--p-espaco-2);
  margin: 0;
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.mesas__abas {
  overflow-x: auto;
}

.mesas__colunas {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-6);
}

.mesas__sem-mesa {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-3);
  padding: var(--p-espaco-4);
  background: var(--p-cor-superficie-sutil);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.mesas__lista {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-4);
  min-inline-size: 0;
}

.mesas__coluna-cabecalho {
  display: flex;
  align-items: baseline;
  gap: var(--p-espaco-2);
}

.mesas__coluna-titulo {
  margin: 0;
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-titulo);
  font-weight: var(--p-fonte-peso-seminegrito);
}

.mesas__coluna-contagem {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.mesas__instrucao,
.mesas__nota,
.mesas__dica-convite,
.mesas__divisao {
  margin: 0;
  font-size: var(--p-fonte-tamanho-apoio);
  line-height: var(--p-fonte-entrelinha-corpo);
  color: var(--p-cor-texto-secundario);
}

.mesas__dica-convite {
  color: var(--p-cor-alerta-texto);
}

.mesas__todos-sentados {
  margin: 0;
  padding: var(--p-espaco-4);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-sucesso-texto);
  text-align: center;
  border: 1px dashed var(--p-cor-borda-controle);
  border-radius: var(--p-raio-painel);
}

.mesas__selecionar-visiveis {
  align-self: flex-start;
}

.mesas__convites,
.mesas__pessoas {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  margin: 0;
  padding: 0;
  list-style: none;
}

.mesas__convites {
  gap: var(--p-espaco-4);
}

.mesas__convite {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
}

.mesas__convite-cabecalho {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--p-espaco-2);
}

.mesas__convite-nome {
  font-size: var(--p-fonte-tamanho-apoio);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto-secundario);
}

.mesas__mesa {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-3);
  padding: var(--p-espaco-4);
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.mesas__mesa--especial {
  border-inline-start: var(--p-dimensao-fio-cronograma) solid var(--p-cor-acento);
}

.mesas__mesa-cabecalho {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-espaco-2) var(--p-espaco-4);
}

.mesas__mesa-titulo {
  flex: 1 1 10rem;
  margin: 0;
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-corpo);
  font-weight: var(--p-fonte-peso-seminegrito);
}

.mesas__mesa--especial .mesas__mesa-titulo {
  color: var(--p-cor-acento-texto);
}

.mesas__barra {
  position: sticky;
  bottom: 0;
  z-index: var(--p-camada-cabecalho);
}

@media (min-width: 1024px) {
  .mesas__colunas {
    display: grid;
    grid-template-columns: minmax(16rem, 20rem) minmax(0, 1fr);
    align-items: start;
  }
}
</style>
