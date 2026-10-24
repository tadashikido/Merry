<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Button from 'primevue/button'

import LayoutPainelUsuario from '@/layouts/LayoutPainelUsuario.vue'
import CabecalhoPagina from '@/componentes/base/CabecalhoPagina.vue'
import DialogoConfirmacao from '@/componentes/base/DialogoConfirmacao.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import EstadoVazio from '@/componentes/base/EstadoVazio.vue'
import LinhaFornecedorEvento from '@/componentes/base/LinhaFornecedorEvento.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import MenuAcoes from '@/componentes/base/MenuAcoes.vue'
import ResumoOrcamento from '@/componentes/base/ResumoOrcamento.vue'
import type { ItemMenuAcoes } from '@/componentes/base/tipos'
import ContratacaoFornecedoresEvento from '@/componentes/fornecedoresEvento/ContratacaoFornecedoresEvento.vue'
import DialogoImportarFornecedores from '@/componentes/fornecedoresEvento/DialogoImportarFornecedores.vue'
import { useNotificacao } from '@/composables/useNotificacao'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import { useEventosStore } from '@/stores/eventos'
import { useFornecedoresEventoStore } from '@/stores/fornecedoresEvento'
import { ROTULOS_CATEGORIA_FORNECEDOR } from '@/textos/fornecedores'
import { TEXTOS_PARCELAS_FORNECEDOR } from '@/textos/financeiro'
import { TEXTOS_CONTRATO, TEXTOS_FORNECEDORES_EVENTO } from '@/textos/fornecedoresEvento'
import { ehTipoEvento } from '@/textos/tiposEvento'
import type { FornecedorEventoDto, ResultadoImportacaoFornecedoresDto } from '@/tipos/fornecedoresEvento'
import { formatarDataCalendarioComDiaSemana, formatarNomesAnfitrioes } from '@/utilitarios/formatacao'
import { agruparVinculosPorCategoria } from '@/utilitarios/fornecedoresEvento'

type AcaoVinculo = 'editar' | 'baixar' | 'parcelas' | 'remover'

const props = defineProps<{ id: string }>()

const autenticacao = useAutenticacaoStore()
const eventos = useEventosStore()
const store = useFornecedoresEventoStore()
const roteador = useRouter()
const notificacao = useNotificacao()

const importando = ref(false)
const vinculoRemocao = ref<FornecedorEventoDto | null>(null)
const removendo = ref(false)
const vinculoEmAndamento = ref<string | null>(null)
const vinculoComParcelas = ref<FornecedorEventoDto | null>(null)

const evento = computed(() => (eventos.atual?.id === props.id ? eventos.atual : null))
const nomes = computed(() =>
  evento.value ? formatarNomesAnfitrioes(evento.value.nomePrimeiraPessoa, evento.value.nomeSegundaPessoa) : '',
)
const lista = computed(() => (store.eventoId === props.id ? store.lista : null))
const falha = computed(() => (store.eventoId === props.id ? store.falha : null))
const visaoDoAnfitriao = computed(() => autenticacao.ehAnfitriao)
const arquivado = computed(() => lista.value?.eventoArquivado ?? evento.value?.arquivado ?? false)
const podeGerenciar = computed(() => !visaoDoAnfitriao.value && lista.value?.somenteLeitura === false)
const grupos = computed(() => agruparVinculosPorCategoria(lista.value?.vinculos ?? []))
const semVinculos = computed(() => lista.value !== null && lista.value.vinculos.length === 0)
const tipoEvento = computed(() => (evento.value && ehTipoEvento(evento.value.tipo) ? evento.value.tipo : null))
const descricao = computed(() =>
  evento.value ? `${nomes.value}, ${formatarDataCalendarioComDiaSemana(evento.value.data)}` : undefined,
)

watch(
  () => props.id,
  (id) => {
    void eventos.obter(id)
    void store.carregar(id)
  },
  { immediate: true },
)

watch(
  nomes,
  (valor) => {
    if (valor) {
      document.title = TEXTOS_FORNECEDORES_EVENTO.tituloDocumento(valor)
    }
  },
  { immediate: true },
)

