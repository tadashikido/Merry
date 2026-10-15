<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'

import LayoutPainelUsuario from '@/layouts/LayoutPainelUsuario.vue'
import BadgeStatus from '@/componentes/base/BadgeStatus.vue'
import CabecalhoPagina from '@/componentes/base/CabecalhoPagina.vue'
import DialogoConfirmacao from '@/componentes/base/DialogoConfirmacao.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import ListagemDados from '@/componentes/base/ListagemDados.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import MenuAcoes from '@/componentes/base/MenuAcoes.vue'
import ResumoContagem from '@/componentes/base/ResumoContagem.vue'
import type { ColunaListagem } from '@/componentes/base/tipos'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import { useConfirmarExclusao } from '@/composables/useConfirmarExclusao'
import { useEnvioConvite, type ConviteParaEnvio } from '@/composables/useEnvioConvite'
import { useNotificacao } from '@/composables/useNotificacao'
import { useCasamentosStore } from '@/stores/casamentos'
import { useConvidadosStore } from '@/stores/convidados'
import { TEXTOS_MESAS } from '@/textos/mesas'
import { TEXTOS_CONFIRMACOES } from '@/textos/confirmacoes'
import { TEXTOS_DADOS_SENSIVEIS } from '@/textos/dadosSensiveis'
import {
  ROTULOS_FILTRO_RESPOSTA,
  ROTULOS_RESPOSTA,
  ROTULOS_STATUS_ENVIO,
  TEXTOS_CONVIDADOS,
  VARIANTE_RESPOSTA,
} from '@/textos/convidados'
import { TEXTOS_IMPORTACAO } from '@/textos/importacaoConvidados'
import { TEXTOS_ENVIO_CONVITE, VARIANTE_STATUS_ENVIO } from '@/textos/rsvp'
import { RESPOSTAS_RSVP, type ConviteDto, type RespostaRsvp } from '@/tipos/convidados'
import {
  GRUPO_NENHUM,
  GRUPO_TODOS,
  filtrarConvites,
  listarGrupos,
  type ConviteFiltrado,
} from '@/utilitarios/filtroConvidados'
import { formatarData, formatarDataCalendarioComDiaSemana, formatarNomesCasal } from '@/utilitarios/formatacao'
import { primeiroTelefone } from '@/utilitarios/rsvp'
import { complementoResumoConvidados, itensResumoConvidados } from '@/utilitarios/resumoConvidados'
import { rotuloMesaPorId } from '@/utilitarios/mesas'

type FiltroResposta = RespostaRsvp | 'Todas'

interface LinhaConvite extends Record<string, unknown> {
  id: string
  nome: string
  grupo: string | null
  acompanhantes: number
  envio: string
  filtrado: ConviteFiltrado
}

const props = defineProps<{ id: string }>()

const autenticacao = useAutenticacaoStore()

const casamentos = useCasamentosStore()
const store = useConvidadosStore()
const roteador = useRouter()
const notificacao = useNotificacao()
const { confirmarExclusao } = useConfirmarExclusao()

const envio = useEnvioConvite({
  casamentoId: () => props.id,
  casamento: () => casamento.value,
  arquivado: () => arquivado.value,
})
const { conviteEmAndamento, confirmacaoLink, executandoConfirmacao, itensMenuLink } = envio

function paraEnvio(convite: ConviteDto): ConviteParaEnvio {
  return { id: convite.id, nome: convite.nome, statusEnvio: convite.statusEnvio, telefone: primeiroTelefone(convite) }
}

function abrirMesas() {
  void roteador.push({ name: 'casamento-mesas', params: { id: props.id } })
}

function mesaDaPessoa(mesaId: string | null | undefined): string | null {
  return rotuloMesaPorId(lista.value?.mesas, mesaId)
}

function abrirPainel() {
  void roteador.push({ name: 'painel-confirmacoes', params: { id: props.id } })
}

const busca = ref('')
const grupo = ref(GRUPO_TODOS)
const resposta = ref<FiltroResposta>('Todas')

