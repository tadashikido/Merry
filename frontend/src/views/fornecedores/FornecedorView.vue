<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Button from 'primevue/button'

import LayoutPainelUsuario from '@/layouts/LayoutPainelUsuario.vue'
import BadgeStatus from '@/componentes/base/BadgeStatus.vue'
import CabecalhoPagina from '@/componentes/base/CabecalhoPagina.vue'
import CanaisContato from '@/componentes/base/CanaisContato.vue'
import DialogoConfirmacao from '@/componentes/base/DialogoConfirmacao.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import EstadoVazio from '@/componentes/base/EstadoVazio.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import MenuAcoes from '@/componentes/base/MenuAcoes.vue'
import type { ItemMenuAcoes } from '@/componentes/base/tipos'
import { useConfirmarExclusao } from '@/composables/useConfirmarExclusao'
import { useNotificacao } from '@/composables/useNotificacao'
import { useFornecedoresStore } from '@/stores/fornecedores'
import { ROTULOS_CATEGORIA_FORNECEDOR, TEXTOS_FORNECEDORES } from '@/textos/fornecedores'
import { ROTULOS_STATUS_FORNECEDOR_CASAMENTO, TEXTOS_HISTORICO_FORNECEDOR } from '@/textos/fornecedoresCasamento'
import type { FornecedorDto } from '@/tipos/fornecedores'
import { formatarData, formatarDataCalendarioCurta, formatarNomesCasal } from '@/utilitarios/formatacao'
import { possuiContato } from '@/utilitarios/fornecedores'
import { VARIANTES_STATUS_FORNECEDOR_CASAMENTO } from '@/utilitarios/fornecedoresCasamento'

const props = defineProps<{ fornecedorId: string }>()

const store = useFornecedoresStore()
const roteador = useRouter()
const notificacao = useNotificacao()
const { confirmarExclusao } = useConfirmarExclusao()

const fornecedor = computed(() => (store.atual?.id === props.fornecedorId ? store.atual : null))
const falha = computed(() => (fornecedor.value ? null : store.falhaAtual))
const temContato = computed(() => (fornecedor.value ? possuiContato(fornecedor.value) : false))
const participacoes = computed(() => (store.participacoesDe === props.fornecedorId ? store.participacoes : null))
const falhaParticipacoes = computed(() => (store.participacoesDe === props.fornecedorId ? store.falhaParticipacoes : null))
const exclusaoBloqueada = ref(false)

const acoes = computed<ItemMenuAcoes[]>(() => [
  fornecedor.value?.arquivado
    ? { chave: 'restaurar', rotulo: TEXTOS_FORNECEDORES.restaurar, icone: 'ie ie-restaurar' }
    : { chave: 'arquivar', rotulo: TEXTOS_FORNECEDORES.arquivar, icone: 'ie ie-arquivar' },
  { chave: 'excluir', rotulo: TEXTOS_FORNECEDORES.excluir, icone: 'ie ie-excluir', perigoso: true },
])

onMounted(() => {
  document.title = TEXTOS_FORNECEDORES.tituloDetalhe
})

watch(
  () => props.fornecedorId,
  (id) => {
    void store.carregarAtual(id)
    void store.carregarParticipacoes(id)
  },
  { immediate: true },
)

function editar() {
  void roteador.push({ name: 'fornecedor-editar', params: { fornecedorId: props.fornecedorId } })
}

async function arquivar(atual: FornecedorDto) {
  const resultado = await store.arquivar(atual.id)
  if (!resultado.ok) {
    notificacao.erro(TEXTOS_FORNECEDORES.erroArquivar)
    return
  }
  notificacao.sucesso(TEXTOS_FORNECEDORES.toastArquivado(atual.nomeEmpresa), {
    desfazer: () => restaurar(atual),
  })
}

async function restaurar(atual: FornecedorDto) {
  const resultado = await store.restaurar(atual.id)
  if (!resultado.ok) {
    notificacao.erro(TEXTOS_FORNECEDORES.erroRestaurar)
    return
  }
  notificacao.sucesso(TEXTOS_FORNECEDORES.toastRestaurado(atual.nomeEmpresa))
}