function adicionar() {
  void roteador.push({ name: 'fornecedor-evento-novo', params: { id: props.id } })
}

function destinoEdicao(vinculo: FornecedorEventoDto) {
  return podeGerenciar.value
    ? { name: 'fornecedor-evento-editar', params: { id: props.id, vinculoId: vinculo.id } }
    : null
}

function acoesDoVinculo(vinculo: FornecedorEventoDto): ItemMenuAcoes[] {
  const itens: ItemMenuAcoes[] = [
    { chave: 'editar', rotulo: TEXTOS_FORNECEDORES_EVENTO.menuEditar, icone: 'ie ie-editar' },
  ]
  if (vinculo.contrato) {
    itens.push({ chave: 'baixar', rotulo: TEXTOS_FORNECEDORES_EVENTO.menuBaixar, icone: 'ie ie-exportar' })
  }
  if (vinculo.parcelas && vinculo.parcelas.quantidade > 0) {
    itens.push({ chave: 'parcelas', rotulo: TEXTOS_PARCELAS_FORNECEDOR.verParcelas, icone: 'ie ie-financeiro' })
  }
  itens.push({ chave: 'remover', rotulo: TEXTOS_FORNECEDORES_EVENTO.menuRemover, icone: 'ie ie-excluir', perigoso: true })
  return itens
}

async function baixar(vinculo: FornecedorEventoDto) {
  vinculoEmAndamento.value = vinculo.id
  const resultado = await store.baixarContrato(props.id, vinculo)
  vinculoEmAndamento.value = null
  if (!resultado.ok) {
    notificacao.erro(TEXTOS_CONTRATO.erroBaixar)
  }
}

function executarAcao(vinculo: FornecedorEventoDto, chave: string) {
  switch (chave as AcaoVinculo) {
    case 'editar':
      void roteador.push({ name: 'fornecedor-evento-editar', params: { id: props.id, vinculoId: vinculo.id } })
      return
    case 'baixar':
      void baixar(vinculo)
      return
    case 'parcelas':
      irParaFinanceiro()
      return
    case 'remover':
      if (vinculo.parcelas && vinculo.parcelas.quantidade > 0) {
        vinculoComParcelas.value = vinculo
        return
      }
      vinculoRemocao.value = vinculo
  }
}

function irParaFinanceiro() {
  vinculoComParcelas.value = null
  void roteador.push({ name: 'evento-financeiro', params: { id: props.id }, query: { visao: 'fornecedor' } })
}

function alterarVisibilidadeComParcelas(visivel: boolean) {
  if (!visivel) {
    vinculoComParcelas.value = null
  }
}

function alterarVisibilidadeRemocao(visivel: boolean) {
  if (!visivel && !removendo.value) {
    vinculoRemocao.value = null
  }
}

async function confirmarRemocao() {
  const vinculo = vinculoRemocao.value
  if (!vinculo) {
    return
  }
  removendo.value = true
  const resultado = await store.remover(props.id, vinculo.id)
  removendo.value = false
  vinculoRemocao.value = null
  if (!resultado.ok) {
    notificacao.erro(
      resultado.falha.tipo === 'regra' && resultado.falha.mensagem
        ? resultado.falha.mensagem
        : TEXTOS_FORNECEDORES_EVENTO.erroRemover,
    )
    if (resultado.falha.tipo === 'naoEncontrado') {
      void store.carregar(props.id)
    }
    return
  }
  notificacao.sucesso(TEXTOS_FORNECEDORES_EVENTO.toastRemovido(vinculo.fornecedor.nomeEmpresa))
}

function aoImportar(resultado: ResultadoImportacaoFornecedoresDto) {
  notificacao.sucesso(TEXTOS_FORNECEDORES_EVENTO.importarResultado(resultado.importados, resultado.ignorados))
}
</script>