const casamento = computed(() => (casamentos.atual?.id === props.id ? casamentos.atual : null))
const nomes = computed(() =>
  casamento.value ? formatarNomesCasal(casamento.value.nomePrimeiraPessoa, casamento.value.nomeSegundaPessoa) : '',
)
const descricao = computed(() =>
  casamento.value ? `${nomes.value}, ${formatarDataCalendarioComDiaSemana(casamento.value.data)}` : undefined,
)

const lista = computed(() => (store.casamentoId === props.id ? store.lista : null))
const falha = computed(() => (store.casamentoId === props.id ? store.falha : null))
const arquivado = computed(() => lista.value?.casamentoArquivado ?? casamento.value?.arquivado ?? false)

const opcoesGrupo = computed(() => {
  const { grupos, temSemGrupo } = listarGrupos(lista.value?.convites ?? [])
  return [
    { chave: GRUPO_TODOS, rotulo: TEXTOS_CONVIDADOS.todosGrupos },
    ...grupos,
    ...(temSemGrupo ? [{ chave: GRUPO_NENHUM, rotulo: TEXTOS_CONVIDADOS.semGrupo }] : []),
  ]
})

const opcoesResposta: { rotulo: string; valor: FiltroResposta }[] = [
  { rotulo: TEXTOS_CONVIDADOS.respostaTodas, valor: 'Todas' },
  ...RESPOSTAS_RSVP.map((valor) => ({ rotulo: ROTULOS_FILTRO_RESPOSTA[valor], valor })),
]

const filtros = computed(() => ({
  busca: busca.value,
  grupo: grupo.value,
  resposta: resposta.value === 'Todas' ? null : resposta.value,
}))

const temFiltros = computed(() => grupo.value !== GRUPO_TODOS || resposta.value !== 'Todas')

const linhas = computed<LinhaConvite[]>(() =>
  filtrarConvites(lista.value?.convites ?? [], filtros.value).map((filtrado) => ({
    id: filtrado.convite.id,
    nome: filtrado.convite.nome,
    grupo: filtrado.convite.grupo,
    acompanhantes: filtrado.convite.limiteAcompanhantes,
    envio: filtrado.convite.statusEnvio,
    filtrado,
  })),
)

const colunas: ColunaListagem<LinhaConvite>[] = [
  { campo: 'nome', titulo: TEXTOS_CONVIDADOS.colunaConvite, principal: true },
  { campo: 'grupo', titulo: TEXTOS_CONVIDADOS.colunaGrupo },
  { campo: 'envio', titulo: TEXTOS_ENVIO_CONVITE.colunaEnvio },
  { campo: 'acompanhantes', titulo: TEXTOS_CONVIDADOS.colunaAcompanhantes, ocultarNoTablet: true },
]

const mensagemErroLista = computed(() => {
  if (!falha.value || falha.value.tipo === 'naoEncontrado') {
    return null
  }
  return falha.value.tipo === 'semPermissao' ? TEXTOS_CONVIDADOS.semAcesso : TEXTOS_CONVIDADOS.erroCarregar
})

watch(
  () => props.id,
  (id) => {
    busca.value = ''
    grupo.value = GRUPO_TODOS
    resposta.value = 'Todas'
    void casamentos.obter(id)
    void store.carregar(id)
  },
  { immediate: true },
)

watch(
  nomes,
  (valor) => {
    if (valor) {
      document.title = TEXTOS_CONVIDADOS.tituloDocumento(valor)
    }
  },
  { immediate: true },
)

watch(opcoesGrupo, (opcoes) => {
  if (!opcoes.some((opcao) => opcao.chave === grupo.value)) {
    grupo.value = GRUPO_TODOS
  }
})

function limparFiltros() {
  grupo.value = GRUPO_TODOS
  resposta.value = 'Todas'
}

function adicionar() {
  void roteador.push({ name: 'convite-novo', params: { id: props.id } })
}

function importarPlanilha() {
  void roteador.push({ name: 'convidados-importar', params: { id: props.id } })
}

function editar(convite: ConviteDto) {
  void roteador.push({ name: 'convite-editar', params: { id: props.id, conviteId: convite.id } })
}

function abrirRestricoes() {
  void roteador.push({ name: 'restricoes-alimentares', params: { id: props.id } })
}

