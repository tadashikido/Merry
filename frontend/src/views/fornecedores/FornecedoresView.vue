<script setup lang="ts">
import { computed, onMounted, ref, useId } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'

import LayoutPainelUsuario from '@/layouts/LayoutPainelUsuario.vue'
import CabecalhoPagina from '@/componentes/base/CabecalhoPagina.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import EstadoVazio from '@/componentes/base/EstadoVazio.vue'
import IndiceCategorias from '@/componentes/base/IndiceCategorias.vue'
import LinhaFornecedor from '@/componentes/base/LinhaFornecedor.vue'
import MenuAcoes from '@/componentes/base/MenuAcoes.vue'
import CoberturaCategoriasFornecedores from '@/componentes/fornecedores/CoberturaCategoriasFornecedores.vue'
import type { ItemMenuAcoes } from '@/componentes/base/tipos'
import { useConfirmarExclusao } from '@/composables/useConfirmarExclusao'
import { useNotificacao } from '@/composables/useNotificacao'
import { useTelaPequena } from '@/composables/useTelaPequena'
import { useEventosStore } from '@/stores/eventos'
import { useFornecedoresStore } from '@/stores/fornecedores'
import { TEXTOS_FORNECEDORES } from '@/textos/fornecedores'
import type { CategoriaFornecedor, FornecedorResumoDto, SituacaoListagemFornecedores } from '@/tipos/fornecedores'
import { coberturaDaCarteira } from '@/utilitarios/coberturaFornecedores'
import { agruparPorCategoria, contarPorCategoria, daSituacao, filtrarFornecedores } from '@/utilitarios/fornecedores'

const store = useFornecedoresStore()
const eventos = useEventosStore()
const roteador = useRouter()
const notificacao = useNotificacao()
const { confirmarExclusao } = useConfirmarExclusao()
const telaPequena = useTelaPequena()

const idBusca = useId()
const idCategoria = useId()
const busca = ref('')
const categoria = ref<CategoriaFornecedor | null>(null)
const situacao = ref<SituacaoListagemFornecedores>('ativos')

const lista = computed(() => store.lista ?? [])
const daSituacaoAtual = computed(() => daSituacao(lista.value, situacao.value))
const contagens = computed(() => contarPorCategoria(daSituacaoAtual.value))
const filtrados = computed(() =>
  filtrarFornecedores(lista.value, { busca: busca.value, categoria: categoria.value, situacao: situacao.value }),
)
const grupos = computed(() => agruparPorCategoria(filtrados.value))
const quantidadeAtivos = computed(() => daSituacao(lista.value, 'ativos').length)
const quantidadeArquivados = computed(() => daSituacao(lista.value, 'arquivados').length)
const semNenhum = computed(() => store.lista !== null && store.lista.length === 0)
const filtroAtivo = computed(() => busca.value.trim() !== '' || categoria.value !== null)
const comIndice = computed(() => !telaPequena.value && daSituacaoAtual.value.length > 0)
const cobertura = computed(() => coberturaDaCarteira(lista.value, eventos.ativosCarregados ? eventos.ativos : null))
const anuncio = computed(() => (store.lista && filtroAtivo.value ? TEXTOS_FORNECEDORES.resultados(filtrados.value.length) : ''))

const opcoesSituacao = computed(() => [
  { valor: 'ativos', rotulo: TEXTOS_FORNECEDORES.ativos(quantidadeAtivos.value) },
  { valor: 'arquivados', rotulo: TEXTOS_FORNECEDORES.arquivados(quantidadeArquivados.value) },
])

const opcoesCategoria = computed(() => [
  { valor: null, rotulo: `${TEXTOS_FORNECEDORES.todas} (${daSituacaoAtual.value.length})` },
  ...contagens.value.map((item) => ({ valor: item.chave, rotulo: `${item.rotulo} (${item.quantidade})` })),
])