<template>
  <LayoutPainelUsuario>
    <template v-if="falha?.tipo === 'naoEncontrado'">
      <EstadoErro
        :titulo="visaoDoAnfitriao ? TEXTOS_FORNECEDORES_EVENTO.naoEncontradoAnfitriaoTitulo : TEXTOS_FORNECEDORES_EVENTO.naoEncontradoTitulo"
        :mensagem="TEXTOS_FORNECEDORES_EVENTO.naoEncontradoTexto"
        :pode-tentar-novamente="false"
      />
      <RouterLink
        class="fornecedores-evento__voltar"
        :to="autenticacao.eventoDoAnfitriao ? { name: 'evento', params: { id: autenticacao.eventoDoAnfitriao } } : { name: 'eventos' }"
        data-teste="voltar"
      >
        {{ autenticacao.eventoDoAnfitriao ? TEXTOS_FORNECEDORES_EVENTO.voltarNossoEvento : TEXTOS_FORNECEDORES_EVENTO.voltarEventos }}
      </RouterLink>
    </template>

    <template v-else>
      <CabecalhoPagina
        :titulo="TEXTOS_FORNECEDORES_EVENTO.titulo"
        :descricao="descricao"
      >
        <template
          v-if="podeGerenciar && !falha && !semVinculos"
          #acoes
        >
          <Button
            :label="TEXTOS_FORNECEDORES_EVENTO.importar"
            icon="ie ie-importar"
            severity="secondary"
            outlined
            data-teste="importar-fornecedores"
            @click="importando = true"
          />
          <Button
            :label="TEXTOS_FORNECEDORES_EVENTO.adicionar"
            icon="ie ie-mais"
            data-teste="adicionar-fornecedor"
            @click="adicionar"
          />
        </template>
      </CabecalhoPagina>

      <div class="fornecedores-evento com-lateral pilha pilha--bloco">
        <MensagemFormulario
          v-if="arquivado && !visaoDoAnfitriao"
          variante="alerta"
          :mensagem="TEXTOS_FORNECEDORES_EVENTO.arquivado"
          data-teste="aviso-arquivado"
        />

        <EstadoCarregando
          v-if="store.carregando && !lista"
          variante="lista"
          :linhas="5"
        />

        <EstadoErro
          v-else-if="falha?.tipo === 'semPermissao'"
          :titulo="TEXTOS_FORNECEDORES_EVENTO.erroTitulo"
          :mensagem="TEXTOS_FORNECEDORES_EVENTO.semAcesso"
          :pode-tentar-novamente="false"
          variante="semPermissao"
        />

        <EstadoErro
          v-else-if="falha"
          :titulo="TEXTOS_FORNECEDORES_EVENTO.erroTitulo"
          :mensagem="TEXTOS_FORNECEDORES_EVENTO.erroTexto"
          @tentar-novamente="store.carregar(id)"
        />

        <div
          v-else-if="semVinculos"
          class="fornecedores-evento__corpo fornecedores-evento__corpo--vazio"
          :class="{ 'fornecedores-evento__corpo--sem-lateral': !tipoEvento }"
        >
          <EstadoVazio
            class="fornecedores-evento__principal"
            icone="fornecedor"
            :titulo="visaoDoAnfitriao ? TEXTOS_FORNECEDORES_EVENTO.vazioAnfitriaoTitulo : TEXTOS_FORNECEDORES_EVENTO.vazioTitulo"
            :descricao="visaoDoAnfitriao ? TEXTOS_FORNECEDORES_EVENTO.vazioAnfitriaoTexto : TEXTOS_FORNECEDORES_EVENTO.vazioTexto"
          >
            <template
              v-if="podeGerenciar"
              #acao
            >
              <div class="fornecedores-evento__acoes-vazio">
                <Button
                  :label="TEXTOS_FORNECEDORES_EVENTO.adicionar"
                  icon="ie ie-mais"
                  data-teste="adicionar-fornecedor-vazio"
                  @click="adicionar"
                />
                <Button
                  :label="TEXTOS_FORNECEDORES_EVENTO.importar"
                  icon="ie ie-importar"
                  severity="secondary"
                  outlined
                  data-teste="importar-fornecedores-vazio"
                  @click="importando = true"
                />
              </div>
            </template>
          </EstadoVazio>

          <ContratacaoFornecedoresEvento
            v-if="tipoEvento"
            class="fornecedores-evento__contratacao"
            :vinculos="lista?.vinculos ?? []"
            :tipo="tipoEvento"
          />
        </div>

        <div
          v-else-if="lista"
          class="fornecedores-evento__corpo"
        >
          <div
            class="fornecedores-evento__orcamento"
            data-teste="lateral-orcamento"
          >
            <ResumoOrcamento :resumo="lista.resumo" />
          </div>

          <div class="fornecedores-evento__principal pilha pilha--bloco">
            <div
              class="fornecedores-evento__grupos pilha pilha--cartao"
              data-teste="lista-vinculos"
            >
              <section
                v-for="grupo in grupos"
                :key="grupo.categoria"
                class="fornecedores-evento__grupo pilha pilha--campo"
                :aria-labelledby="`grupo-vinculos-${grupo.categoria}`"
                :data-teste="`grupo-${grupo.categoria}`"
              >
                <h2
                  :id="`grupo-vinculos-${grupo.categoria}`"
                  class="fornecedores-evento__titulo-grupo texto-rotulo"
                >
                  {{ ROTULOS_CATEGORIA_FORNECEDOR[grupo.categoria] }}
                  <span class="fornecedores-evento__contagem">{{ TEXTOS_FORNECEDORES_EVENTO.quantidadeGrupo(grupo.vinculos.length) }}</span>
                </h2>
                <ul
                  class="fornecedores-evento__lista cartao"
                  :aria-labelledby="`grupo-vinculos-${grupo.categoria}`"
                >
                  <LinhaFornecedorEvento
                    v-for="vinculo in grupo.vinculos"
                    :key="vinculo.id"
                    :nome-empresa="vinculo.fornecedor.nomeEmpresa"
                    :status="vinculo.status"
                    :servico="vinculo.servico"
                    :valor-orcado="vinculo.valorOrcado"
                    :valor-contratado="vinculo.valorContratado"
                    :possui-contrato="vinculo.contrato !== null"
                    :destino="destinoEdicao(vinculo)"
                    :fornecedor-arquivado="vinculo.fornecedor.arquivado && !visaoDoAnfitriao"
                    :telefone="vinculo.fornecedor.telefone"
                    :email="vinculo.fornecedor.email"
                    :site="vinculo.fornecedor.site"
                    :instagram="vinculo.fornecedor.instagram"
                    :parcelas="vinculo.parcelas ?? null"
                  >
                    <template
                      v-if="podeGerenciar"
                      #acoes
                    >
                      <MenuAcoes
                        :itens="acoesDoVinculo(vinculo)"
                        :rotulo="TEXTOS_FORNECEDORES_EVENTO.maisAcoes"
                        :rotulo-acessivel="TEXTOS_FORNECEDORES_EVENTO.maisAcoesAria(vinculo.fornecedor.nomeEmpresa)"
                        :desabilitado="vinculoEmAndamento !== null"
                        somente-icone
                        @selecionar="executarAcao(vinculo, $event)"
                      />
                    </template>
                    <template
                      v-else-if="vinculo.contrato"
                      #acoes
                    >
                      <Button
                        :label="TEXTOS_FORNECEDORES_EVENTO.menuBaixar"
                        icon="ie ie-exportar"
                        severity="secondary"
                        text
                        :loading="vinculoEmAndamento === vinculo.id"
                        :aria-label="TEXTOS_CONTRATO.baixarAria(vinculo.fornecedor.nomeEmpresa, 'PDF')"
                        data-teste="baixar-contrato-linha"
                        @click="baixar(vinculo)"
                      />
                    </template>
                  </LinhaFornecedorEvento>
                </ul>
              </section>
            </div>

            <p
              v-if="visaoDoAnfitriao"
              class="fornecedores-evento__rodape texto-legenda"
            >
              {{ TEXTOS_FORNECEDORES_EVENTO.rodapeAnfitriao }}
            </p>
          </div>

          <ContratacaoFornecedoresEvento
            v-if="tipoEvento"
            class="fornecedores-evento__contratacao"
            :vinculos="lista.vinculos"
            :tipo="tipoEvento"
          />
        </div>
      </div>

      <DialogoImportarFornecedores
        v-if="podeGerenciar"
        v-model:visivel="importando"
        :evento-id="id"
        @importado="aoImportar"
      />

      <DialogoConfirmacao
        :visivel="vinculoComParcelas !== null"
        :titulo="vinculoComParcelas ? TEXTOS_PARCELAS_FORNECEDOR.removerComParcelasTitulo(vinculoComParcelas.fornecedor.nomeEmpresa) : ''"
        :mensagem="TEXTOS_PARCELAS_FORNECEDOR.removerComParcelasTexto(vinculoComParcelas?.parcelas?.quantidade ?? 0)"
        :rotulo-confirmar="TEXTOS_PARCELAS_FORNECEDOR.irFinanceiro"
        :rotulo-cancelar="TEXTOS_FORNECEDORES_EVENTO.cancelar"
        data-teste="dialogo-vinculo-com-parcelas"
        @update:visivel="alterarVisibilidadeComParcelas"
        @confirmar="irParaFinanceiro"
      />

      <DialogoConfirmacao
        :visivel="vinculoRemocao !== null"
        :titulo="vinculoRemocao ? TEXTOS_FORNECEDORES_EVENTO.confirmarRemoverTitulo(vinculoRemocao.fornecedor.nomeEmpresa) : ''"
        :mensagem="TEXTOS_FORNECEDORES_EVENTO.confirmarRemoverTexto"
        :rotulo-confirmar="TEXTOS_FORNECEDORES_EVENTO.confirmarRemover"
        :rotulo-cancelar="TEXTOS_FORNECEDORES_EVENTO.cancelar"
        :executando="removendo"
        perigoso
        @update:visivel="alterarVisibilidadeRemocao"
        @confirmar="confirmarRemocao"
      />
    </template>
  </LayoutPainelUsuario>
