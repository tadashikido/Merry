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
import { agruparPorMarco } from '@/utilitarios/checklist'

const props = defineProps<{ modeloId: string }>()

const store = useModelosChecklistStore()
const roteador = useRouter()
const notificacao = useNotificacao()
const { confirmarExclusao } = useConfirmarExclusao()

const modelo = computed(() => (store.atual?.id === props.modeloId ? store.atual : null))
const falha = computed(() => (modelo.value ? null : store.falhaAtual))
const grupos = computed(() => agruparPorMarco(modelo.value?.itens ?? [], (item) => item.diasAntesDoCasamento))
const marcos = computed<MarcoRegua[]>(() =>
  grupos.value.map((grupo) => ({
    chave: grupo.marco,
    rotulo: ROTULOS_MARCO_CHECKLIST[grupo.marco],
    complemento: COMPLEMENTO_MARCO_CHECKLIST[grupo.marco],
    detalhe: TEXTOS_MODELOS_CHECKLIST.resumoItens(grupo.itens.length),
  })),
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
    <template v-if="falha?.tipo === 'naoEncontrado'">
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
    </template>

    <template v-else>
      <CabecalhoPagina
        :titulo="modelo?.nome ?? TEXTOS_MODELOS_CHECKLIST.titulo"
        :descricao="modelo?.descricao ?? undefined"
      >
        <template
          v-if="modelo"
          #detalhes
        >
          <span
            class="modelo__detalhes"
            data-teste="resumo-modelo"
          >
            <BadgeStatus
              v-if="modelo.sugerido"
              :texto="TEXTOS_MODELOS_CHECKLIST.sugerido"
              variante="informacao"
              icone="informacao"
            />
            {{ TEXTOS_MODELOS_CHECKLIST.resumoItens(modelo.itens.length) }}
          </span>
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

      <div class="modelo">
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
          class="modelo__painel"
        >
          <ReguaMarcos
            :marcos="marcos"
            :rotulo="TEXTOS_MODELOS_CHECKLIST.regua"
          >
            <template #marco="{ marco, idTitulo }">
              <ul
                class="modelo__itens"
                :aria-labelledby="idTitulo"
              >
                <ItemModeloChecklist
                  v-for="item in itensDoMarco(marco.chave)"
                  :key="item.id"
                  :titulo="item.titulo"
                  :prazo-relativo="descreverPrazoRelativo(item.diasAntesDoCasamento)"
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
    </template>
  </LayoutPainelUsuario>
</template>

<style scoped>
.modelo {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-5);
  max-width: var(--p-dimensao-largura-leitura);
}

.modelo__painel {
  padding: var(--p-espaco-5) var(--p-espaco-4);
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.modelo__itens {
  margin: 0;
  padding: 0;
}

.modelo__detalhes {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-espaco-2);
}

.modelo__voltar {
  display: inline-block;
  margin-top: var(--p-espaco-4);
}

@media (min-width: 640px) {
  .modelo__painel {
    padding: var(--p-espaco-6);
  }
}
</style>