function excluir(atual: FornecedorDto) {
  confirmarExclusao({
    nomeItem: atual.nomeEmpresa,
    mensagem: TEXTOS_FORNECEDORES.confirmarExclusaoTexto,
    mensagemSucesso: TEXTOS_FORNECEDORES.toastExcluido(atual.nomeEmpresa),
    aoConfirmar: async () => {
      const resultado = await store.remover(atual.id)
      if (!resultado.ok) {
        notificacao.erro(
          resultado.falha.tipo === 'regra' && resultado.falha.mensagem ? resultado.falha.mensagem : TEXTOS_FORNECEDORES.erroExcluir,
        )
        throw new Error(resultado.falha.tipo)
      }
      await roteador.replace({ name: 'fornecedores' })
    },
  })
}

function executarAcao(chave: string) {
  const atual = fornecedor.value
  if (!atual) {
    return
  }
  if (chave === 'arquivar') {
    void arquivar(atual)
    return
  }
  if (chave === 'restaurar') {
    void restaurar(atual)
    return
  }
  if ((participacoes.value?.length ?? 0) > 0) {
    exclusaoBloqueada.value = true
    return
  }
  excluir(atual)
}

function arquivarEmVezDeExcluir() {
  exclusaoBloqueada.value = false
  if (fornecedor.value && !fornecedor.value.arquivado) {
    void arquivar(fornecedor.value)
  }
}
</script>