</template>

<style scoped>
.fornecedores-evento {
  container: fornecedores-evento com-lateral / inline-size;
}

.fornecedores-evento__acoes-vazio {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--p-ritmo-campo);
}

.fornecedores-evento__corpo {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas:
    'orcamento'
    'principal'
    'contratacao';
  gap: var(--p-ritmo-bloco);
  align-items: start;
}

.fornecedores-evento__corpo--vazio {
  grid-template-areas:
    'principal'
    'contratacao';
}

.fornecedores-evento__orcamento {
  grid-area: orcamento;
  min-width: 0;
}

.fornecedores-evento__principal {
  grid-area: principal;
  min-width: 0;
}

.fornecedores-evento__contratacao {
  grid-area: contratacao;
  min-width: 0;
}

.fornecedores-evento .fornecedores-evento__titulo-grupo {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--p-ritmo-campo);
  margin: 0;
}

.fornecedores-evento__contagem {
  font-weight: var(--p-fonte-peso-regular);
  letter-spacing: normal;
  text-transform: none;
}

.fornecedores-evento .fornecedores-evento__lista {
  margin: 0;
  padding: 0;
  container: lista-vinculos / inline-size;
}

.fornecedores-evento__rodape {
  margin: 0;
}

.fornecedores-evento__voltar {
  display: inline-block;
  margin-top: var(--p-ritmo-grupo);
}

@container com-lateral (min-width: 52rem) {
  .fornecedores-evento__corpo {
    grid-template-columns: minmax(0, 1fr) var(--com-lateral-largura);
    grid-template-rows: auto 1fr;
    grid-template-areas:
      'principal orcamento'
      'principal contratacao';
  }

  .fornecedores-evento__corpo--vazio {
    grid-template-rows: auto;
    grid-template-areas: 'principal contratacao';
  }

  .fornecedores-evento__corpo--sem-lateral {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: 'principal';
  }
}
</style>