function excluir(convite: ConviteDto) {
  confirmarExclusao({
    nomeItem: convite.nome,
    mensagem: TEXTOS_CONVIDADOS.confirmarExclusaoTexto(convite.convidados.length),
    aoConfirmar: async () => {
      const resultado = await store.remover(props.id, convite.id)
      if (!resultado.ok) {
        if (resultado.falha.tipo === 'semPermissao') {
          notificacao.erro(TEXTOS_CONVIDADOS.semPermissao)
        }
        throw new Error(resultado.falha.mensagem ?? resultado.falha.tipo)
      }
      await store.carregar(props.id)
    },
  })
}
</script>

<template>
  <LayoutPainelUsuario>
    <template v-if="falha?.tipo === 'naoEncontrado'">
      <EstadoErro
        :titulo="TEXTOS_CONVIDADOS.casamentoNaoEncontradoTitulo"
        :mensagem="TEXTOS_CONVIDADOS.casamentoNaoEncontradoTexto"
        :pode-tentar-novamente="false"
      />
      <RouterLink
        class="convidados__voltar"
        :to="{ name: 'casamentos' }"
        data-teste="voltar-casamentos"
      >
        {{ TEXTOS_CONVIDADOS.voltarCasamentos }}
      </RouterLink>
    </template>

    <template v-else>
      <CabecalhoPagina
        :titulo="TEXTOS_CONVIDADOS.listaTitulo"
        :descricao="descricao"
      >
        <template #acoes>
          <Button
            v-if="!mensagemErroLista"
            :label="TEXTOS_CONFIRMACOES.acaoAbrir"
            icon="ie ie-confirmacoes"
            severity="secondary"
            text
            data-teste="abrir-confirmacoes"
            @click="abrirPainel"
          />
          <Button
            v-if="!mensagemErroLista"
            :label="TEXTOS_MESAS.acaoAbrir"
            icon="ie ie-mesa"
            severity="secondary"
            text
            data-teste="abrir-mesas"
            @click="abrirMesas"
          />
          <Button
            v-if="!mensagemErroLista && !autenticacao.ehCasal"
            :label="TEXTOS_DADOS_SENSIVEIS.acaoLista"
            icon="ie ie-checklist"
            severity="secondary"
            text
            data-teste="abrir-restricoes"
            @click="abrirRestricoes"
          />
          <Button
            v-if="!arquivado && !mensagemErroLista"
            :label="TEXTOS_IMPORTACAO.acaoImportar"
            icon="ie ie-importar"
            severity="secondary"
            outlined
            data-teste="importar-planilha"
            @click="importarPlanilha"
          />
          <Button
            v-if="!arquivado && !mensagemErroLista"
            :label="TEXTOS_CONVIDADOS.adicionarConvite"
            icon="ie ie-mais"
            data-teste="adicionar-convite"
            @click="adicionar"
          />
        </template>
      </CabecalhoPagina>

      <div class="convidados">
        <MensagemFormulario
          v-if="arquivado"
          variante="informacao"
          :mensagem="TEXTOS_CONVIDADOS.avisoArquivado"
          data-teste="aviso-arquivado"
        />

        <EstadoCarregando
          v-if="store.carregando && !lista"
          variante="cartao"
          :linhas="1"
        />
        <ResumoContagem
          v-else-if="lista && lista.totais.convites > 0"
          :itens="itensResumoConvidados(lista.totais)"
          :rotulo="TEXTOS_CONVIDADOS.resumoRotulo"
        >
          <template #rodape>
            {{ complementoResumoConvidados(lista.totais, lista.convidadosEstimados) }}
          </template>
        </ResumoContagem>

        <ListagemDados
          v-model:busca="busca"
          :itens="linhas"
          :colunas="colunas"
          chave="id"
          :rotulo="TEXTOS_CONVIDADOS.listaRotulo"
          :carregando="store.carregando && !lista"
          :erro="mensagemErroLista"
          :placeholder-busca="TEXTOS_CONVIDADOS.buscaPlaceholder"
          :filtros-ativos="temFiltros"
          :titulo-vazio="TEXTOS_CONVIDADOS.vazioTitulo"
          :descricao-vazio="TEXTOS_CONVIDADOS.vazioTexto"
          @tentar-novamente="store.carregar(id)"
          @limpar-filtros="limparFiltros"
        >
          <template #filtros>
            <Select
              v-model="grupo"
              :options="opcoesGrupo"
              option-label="rotulo"
              option-value="chave"
              :aria-label="TEXTOS_CONVIDADOS.filtroGrupo"
              :disabled="!lista || lista.convites.length === 0"
              data-teste="filtro-grupo"
            />
            <SelectButton
              v-model="resposta"
              :options="opcoesResposta"
              option-label="rotulo"
              option-value="valor"
              :allow-empty="false"
              :aria-label="TEXTOS_CONVIDADOS.filtroResposta"
              :disabled="!lista || lista.convites.length === 0"
              data-teste="filtro-resposta"
            />
          </template>

          <template #acao-vazio>
            <div
              v-if="!arquivado"
              class="convidados__acoes-vazio"
            >
              <Button
                :label="TEXTOS_CONVIDADOS.adicionarConvite"
                severity="secondary"
                outlined
                @click="adicionar"
              />
              <Button
                :label="TEXTOS_IMPORTACAO.acaoImportar"
                icon="ie ie-importar"
                severity="secondary"
                text
                data-teste="importar-planilha-vazio"
                @click="importarPlanilha"
              />
            </div>
            <p
              v-if="!arquivado"
              class="convidados__dica-importar"
            >
              {{ TEXTOS_IMPORTACAO.vazioImportar }}
            </p>
          </template>

          <template #celula-nome="{ item }">
            <div class="convidados__convite">
              <span class="convidados__nome-convite">{{ item.nome }}</span>
              <ul class="convidados__pessoas">
                <li
                  v-for="convidado in item.filtrado.convidadosVisiveis"
                  :key="convidado.id"
                  class="convidados__pessoa"
                  data-teste="pessoa-convite"
                >
                  <span>{{ convidado.nome }}</span>
                  <BadgeStatus
                    v-if="convidado.acompanhante"
                    :texto="TEXTOS_ENVIO_CONVITE.acompanhante"
                    variante="informacao"
                  />
                  <BadgeStatus
                    v-if="convidado.possuiRestricao"
                    :texto="TEXTOS_DADOS_SENSIVEIS.badgeLista"
                    variante="informacao"
                    data-teste="pessoa-restricao"
                  />
                  <BadgeStatus
                    v-if="convidado.faixaEtaria === 'Crianca'"
                    :texto="TEXTOS_CONVIDADOS.crianca"
                  />
                  <BadgeStatus
                    :texto="ROTULOS_RESPOSTA[convidado.resposta]"
                    :variante="VARIANTE_RESPOSTA[convidado.resposta]"
                  />
                  <span
                    v-if="convidado.resposta === 'Confirmado' && lista?.mesas"
                    class="convidados__mesa"
                    data-teste="mesa-pessoa"
                  >{{ mesaDaPessoa(convidado.mesaId) ?? TEXTOS_MESAS.semMesa }}</span>
                </li>
              </ul>
              <span
                v-if="item.filtrado.convidadosOcultos > 0"
                class="convidados__ocultos"
                data-teste="pessoas-ocultas"
              >{{ TEXTOS_CONVIDADOS.outrasPessoas(item.filtrado.convidadosOcultos) }}</span>
            </div>
          </template>

          <template #celula-grupo="{ item }">
            {{ item.grupo ?? TEXTOS_CONVIDADOS.semGrupo }}
          </template>

          <template #celula-envio="{ item }">
            <div class="convidados__envio">
              <BadgeStatus
                :texto="ROTULOS_STATUS_ENVIO[item.filtrado.convite.statusEnvio]"
                :variante="VARIANTE_STATUS_ENVIO[item.filtrado.convite.statusEnvio]"
              />
              <span
                v-if="item.filtrado.convite.respondidoEm"
                class="convidados__respondido"
                data-teste="respondido-em"
              >{{ TEXTOS_ENVIO_CONVITE.respondidoEm(formatarData(item.filtrado.convite.respondidoEm)) }}</span>
            </div>
          </template>

          <template #celula-acompanhantes="{ item }">
            <span class="numeros-tabulares">{{ TEXTOS_CONVIDADOS.acompanhantesValor(item.acompanhantes) }}</span>
          </template>

          <template #acoes-linha="{ item }">
            <Button
              v-if="!arquivado"
              :label="TEXTOS_ENVIO_CONVITE.enviarWhatsApp"
              :aria-label="TEXTOS_ENVIO_CONVITE.acaoComNome(TEXTOS_ENVIO_CONVITE.enviarWhatsApp, item.nome)"
              icon="ie ie-whatsapp"
              severity="secondary"
              outlined
              :loading="conviteEmAndamento === item.id"
              :disabled="conviteEmAndamento !== null && conviteEmAndamento !== item.id"
              data-teste="enviar-whatsapp"
              @click="envio.enviarWhatsApp(paraEnvio(item.filtrado.convite))"
            />
            <MenuAcoes
              :itens="itensMenuLink()"
              :rotulo="TEXTOS_ENVIO_CONVITE.maisAcoes"
              :rotulo-acessivel="TEXTOS_ENVIO_CONVITE.acaoComNome(TEXTOS_ENVIO_CONVITE.maisAcoes, item.nome)"
              :desabilitado="conviteEmAndamento !== null"
              @selecionar="envio.executarAcaoLink(paraEnvio(item.filtrado.convite), $event)"
            />
            <Button
              v-if="!arquivado"
              :label="TEXTOS_CONVIDADOS.editar"
              :aria-label="TEXTOS_CONVIDADOS.acaoComNome(TEXTOS_CONVIDADOS.editar, item.nome)"
              icon="ie ie-editar"
              severity="secondary"
              text
              data-teste="editar-convite"
              @click="editar(item.filtrado.convite)"
            />
            <Button
              v-if="!arquivado"
              :label="TEXTOS_CONVIDADOS.excluir"
              :aria-label="TEXTOS_CONVIDADOS.acaoComNome(TEXTOS_CONVIDADOS.excluir, item.nome)"
              icon="ie ie-excluir"
              severity="secondary"
              text
              data-teste="excluir-convite"
              @click="excluir(item.filtrado.convite)"
            />
          </template>
        </ListagemDados>

        <p
          v-if="lista && lista.convites.length > 0"
          class="convidados__resultados"
          aria-live="polite"
          data-teste="contador-resultados"
        >
          {{ TEXTOS_CONVIDADOS.resultados(linhas.length) }}
        </p>
      </div>

      <DialogoConfirmacao
        :visivel="confirmacaoLink !== null"
        :titulo="confirmacaoLink?.acao === 'revogar' ? TEXTOS_ENVIO_CONVITE.confirmarRevogarTitulo : TEXTOS_ENVIO_CONVITE.confirmarRegenerarTitulo"
        :mensagem="confirmacaoLink?.acao === 'revogar'
          ? TEXTOS_ENVIO_CONVITE.confirmarRevogarTexto
          : TEXTOS_ENVIO_CONVITE.confirmarRegenerarTexto(confirmacaoLink?.convite.nome ?? '')"
        :rotulo-confirmar="confirmacaoLink?.acao === 'revogar' ? TEXTOS_ENVIO_CONVITE.confirmarRevogarAcao : TEXTOS_ENVIO_CONVITE.confirmarRegenerarAcao"
        :rotulo-cancelar="TEXTOS_ENVIO_CONVITE.cancelar"
        :executando="executandoConfirmacao"
        @confirmar="envio.confirmarAcaoLink"
        @cancelar="envio.cancelarConfirmacao"
      />
    </template>
  </LayoutPainelUsuario>
</template>

<style scoped>
.convidados {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-6);
}

.convidados__convite {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
  min-width: 0;
}

.convidados__nome-convite {
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.convidados__pessoas {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  margin: 0;
  padding: 0;
  list-style: none;
}

.convidados__pessoa {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-espaco-2);
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.convidados__mesa {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.convidados__ocultos,
.convidados__resultados {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
}

.convidados__acoes-vazio {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--p-espaco-3);
}

.convidados__dica-importar {
  margin: var(--p-espaco-2) 0 0;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
}

.convidados__envio {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--p-espaco-1);
}

.convidados__respondido {
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
  white-space: nowrap;
}

.convidados__voltar {
  display: inline-block;
  margin-top: var(--p-espaco-4);
}
</style>