<template>
  <LayoutPainelUsuario>
    <div
      v-if="falha?.tipo === 'naoEncontrado'"
      class="pilha pilha--bloco"
    >
      <EstadoErro
        :titulo="TEXTOS_FORNECEDORES.naoEncontradoTitulo"
        :mensagem="TEXTOS_FORNECEDORES.naoEncontradoTexto"
        :pode-tentar-novamente="false"
      />
      <RouterLink
        class="fornecedor__voltar"
        :to="{ name: 'fornecedores' }"
        data-teste="voltar"
      >
        {{ TEXTOS_FORNECEDORES.voltar }}
      </RouterLink>
    </div>

    <template v-else>
      <CabecalhoPagina :titulo="fornecedor?.nomeEmpresa ?? TEXTOS_FORNECEDORES.tituloDetalhe">
        <template
          v-if="fornecedor"
          #detalhes
        >
          <span
            class="fornecedor__detalhes"
            data-teste="resumo-fornecedor"
          >
            <span>{{ ROTULOS_CATEGORIA_FORNECEDOR[fornecedor.categoria] }}</span>
            <span v-if="fornecedor.responsavel">{{ fornecedor.responsavel }}</span>
            <BadgeStatus
              v-if="fornecedor.arquivado"
              :texto="TEXTOS_FORNECEDORES.badgeArquivado"
              variante="neutro"
              icone="arquivar"
            />
          </span>
        </template>
        <template
          v-if="fornecedor"
          #acoes
        >
          <Button
            v-if="!fornecedor.arquivado"
            :label="TEXTOS_FORNECEDORES.editar"
            icon="ie ie-editar"
            data-teste="editar-fornecedor"
            @click="editar"
          />
          <MenuAcoes
            :itens="acoes"
            :rotulo="TEXTOS_FORNECEDORES.maisAcoes"
            :rotulo-acessivel="TEXTOS_FORNECEDORES.maisAcoesAria(fornecedor.nomeEmpresa)"
            @selecionar="executarAcao"
          />
        </template>
      </CabecalhoPagina>

      <div class="fornecedor pilha pilha--bloco">
        <EstadoCarregando
          v-if="store.carregandoAtual && !fornecedor"
          variante="cartao"
          :linhas="3"
        />

        <EstadoErro
          v-else-if="falha?.tipo === 'semPermissao'"
          :titulo="TEXTOS_FORNECEDORES.erroDetalheTitulo"
          :mensagem="TEXTOS_FORNECEDORES.semAcesso"
          :pode-tentar-novamente="false"
          variante="semPermissao"
        />

        <EstadoErro
          v-else-if="falha"
          :titulo="TEXTOS_FORNECEDORES.erroDetalheTitulo"
          :mensagem="TEXTOS_FORNECEDORES.erroTexto"
          @tentar-novamente="store.carregarAtual(fornecedorId)"
        />

        <template v-else-if="fornecedor">
          <MensagemFormulario
            v-if="fornecedor.arquivado"
            variante="alerta"
            :mensagem="TEXTOS_FORNECEDORES.arquivadoFaixa"
            data-teste="faixa-arquivado"
          >
            <Button
              :label="TEXTOS_FORNECEDORES.restaurar"
              icon="ie ie-restaurar"
              severity="secondary"
              outlined
              size="small"
              data-teste="restaurar-fornecedor"
              @click="restaurar(fornecedor)"
            />
          </MensagemFormulario>

          <div class="fornecedor__corpo">
            <aside
              class="fornecedor__ficha pilha pilha--bloco"
              data-teste="ficha-fornecedor"
            >
              <section
                class="pilha pilha--campo"
                aria-labelledby="fornecedor-contato"
              >
                <h2
                  id="fornecedor-contato"
                  class="fornecedor__titulo-bloco texto-rotulo"
                >
                  {{ TEXTOS_FORNECEDORES.contato }}
                </h2>
                <div class="fornecedor__cartao cartao">
                  <CanaisContato
                    v-if="temContato"
                    :nome="fornecedor.nomeEmpresa"
                    :telefone="fornecedor.telefone"
                    :email="fornecedor.email"
                    :site="fornecedor.site"
                    :instagram="fornecedor.instagram"
                    variante="completa"
                  />
                  <p
                    v-else
                    class="fornecedor__apoio"
                    data-teste="sem-contato"
                  >
                    {{ TEXTOS_FORNECEDORES.semContato }}
                  </p>
                </div>
              </section>

              <section
                class="pilha pilha--campo"
                aria-labelledby="fornecedor-observacoes"
              >
                <h2
                  id="fornecedor-observacoes"
                  class="fornecedor__titulo-bloco texto-rotulo"
                >
                  {{ TEXTOS_FORNECEDORES.observacoes }}
                </h2>
                <div class="fornecedor__cartao cartao pilha pilha--campo">
                  <p class="fornecedor__texto texto-legenda">
                    {{ TEXTOS_FORNECEDORES.observacoesApoio }}
                  </p>
                  <p
                    v-if="fornecedor.observacoes"
                    class="fornecedor__observacoes fornecedor__texto texto-corrido"
                    data-teste="observacoes"
                  >
                    {{ fornecedor.observacoes }}
                  </p>
                  <p
                    v-else
                    class="fornecedor__apoio"
                  >
                    {{ TEXTOS_FORNECEDORES.semObservacoes }}
                  </p>
                </div>
              </section>

              <p
                class="fornecedor__texto texto-legenda numeros-tabulares"
                data-teste="datas-fornecedor"
              >
                {{ TEXTOS_FORNECEDORES.cadastro(formatarData(fornecedor.criadoEm), formatarData(fornecedor.atualizadoEm)) }}
              </p>
            </aside>

            <section
              class="fornecedor__historico-secao pilha pilha--campo"
              aria-labelledby="fornecedor-historico"
              data-teste="historico-casamentos"
            >
              <h2
                id="fornecedor-historico"
                class="fornecedor__titulo-bloco texto-rotulo"
              >
                {{ TEXTOS_FORNECEDORES.historicoTitulo }}
              </h2>
              <p
                v-if="store.carregandoParticipacoes && !participacoes"
                class="fornecedor__cartao cartao fornecedor__apoio"
              >
                {{ TEXTOS_HISTORICO_FORNECEDOR.carregando }}
              </p>
              <div
                v-else-if="falhaParticipacoes"
                class="fornecedor__cartao cartao fornecedor__historico-erro"
                data-teste="erro-historico"
              >
                <p class="fornecedor__apoio">
                  {{ TEXTOS_HISTORICO_FORNECEDOR.erro }}
                </p>
                <Button
                  :label="TEXTOS_HISTORICO_FORNECEDOR.tentarNovamente"
                  severity="secondary"
                  text
                  size="small"
                  @click="store.carregarParticipacoes(fornecedorId)"
                />
              </div>
              <ul
                v-else-if="participacoes && participacoes.length > 0"
                class="fornecedor__historico cartao"
                :aria-label="TEXTOS_HISTORICO_FORNECEDOR.listaRotulo"
                data-teste="lista-historico"
              >
                <li
                  v-for="participacao in participacoes"
                  :key="participacao.casamentoId"
                  class="fornecedor__participacao"
                >
                  <RouterLink
                    :to="{ name: 'casamento-fornecedores', params: { id: participacao.casamentoId } }"
                    class="fornecedor__participacao-nomes"
                  >
                    {{ formatarNomesCasal(participacao.nomePrimeiraPessoa, participacao.nomeSegundaPessoa) }}
                  </RouterLink>
                  <span class="fornecedor__participacao-data numeros-tabulares">{{ formatarDataCalendarioCurta(participacao.dataCasamento) }}</span>
                  <span class="fornecedor__participacao-selos">
                    <BadgeStatus
                      :texto="ROTULOS_STATUS_FORNECEDOR_CASAMENTO[participacao.status]"
                      :variante="VARIANTES_STATUS_FORNECEDOR_CASAMENTO[participacao.status]"
                    />
                    <BadgeStatus
                      v-if="participacao.casamentoArquivado"
                      :texto="TEXTOS_HISTORICO_FORNECEDOR.casamentoArquivado"
                      variante="neutro"
                      icone="arquivar"
                    />
                  </span>
                </li>
              </ul>
              <div
                v-else
                class="fornecedor__cartao cartao"
              >
                <EstadoVazio
                  icone="casamento"
                  :titulo="TEXTOS_FORNECEDORES.historicoVazioTitulo"
                  :descricao="TEXTOS_FORNECEDORES.historicoVazioTexto"
                />
              </div>
            </section>
          </div>
        </template>
      </div>

      <DialogoConfirmacao
        :visivel="exclusaoBloqueada"
        :titulo="fornecedor ? TEXTOS_FORNECEDORES.excluirTitulo(fornecedor.nomeEmpresa) : ''"
        :mensagem="TEXTOS_HISTORICO_FORNECEDOR.excluirBloqueado(participacoes?.length ?? 0)"
        :rotulo-confirmar="TEXTOS_FORNECEDORES.arquivar"
        :rotulo-cancelar="TEXTOS_FORNECEDORES.cancelar"
        @update:visivel="exclusaoBloqueada = $event"
        @confirmar="arquivarEmVezDeExcluir"
      />
    </template>
  </LayoutPainelUsuario>