function acoes(fornecedor: FornecedorResumoDto): ItemMenuAcoes[] {
  return [
    ...(fornecedor.arquivado
      ? [{ chave: 'restaurar', rotulo: TEXTOS_FORNECEDORES.restaurar, icone: 'ie ie-restaurar' }]
      : [
          { chave: 'editar', rotulo: TEXTOS_FORNECEDORES.editar, icone: 'ie ie-editar' },
          { chave: 'arquivar', rotulo: TEXTOS_FORNECEDORES.arquivar, icone: 'ie ie-arquivar' },
        ]),
    { chave: 'excluir', rotulo: TEXTOS_FORNECEDORES.excluir, icone: 'ie ie-excluir', perigoso: true },
  ]
}

onMounted(() => {
  document.title = TEXTOS_FORNECEDORES.tituloDocumento
  void store.carregar()
  void eventos.garantirAtivos()
})

function adicionar() {
  void roteador.push({ name: 'fornecedor-novo' })
}

function limparFiltros() {
  busca.value = ''
  categoria.value = null
}

function alterarSituacao(nova: SituacaoListagemFornecedores) {
  situacao.value = nova
  categoria.value = null
}

async function arquivar(fornecedor: FornecedorResumoDto) {
  const resultado = await store.arquivar(fornecedor.id)
  if (!resultado.ok) {
    notificacao.erro(TEXTOS_FORNECEDORES.erroArquivar)
    return
  }
  notificacao.sucesso(TEXTOS_FORNECEDORES.toastArquivado(fornecedor.nomeEmpresa), {
    desfazer: () => restaurar(fornecedor),
  })
}

async function restaurar(fornecedor: FornecedorResumoDto) {
  const resultado = await store.restaurar(fornecedor.id)
  if (!resultado.ok) {
    notificacao.erro(TEXTOS_FORNECEDORES.erroRestaurar)
    return
  }
  notificacao.sucesso(TEXTOS_FORNECEDORES.toastRestaurado(fornecedor.nomeEmpresa))
}

function excluir(fornecedor: FornecedorResumoDto) {
  confirmarExclusao({
    nomeItem: fornecedor.nomeEmpresa,
    mensagem: TEXTOS_FORNECEDORES.confirmarExclusaoTexto,
    mensagemSucesso: TEXTOS_FORNECEDORES.toastExcluido(fornecedor.nomeEmpresa),
    aoConfirmar: async () => {
      const resultado = await store.remover(fornecedor.id)
      if (!resultado.ok) {
        notificacao.erro(TEXTOS_FORNECEDORES.erroExcluir)
        throw new Error(resultado.falha.tipo)
      }
    },
  })
}

function executarAcao(fornecedor: FornecedorResumoDto, chave: string) {
  if (chave === 'editar') {
    void roteador.push({ name: 'fornecedor-editar', params: { fornecedorId: fornecedor.id } })
    return
  }
  if (chave === 'arquivar') {
    void arquivar(fornecedor)
    return
  }
  if (chave === 'restaurar') {
    void restaurar(fornecedor)
    return
  }
  excluir(fornecedor)
}
</script>

