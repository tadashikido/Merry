<script setup lang="ts">
import { computed, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Button from 'primevue/button'

import LayoutPainelUsuario from '@/layouts/LayoutPainelUsuario.vue'
import BadgeStatus from '@/componentes/base/BadgeStatus.vue'
import CabecalhoPagina from '@/componentes/base/CabecalhoPagina.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import EstadoVazio from '@/componentes/base/EstadoVazio.vue'
import ItemModeloChecklist from '@/componentes/base/ItemModeloChecklist.vue'
import MenuAcoes from '@/componentes/base/MenuAcoes.vue'
import ReguaMarcos from '@/componentes/base/ReguaMarcos.vue'
import type { ItemMenuAcoes, MarcoRegua } from '@/componentes/base/tipos'
import { useConfirmarExclusao } from '@/composables/useConfirmarExclusao'
import { useNotificacao } from '@/composables/useNotificacao'
import { useModelosChecklistStore } from '@/stores/modelosChecklist'
import {
  COMPLEMENTO_MARCO_CHECKLIST,
  ROTULOS_MARCO_CHECKLIST,
  TEXTOS_MODELOS_CHECKLIST,
  descreverPrazoRelativo,
} from '@/textos/checklist'
import { ROTULOS_CATEGORIA_TAREFA, ROTULOS_RESPONSAVEL_TAREFA } from '@/textos/tarefas'
import type { ItemModeloChecklistDto } from '@/tipos/checklist'
import { RESPONSAVEIS_TAREFA } from '@/tipos/tarefas'
import { agruparPorMarco } from '@/utilitarios/checklist'

const props = defineProps<{ modeloId: string }>()

const store = useModelosChecklistStore()
const roteador = useRouter()
const notificacao = useNotificacao()
const { confirmarExclusao } = useConfirmarExclusao()

const modelo = computed(() => (store.atual?.id === props.modeloId ? store.atual : null))
const falha = computed(() => (modelo.value ? null : store.falhaAtual))
const grupos = computed(() => agruparPorMarco(modelo.value?.itens ?? [], (item) => item.diasAntesDoEvento))
const marcos = computed<MarcoRegua[]>(() =>
  grupos.value.map((grupo) => ({
    chave: grupo.marco,
    rotulo: ROTULOS_MARCO_CHECKLIST[grupo.marco],
    complemento: COMPLEMENTO_MARCO_CHECKLIST[grupo.marco],
    detalhe: TEXTOS_MODELOS_CHECKLIST.resumoItens(grupo.itens.length),
  })),
)

const porResponsavel = computed(() =>
  RESPONSAVEIS_TAREFA.map((responsavel) => ({
    chave: responsavel,
    rotulo: ROTULOS_RESPONSAVEL_TAREFA[responsavel],
    quantidade: modelo.value?.itens.filter((item) => item.responsavel === responsavel).length ?? 0,
  })).filter((grupo) => grupo.quantidade > 0),
)

const acoesItem: ItemMenuAcoes[] = [
  { chave: 'editar', rotulo: TEXTOS_MODELOS_CHECKLIST.itemEditar, icone: 'ie ie-editar' },
  { chave: 'excluir', rotulo: TEXTOS_MODELOS_CHECKLIST.itemExcluir, icone: 'ie ie-excluir', perigoso: true },
]

watch(
  () => props.modeloId,
  (id) => {
    void store.carregar(id)
  },
  { immediate: true },
)

watch(
  () => modelo.value?.nome,
  (nome) => {
    if (nome) {
      document.title = nome
    }
  },
  { immediate: true },
)

function itensDoMarco(chave: string): ItemModeloChecklistDto[] {
  return grupos.value.find((grupo) => grupo.marco === chave)?.itens ?? []
}

function metadados(item: ItemModeloChecklistDto): string[] {
  const itens = [ROTULOS_RESPONSAVEL_TAREFA[item.responsavel]]
  if (item.categoria !== 'Geral') {
    itens.push(ROTULOS_CATEGORIA_TAREFA[item.categoria])
  }
  return itens
}

function adicionarItem() {
  void roteador.push({ name: 'item-modelo-novo', params: { modeloId: props.modeloId } })
}

function editarModelo() {
  void roteador.push({ name: 'modelo-checklist-editar', params: { modeloId: props.modeloId } })
}

function executarAcao(item: ItemModeloChecklistDto, chave: string) {
  if (chave === 'editar') {
    void roteador.push({ name: 'item-modelo-editar', params: { modeloId: props.modeloId, itemId: item.id } })
    return
  }
  confirmarExclusao({
    nomeItem: item.titulo,
    mensagem: TEXTOS_MODELOS_CHECKLIST.itemConfirmarExclusaoTexto,
    mensagemSucesso: TEXTOS_MODELOS_CHECKLIST.itemToastExcluido,
    aoConfirmar: async () => {
      const resultado = await store.removerItem(props.modeloId, item.id)
      if (!resultado.ok) {
        notificacao.erro(TEXTOS_MODELOS_CHECKLIST.erroExcluir)
        throw new Error(resultado.falha.tipo)
      }
    },
  })
}
</script>

<template>
  <LayoutPainelUsuario>
    <div
      v-if="falha?.tipo === 'naoEncontrado'"
      class="pilha pilha--grupo"
    >
      <EstadoErro
        :titulo="TEXTOS_MODELOS_CHECKLIST.naoEncontradoTitulo"
        :mensagem="TEXTOS_MODELOS_CHECKLIST.naoEncontradoTexto"
        :pode-tentar-novamente="false"
      />
      <RouterLink
        class="modelo__voltar"
        :to="{ name: 'modelos-checklist' }"
        data-teste="voltar"
      >
        {{ TEXTOS_MODELOS_CHECKLIST.voltarModelos }}
      </RouterLink>
    </div>

    <template v-else>
      <CabecalhoPagina
        :titulo="modelo?.nome ?? TEXTOS_MODELOS_CHECKLIST.titulo"
        :descricao="modelo?.descricao ?? undefined"
      >
        <template
          v-if="modelo"
          #detalhes
        >
          <p
            class="modelo__detalhes texto-legenda"
            data-teste="resumo-modelo"
          >
            <BadgeStatus
              v-if="modelo.sugerido"
              :texto="TEXTOS_MODELOS_CHECKLIST.sugerido"
              variante="informacao"
              icone="informacao"
            />
            <span>{{ TEXTOS_MODELOS_CHECKLIST.resumoItens(modelo.itens.length) }}</span>
          </p>
        </template>
        <template
          v-if="modelo"
          #acoes
        >
          <Button
            :label="TEXTOS_MODELOS_CHECKLIST.editar"
            icon="ie ie-editar"
            severity="secondary"
            outlined
            data-teste="editar-modelo"
            @click="editarModelo"
          />
          <Button
            :label="TEXTOS_MODELOS_CHECKLIST.adicionarItem"
            icon="ie ie-mais"
            data-teste="adicionar-item"
            @click="adicionarItem"
          />
        </template>
      </CabecalhoPagina>

      <div class="modelo pilha pilha--bloco">
        <EstadoCarregando
          v-if="store.carregandoAtual && !modelo"
          variante="lista"
          :linhas="5"
        />

        <EstadoErro
          v-else-if="falha?.tipo === 'semPermissao'"
          :titulo="TEXTOS_MODELOS_CHECKLIST.erroTitulo"
          :mensagem="TEXTOS_MODELOS_CHECKLIST.semAcesso"
          :pode-tentar-novamente="false"
          variante="semPermissao"
        />

        <EstadoErro
          v-else-if="falha"
          :titulo="TEXTOS_MODELOS_CHECKLIST.erroTitulo"
          :mensagem="TEXTOS_MODELOS_CHECKLIST.erroTexto"
          @tentar-novamente="store.carregar(modeloId)"
        />

        <EstadoVazio
          v-else-if="modelo && modelo.itens.length === 0"
          icone="lista"
          :titulo="TEXTOS_MODELOS_CHECKLIST.itensVazioTitulo"
          :descricao="TEXTOS_MODELOS_CHECKLIST.itensVazioTexto"
        >
          <template #acao>
            <Button
              :label="TEXTOS_MODELOS_CHECKLIST.adicionarItem"
              icon="ie ie-mais"
              severity="secondary"
              outlined
              data-teste="adicionar-item-vazio"
              @click="adicionarItem"
            />
          </template>
        </EstadoVazio>

        <div
          v-else-if="modelo"
          class="modelo__corpo"
        >
          <aside
            class="modelo__lateral pilha pilha--grupo"
            aria-labelledby="titulo-resumo-modelo"
            data-teste="lateral-modelo"
          >
            <section class="modelo__resumo cartao">
              <div class="modelo__geral pilha pilha--campo">
                <h2
                  id="titulo-resumo-modelo"
                  class="texto-rotulo"
                >
                  {{ TEXTOS_MODELOS_CHECKLIST.resumoTitulo }}
                </h2>
                <p
                  class="modelo__total numeros-tabulares"
                  data-teste="total-itens-modelo"
                >
                  {{ TEXTOS_MODELOS_CHECKLIST.resumoItens(modelo.itens.length) }}
                </p>
                <p class="modelo__nota texto-legenda">
                  {{ TEXTOS_MODELOS_CHECKLIST.notaAplicacao }}
                </p>
              </div>

              <div
                class="modelo__bloco modelo__bloco--por-marco pilha pilha--campo"
                data-teste="resumo-por-marco"
              >
                <h3
                  id="titulo-por-marco-modelo"
                  class="texto-rotulo"
                >
                  {{ TEXTOS_MODELOS_CHECKLIST.porMarcoTitulo }}
                </h3>
                <dl
                  class="modelo__contagens"
                  aria-labelledby="titulo-por-marco-modelo"
                >
                  <div
                    v-for="marco in marcos"
                    :key="marco.chave"
                    class="modelo__contagem"
                    :data-teste="`resumo-marco-${marco.chave}`"
                  >
                    <dt>{{ marco.rotulo }}</dt>
                    <dd class="numeros-tabulares">
                      {{ itensDoMarco(marco.chave).length }}
                    </dd>
                  </div>
                </dl>
              </div>

              <div
                class="modelo__bloco pilha pilha--campo"
                data-teste="resumo-por-responsavel"
              >
                <h3
                  id="titulo-por-responsavel-modelo"
                  class="texto-rotulo"
                >
                  {{ TEXTOS_MODELOS_CHECKLIST.porResponsavelTitulo }}
                </h3>
                <dl
                  class="modelo__contagens"
                  aria-labelledby="titulo-por-responsavel-modelo"
                >
                  <div
                    v-for="grupo in porResponsavel"
                    :key="grupo.chave"
                    class="modelo__contagem"
                    :data-teste="`resumo-responsavel-${grupo.chave}`"
                  >
                    <dt>{{ grupo.rotulo }}</dt>
                    <dd class="numeros-tabulares">
                      {{ grupo.quantidade }}
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            <RouterLink
              class="modelo__voltar"
              :to="{ name: 'modelos-checklist' }"
              data-teste="voltar-lateral"
            >
              {{ TEXTOS_MODELOS_CHECKLIST.voltarModelos }}
            </RouterLink>
          </aside>

          <div class="modelo__principal">
            <ReguaMarcos
              :marcos="marcos"
              :rotulo="TEXTOS_MODELOS_CHECKLIST.regua"
            >
              <template #marco="{ marco, idTitulo }">
                <ul
                  class="modelo__lista cartao"
                  :aria-labelledby="idTitulo"
                >
                  <ItemModeloChecklist
                    v-for="item in itensDoMarco(marco.chave)"
                    :key="item.id"
                    :titulo="item.titulo"
                    :prazo-relativo="descreverPrazoRelativo(item.diasAntesDoEvento)"
                    :metadados="metadados(item)"
                    :descricao="item.descricao"
                  >
                    <template #acoes>
                      <MenuAcoes
                        :itens="acoesItem"
                        :rotulo="TEXTOS_MODELOS_CHECKLIST.maisAcoes"
                        :rotulo-acessivel="TEXTOS_MODELOS_CHECKLIST.itemMaisAcoesAria(item.titulo)"
                        somente-icone
                        @selecionar="executarAcao(item, $event)"
                      />
                    </template>
                  </ItemModeloChecklist>
                </ul>
              </template>
            </ReguaMarcos>
          </div>
        </div>
      </div>
    </template>
  </LayoutPainelUsuario>
</template>

<style scoped>
.modelo {
  --modelo-largura-lateral: 18rem;

  container: modelo / inline-size;
}

.modelo__corpo {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-bloco);
  align-items: start;
}