</template>

<style scoped>
.fornecedor {
  --fornecedor-largura-ficha: 20rem;
  --fornecedor-largura-data: 6rem;
  --fornecedor-largura-selos: 14rem;

  container: fornecedor / inline-size;
}

.fornecedor__detalhes {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-ritmo-campo) var(--p-ritmo-grupo);
}

.fornecedor__corpo {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-bloco);
  align-items: start;
}

.fornecedor__ficha,
.fornecedor__historico-secao {
  min-width: 0;
}

.fornecedor .fornecedor__titulo-bloco,
.fornecedor .fornecedor__texto {
  margin: 0;
}

.fornecedor__cartao {
  min-width: 0;
}

.fornecedor__apoio {
  margin: 0;
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.fornecedor__observacoes {
  color: var(--p-cor-texto);
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.fornecedor .fornecedor__historico {
  margin: 0;
  padding-block: 0;
  list-style: none;
  container: historico-fornecedor / inline-size;
}

.fornecedor__participacao {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-ritmo-campo) var(--p-ritmo-grupo);
  padding-block: var(--p-ritmo-grupo);
}

.fornecedor__participacao + .fornecedor__participacao {
  border-top: 1px solid var(--p-cor-divisoria);
}

.fornecedor__participacao-nomes {
  flex: 1 1 100%;
  min-width: 0;
  font-weight: var(--p-fonte-peso-seminegrito);
  overflow-wrap: anywhere;
}

.fornecedor__participacao-data {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.fornecedor__participacao-selos {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--p-ritmo-campo);
}

.fornecedor__historico-erro {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-ritmo-campo);
}

.fornecedor__voltar {
  align-self: flex-start;
}

@container fornecedor (min-width: 40rem) and (max-width: 63.99rem) {
  .fornecedor__ficha {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--p-ritmo-bloco) var(--p-ritmo-cartao);
  }

  .fornecedor__ficha > :last-child {
    grid-column: 1 / -1;
  }
}

@container historico-fornecedor (min-width: 36rem) {
  .fornecedor__participacao {
    display: grid;
    grid-template-columns: minmax(0, 1fr) var(--fornecedor-largura-data) var(--fornecedor-largura-selos);
  }

  .fornecedor__participacao-selos {
    justify-content: flex-end;
  }
}

@container fornecedor (min-width: 64rem) {
  .fornecedor__corpo {
    grid-template-columns: var(--fornecedor-largura-ficha) minmax(0, 1fr);
  }

  .fornecedor__ficha {
    position: sticky;
    top: var(--p-ritmo-bloco);
    max-height: calc(100dvh - 2 * var(--p-ritmo-bloco));
    overflow-y: auto;
    padding: var(--p-ritmo-campo);
    overscroll-behavior: contain;
  }

  .fornecedor__historico-secao {
    padding-block-start: var(--p-ritmo-campo);
  }
}
</style>
