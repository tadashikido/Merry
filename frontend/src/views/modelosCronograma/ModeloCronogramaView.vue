<script setup lang="ts">
import { computed, nextTick, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'

import LayoutPainelUsuario from '@/layouts/LayoutPainelUsuario.vue'
import BadgeStatus from '@/componentes/base/BadgeStatus.vue'
import CabecalhoPagina from '@/componentes/base/CabecalhoPagina.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import EstadoVazio from '@/componentes/base/EstadoVazio.vue'
import LinhaCronograma from '@/componentes/base/LinhaCronograma.vue'
import { useModelosCronogramaStore } from '@/stores/modelosCronograma'
import { ROTULOS_DIA_CRONOGRAMA } from '@/textos/cronograma'
import { ROTULOS_CATEGORIA_FORNECEDOR } from '@/textos/fornecedores'
import { ROTULOS_LOCAL_MODELO, TEXTOS_MODELOS_CRONOGRAMA } from '@/textos/modelosCronograma'
import type { ItemModeloCronogramaDto } from '@/tipos/modelosCronograma'
import { descreverRelativoCerimonia } from '@/utilitarios/cronograma'
import { agruparItensModeloPorDia } from '@/utilitarios/modelosCronograma'

const props = defineProps<{ modeloId: string }>()

const store = useModelosCronogramaStore()
const roteador = useRouter()
const rota = useRoute()

const modelo = computed(() => (store.atual?.id === props.modeloId ? store.atual : null))
const falha = computed(() => (modelo.value ? null : store.falhaAtual))
const grupos = computed(() => agruparItensModeloPorDia(modelo.value?.itens ?? []))

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

watch(
  () => modelo.value?.itens.length,
  () => {
    const focar = rota.query.item
    if (typeof focar !== 'string' || !modelo.value) {
      return
    }
    void nextTick(() =>
      document
        .querySelector<HTMLElement>(`[data-item-modelo-cronograma="${focar}"] [data-teste="linha-cronograma-conteudo"]`)
        ?.focus(),
    )
  },
  { immediate: true },
)

function local(item: ItemModeloCronogramaDto): string | null {
  return item.referenciaLocal ? ROTULOS_LOCAL_MODELO[item.referenciaLocal] : item.local
}

function fornecedor(item: ItemModeloCronogramaDto): string | null {
  return item.categoriaFornecedor ? ROTULOS_CATEGORIA_FORNECEDOR[item.categoriaFornecedor] : null
}

function distancia(item: ItemModeloCronogramaDto): string {
  return descreverRelativoCerimonia(item.minutosDesdeCerimonia) ?? ''
}

function adicionarItem() {
  void roteador.push({ name: 'item-modelo-cronograma-novo', params: { modeloId: props.modeloId } })
}

function editarItem(item: ItemModeloCronogramaDto) {
  void roteador.push({ name: 'item-modelo-cronograma-editar', params: { modeloId: props.modeloId, itemId: item.id } })
}

function editarModelo() {
  void roteador.push({ name: 'modelo-cronograma-editar', params: { modeloId: props.modeloId } })
}
</script>

<template>
  <LayoutPainelUsuario>
    <template v-if="falha?.tipo === 'naoEncontrado'">
      <EstadoErro
        :titulo="TEXTOS_MODELOS_CRONOGRAMA.naoEncontradoTitulo"
        :mensagem="TEXTOS_MODELOS_CRONOGRAMA.naoEncontradoTexto"
        :pode-tentar-novamente="false"
      />
      <RouterLink
        class="modelo-cronograma__voltar"
        :to="{ name: 'modelos-cronograma' }"
        data-teste="voltar"
      >
        {{ TEXTOS_MODELOS_CRONOGRAMA.voltarModelos }}
      </RouterLink>
    </template>

    <template v-else>
      <CabecalhoPagina
        :titulo="modelo?.nome ?? TEXTOS_MODELOS_CRONOGRAMA.titulo"
        :descricao="modelo?.descricao ?? undefined"
      >
        <template
          v-if="modelo"
          #detalhes
        >
          <span
            class="modelo-cronograma__detalhes"
            data-teste="resumo-modelo"
          >
            <BadgeStatus
              v-if="modelo.sugerido"
              :texto="TEXTOS_MODELOS_CRONOGRAMA.sugerido"
              variante="informacao"
              icone="informacao"
            />
            {{ TEXTOS_MODELOS_CRONOGRAMA.itens(modelo.itens.length) }}
          </span>
        </template>
        <template
          v-if="modelo"
          #acoes
        >
          <Button
            :label="TEXTOS_MODELOS_CRONOGRAMA.editar"
            icon="ie ie-editar"
            severity="secondary"
            outlined
            data-teste="editar-modelo"
            @click="editarModelo"
          />
          <Button
            :label="TEXTOS_MODELOS_CRONOGRAMA.adicionarItem"
            icon="ie ie-mais"
            data-teste="adicionar-item"
            @click="adicionarItem"
          />
        </template>
      </CabecalhoPagina>

      <div class="modelo-cronograma">
        <EstadoCarregando
          v-if="store.carregandoAtual && !modelo"
          variante="lista"
          :linhas="5"
        />

        <EstadoErro
          v-else-if="falha?.tipo === 'semPermissao'"
          :titulo="TEXTOS_MODELOS_CRONOGRAMA.erroTitulo"
          :mensagem="TEXTOS_MODELOS_CRONOGRAMA.semAcesso"
          :pode-tentar-novamente="false"
          variante="semPermissao"
        />

        <EstadoErro
          v-else-if="falha"
          :titulo="TEXTOS_MODELOS_CRONOGRAMA.erroTitulo"
          :mensagem="TEXTOS_MODELOS_CRONOGRAMA.erroTexto"
          @tentar-novamente="store.carregar(modeloId)"
        />

        <template v-else-if="modelo">
          <p
            class="modelo-cronograma__referencia"
            data-teste="apoio-referencia"
          >
            {{ TEXTOS_MODELOS_CRONOGRAMA.apoioReferencia(modelo.horarioReferencia) }}
          </p>

          <EstadoVazio
            v-if="modelo.itens.length === 0"
            icone="cronograma"
            :titulo="TEXTOS_MODELOS_CRONOGRAMA.itensVazioTitulo"
            :descricao="TEXTOS_MODELOS_CRONOGRAMA.itensVazioTexto"
          >
            <template #acao>
              <Button
                :label="TEXTOS_MODELOS_CRONOGRAMA.adicionarItem"
                icon="ie ie-mais"
                severity="secondary"
                outlined
                data-teste="adicionar-item-vazio"
                @click="adicionarItem"
              />
            </template>
          </EstadoVazio>

          <section
            v-for="grupo in grupos"
            :key="grupo.dia"
            class="modelo-cronograma__grupo"
            :aria-labelledby="`grupo-modelo-${grupo.dia}`"
            :data-teste="`grupo-modelo-${grupo.dia}`"
          >
            <div class="modelo-cronograma__cabeca-grupo">
              <h2
                :id="`grupo-modelo-${grupo.dia}`"
                class="modelo-cronograma__titulo-grupo"
              >
                {{ ROTULOS_DIA_CRONOGRAMA[grupo.dia] }}
              </h2>
              <span class="modelo-cronograma__contagem">{{ TEXTOS_MODELOS_CRONOGRAMA.itens(grupo.itens.length) }}</span>
            </div>
            <ol
              class="modelo-cronograma__lista"
              :aria-label="TEXTOS_MODELOS_CRONOGRAMA.fio"
            >
              <LinhaCronograma
                v-for="item in grupo.itens"
                :key="item.id"
                :data-item-modelo-cronograma="item.id"
                :inicio="item.inicio"
                :termino="item.termino"
                :termina-em-outro-dia="item.terminaEmOutroDia"
                :atividade="item.atividade"
                :local="local(item)"
                :responsavel="item.responsavel"
                :fornecedor="fornecedor(item)"
                :instrucoes="item.instrucoes"
                :relativo-cerimonia="distancia(item)"
                :eh-cerimonia="item.minutosDesdeCerimonia === 0"
                editavel
                :rotulo="TEXTOS_MODELOS_CRONOGRAMA.rotuloLinha(item.atividade, item.inicio, distancia(item))"
                @editar="editarItem(item)"
              />
            </ol>
          </section>
        </template>
      </div>
    </template>
  </LayoutPainelUsuario>
</template>

<style scoped>
.modelo-cronograma {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-5);
  max-width: var(--p-dimensao-largura-leitura);
}

.modelo-cronograma__detalhes {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-espaco-2);
}

.modelo-cronograma__referencia {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-secundario);
}

.modelo-cronograma__grupo {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
}

.modelo-cronograma__cabeca-grupo {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-2) var(--p-espaco-4);
  align-items: baseline;
  justify-content: space-between;
}

.modelo-cronograma__titulo-grupo {
  margin: 0;
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-titulo);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto);
}

.modelo-cronograma__contagem {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.modelo-cronograma__lista {
  margin: 0;
  padding: 0 var(--p-espaco-2) 0 0;
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.modelo-cronograma__voltar {
  display: inline-block;
  margin-top: var(--p-espaco-4);
}
</style>