.modelo__principal,
.modelo__lateral {
  min-width: 0;
}

.modelo__lateral {
  container: lateral-modelo / inline-size;
}

.modelo__detalhes {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-ritmo-campo);
  margin: 0;
}

.modelo__resumo {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-grupo);
}

.modelo__resumo h2,
.modelo__resumo h3,
.modelo__total,
.modelo__nota {
  margin: 0;
}

.modelo__total {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-secao);
  font-weight: var(--p-fonte-peso-leve);
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-texto);
}

.modelo__bloco {
  padding-top: var(--p-ritmo-grupo);
  border-top: 1px solid var(--p-cor-divisoria);
}

.modelo__contagens {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  margin: 0;
}

.modelo__contagem {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--p-ritmo-grupo);
  font-size: var(--p-fonte-tamanho-controle);
}

.modelo__contagem dt {
  color: var(--p-cor-texto);
}

.modelo__contagem dd {
  margin: 0;
  color: var(--p-cor-texto-secundario);
}

.modelo__voltar {
  align-self: flex-start;
  font-size: var(--p-fonte-tamanho-controle);
}

.modelo .modelo__lista {
  margin: 0;
  padding: var(--p-ritmo-campo) var(--p-ritmo-grupo);
}

@container lateral-modelo (min-width: 36rem) {
  .modelo__resumo {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    column-gap: var(--p-ritmo-bloco);
    align-items: start;
  }

  .modelo__bloco {
    padding-top: 0;
    padding-left: var(--p-ritmo-bloco);
    border-top: 0;
    border-left: 1px solid var(--p-cor-divisoria);
  }
}

@container modelo (max-width: 35.99rem) {
  .modelo__bloco--por-marco {
    display: none;
  }
}

@container modelo (min-width: 64rem) {
  .modelo__corpo {
    grid-template-columns: minmax(0, 1fr) var(--modelo-largura-lateral);
  }

  .modelo__lateral {
    grid-column: 2;
    grid-row: 1;
    position: sticky;
    top: var(--p-ritmo-bloco);
  }

  .modelo__principal {
    grid-column: 1;
    grid-row: 1;
  }
}
</style>