<template>
  <LayoutPainelUsuario>
    <CabecalhoPagina
      :titulo="TEXTOS_FORNECEDORES.titulo"
      :descricao="TEXTOS_FORNECEDORES.subtitulo"
    >
      <template
        v-if="!store.falhaLista && !semNenhum"
        #acoes
      >
        <Button
          :label="TEXTOS_FORNECEDORES.adicionar"
          icon="ie ie-mais"
          data-teste="adicionar-fornecedor"
          @click="adicionar"
        />
      </template>
    </CabecalhoPagina>

    <div class="fornecedores com-lateral pilha pilha--bloco">
      <EstadoCarregando
        v-if="store.carregandoLista && !store.lista"
        variante="lista"
        :linhas="4"
      />

      <EstadoErro
        v-else-if="store.falhaLista?.tipo === 'semPermissao'"
        :titulo="TEXTOS_FORNECEDORES.erroTitulo"
        :mensagem="TEXTOS_FORNECEDORES.semAcesso"
        :pode-tentar-novamente="false"
        variante="semPermissao"
      />

      <EstadoErro
        v-else-if="store.falhaLista"
        :titulo="TEXTOS_FORNECEDORES.erroTitulo"
        :mensagem="TEXTOS_FORNECEDORES.erroTexto"
        @tentar-novamente="store.carregar()"
      />

      <div
        v-else-if="semNenhum"
        class="fornecedores__vazio pilha pilha--bloco"
      >
        <EstadoVazio
          icone="fornecedor"
          :titulo="TEXTOS_FORNECEDORES.vazioTitulo"
          :descricao="TEXTOS_FORNECEDORES.vazioTexto"
        >
          <template #acao>
            <Button
              :label="TEXTOS_FORNECEDORES.adicionar"
              icon="ie ie-mais"
              data-teste="adicionar-fornecedor-vazio"
              @click="adicionar"
            />
          </template>
        </EstadoVazio>
        <CoberturaCategoriasFornecedores
          :cobertura="cobertura"
          com-reaproveitamento
        />
      </div>

      <template v-else-if="store.lista">
        <div class="fornecedores__barra">
          <div class="fornecedores__busca">
            <label
              class="somente-leitor-tela"
              :for="idBusca"
            >{{ TEXTOS_FORNECEDORES.buscaRotulo }}</label>
            <IconField>
              <InputIcon
                class="ie ie-busca"
                aria-hidden="true"
              />
              <InputText
                :id="idBusca"
                v-model="busca"
                type="search"
                autocomplete="off"
                :placeholder="TEXTOS_FORNECEDORES.buscaPlaceholder"
                data-teste="busca-fornecedores"
              />
            </IconField>
          </div>
          <div
            v-if="telaPequena"
            class="fornecedores__categoria"
          >
            <label
              class="somente-leitor-tela"
              :for="idCategoria"
            >{{ TEXTOS_FORNECEDORES.categoriaRotulo }}</label>
            <Select
              v-model="categoria"
              :input-id="idCategoria"
              :options="opcoesCategoria"
              option-label="rotulo"
              option-value="valor"
              :placeholder="opcoesCategoria[0]?.rotulo"
              :aria-label="TEXTOS_FORNECEDORES.categoriaRotulo"
              data-teste="seletor-categoria"
            />
          </div>
          <SelectButton
            :model-value="situacao"
            :options="opcoesSituacao"
            option-label="rotulo"
            option-value="valor"
            :allow-empty="false"
            :aria-label="TEXTOS_FORNECEDORES.situacaoRotulo"
            data-teste="filtro-situacao"
            @update:model-value="alterarSituacao"
          />
        </div>

        <p
          class="somente-leitor-tela"
          aria-live="polite"
          data-teste="anuncio-resultados"
        >
          {{ anuncio }}
        </p>

        <div
          class="fornecedores__corpo"
          :class="{ 'fornecedores__corpo--com-indice': comIndice }"
        >
          <IndiceCategorias
            v-if="comIndice"
            v-model="categoria"
            class="fornecedores__indice"
            :itens="contagens"
            :rotulo="TEXTOS_FORNECEDORES.indiceRotulo"
            :rotulo-todas="TEXTOS_FORNECEDORES.todas"
            :total="daSituacaoAtual.length"
          />

          <div class="fornecedores__principal">
            <EstadoVazio
              v-if="daSituacaoAtual.length === 0"
              :icone="situacao === 'arquivados' ? 'arquivar' : 'fornecedor'"
              :titulo="situacao === 'arquivados' ? TEXTOS_FORNECEDORES.vazioArquivados : TEXTOS_FORNECEDORES.vazioTitulo"
              :descricao="situacao === 'arquivados' ? TEXTOS_FORNECEDORES.vazioArquivadosTexto : TEXTOS_FORNECEDORES.vazioTexto"
            />

            <EstadoVazio
              v-else-if="filtrados.length === 0"
              icone="busca"
              :titulo="TEXTOS_FORNECEDORES.semResultado"
              :descricao="TEXTOS_FORNECEDORES.semResultadoTexto"
            >
              <template #acao>
                <Button
                  :label="TEXTOS_FORNECEDORES.limparFiltros"
                  severity="secondary"
                  outlined
                  data-teste="limpar-filtros"
                  @click="limparFiltros"
                />
              </template>
            </EstadoVazio>

            <div
              v-else
              class="fornecedores__grupos pilha pilha--cartao"
              data-teste="lista-fornecedores"
            >
              <section
                v-for="grupo in grupos"
                :key="grupo.categoria"
                class="fornecedores__grupo pilha pilha--campo"
                :aria-labelledby="`grupo-${grupo.categoria}`"
                data-teste="grupo-categoria"
              >
                <h2
                  :id="`grupo-${grupo.categoria}`"
                  class="fornecedores__grupo-titulo texto-rotulo"
                >
                  {{ grupo.rotulo }}
                  <span class="fornecedores__grupo-quantidade">{{ TEXTOS_FORNECEDORES.quantidadeGrupo(grupo.fornecedores.length) }}</span>
                </h2>
                <ul
                  class="fornecedores__lista cartao"
                  :aria-labelledby="`grupo-${grupo.categoria}`"
                >
                  <LinhaFornecedor
                    v-for="fornecedor in grupo.fornecedores"
                    :key="fornecedor.id"
                    :nome-empresa="fornecedor.nomeEmpresa"
                    :destino="{ name: 'fornecedor', params: { fornecedorId: fornecedor.id } }"
                    :responsavel="fornecedor.responsavel"
                    :telefone="fornecedor.telefone"
                    :email="fornecedor.email"
                    :site="fornecedor.site"
                    :instagram="fornecedor.instagram"
                    :arquivado="fornecedor.arquivado"
                    :rotulo-arquivado="TEXTOS_FORNECEDORES.badgeArquivado"
                  >
                    <template #acoes>
                      <MenuAcoes
                        :itens="acoes(fornecedor)"
                        :rotulo="TEXTOS_FORNECEDORES.maisAcoes"
                        :rotulo-acessivel="TEXTOS_FORNECEDORES.maisAcoesAria(fornecedor.nomeEmpresa)"
                        somente-icone
                        @selecionar="executarAcao(fornecedor, $event)"
                      />
                    </template>
                  </LinhaFornecedor>
                </ul>
              </section>
            </div>
          </div>

          <CoberturaCategoriasFornecedores
            v-if="situacao !== 'arquivados'"
            class="fornecedores__cobertura"
            :cobertura="cobertura"
            :limite="3"
          />
        </div>
      </template>
    </div>
  </LayoutPainelUsuario>
</template>

<style scoped>
.fornecedores {
  container: fornecedores com-lateral / inline-size;
}

.fornecedores__barra {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-ritmo-grupo);
}

.fornecedores__busca {
  flex: 1 1 16rem;
  max-width: 28rem;
}

.fornecedores__busca :deep(.p-iconfield),
.fornecedores__busca :deep(.p-inputtext),
.fornecedores__categoria :deep(.p-select) {
  width: 100%;
  min-height: var(--p-dimensao-alvo-toque);
}

.fornecedores__categoria {
  flex: 1 1 14rem;
}

.fornecedores__corpo {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-bloco);
  align-items: start;
}

.fornecedores__indice,
.fornecedores__principal,
.fornecedores__cobertura {
  min-width: 0;
}

.fornecedores .fornecedores__grupo-titulo {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--p-ritmo-campo);
  margin: 0;
}

.fornecedores__grupo-quantidade {
  font-weight: var(--p-fonte-peso-regular);
  letter-spacing: normal;
  text-transform: none;
}

.fornecedores .fornecedores__lista {
  margin: 0;
  padding: 0;
  list-style: none;
  container: lista-fornecedores / inline-size;
}

@container com-lateral (min-width: 52rem) {
  .fornecedores__corpo {
    grid-template-columns: var(--com-lateral-largura) minmax(0, 1fr);
    grid-template-rows: auto 1fr;
    grid-template-areas:
      'cobertura principal'
      'vago principal';
  }

  .fornecedores__corpo--com-indice {
    grid-template-areas:
      'indice principal'
      'cobertura principal';
  }

  .fornecedores__indice {
    grid-area: indice;
    padding: var(--p-ritmo-campo);
  }

  .fornecedores__principal {
    grid-area: principal;
  }

  .fornecedores__cobertura {
    grid-area: cobertura;
  }
}
</style>
