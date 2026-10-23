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
import { descreverRelativoCerimonia, resumirDias } from '@/utilitarios/cronograma'
import { agruparItensModeloPorDia } from '@/utilitarios/modelosCronograma'

const props = defineProps<{ modeloId: string }>()

const store = useModelosCronogramaStore()
const roteador = useRouter()
const rota = useRoute()

const modelo = computed(() => (store.atual?.id === props.modeloId ? store.atual : null))
const falha = computed(() => (modelo.value ? null : store.falhaAtual))
const grupos = computed(() => agruparItensModeloPorDia(modelo.value?.itens ?? []))

const resumoDias = computed(() =>
  resumirDias(grupos.value).map((resumo) => ({
    dia: resumo.dia,
    rotulo: ROTULOS_DIA_CRONOGRAMA[resumo.dia],
    detalhe: TEXTOS_MODELOS_CRONOGRAMA.resumoDia(resumo.quantidade, resumo.intervalo),
  })),
)

const extremos = computed(() => {
  const itens = modelo.value?.itens ?? []
  if (itens.length === 0) {
    return null
  }
  const comeca = Math.min(...itens.map((item) => item.minutosDesdeCerimonia))
  const termina = Math.max(...itens.map((item) => item.minutosDesdeCerimonia + (item.duracaoMinutos ?? 0)))
  return {
    comeca: descreverRelativoCerimonia(comeca) ?? '',
    termina: descreverRelativoCerimonia(termina) ?? '',
  }
})

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
    <div
      v-if="falha?.tipo === 'naoEncontrado'"
      class="pilha pilha--grupo"
    >
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
    </div>

    <template v-else>
      <CabecalhoPagina
        :titulo="modelo?.nome ?? TEXTOS_MODELOS_CRONOGRAMA.titulo"
        :descricao="modelo?.descricao ?? undefined"
      >
        <template
          v-if="modelo"
          #detalhes
        >
          <p
            class="modelo-cronograma__detalhes texto-legenda"
            data-teste="resumo-modelo"
          >
            <BadgeStatus
              v-if="modelo.sugerido"
              :texto="TEXTOS_MODELOS_CRONOGRAMA.sugerido"
              variante="informacao"
              icone="informacao"
            />
            <span>{{ TEXTOS_MODELOS_CRONOGRAMA.itens(modelo.itens.length) }}</span>
            <span data-teste="referencia-modelo">{{ TEXTOS_MODELOS_CRONOGRAMA.referencia(modelo.horarioReferencia) }}</span>
          </p>
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

      <div class="modelo-cronograma pilha pilha--bloco">
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

        <EstadoVazio
          v-else-if="modelo && modelo.itens.length === 0"
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

        <div
          v-else-if="modelo"
          class="modelo-cronograma__corpo"
        >
          <aside
            class="modelo-cronograma__lateral pilha pilha--grupo"
            aria-labelledby="titulo-resumo-modelo"
            data-teste="lateral-modelo"
          >
            <section class="modelo-cronograma__resumo cartao">
              <div class="modelo-cronograma__geral pilha pilha--campo">
                <h2
                  id="titulo-resumo-modelo"
                  class="texto-rotulo"
                >
                  {{ TEXTOS_MODELOS_CRONOGRAMA.resumoTitulo }}
                </h2>
                <p
                  class="modelo-cronograma__total numeros-tabulares"
                  data-teste="total-itens-modelo"
                >
                  {{ TEXTOS_MODELOS_CRONOGRAMA.itens(modelo.itens.length) }}
                </p>
                <p
                  class="modelo-cronograma__nota texto-legenda"
                  data-teste="apoio-referencia"
                >
                  {{ TEXTOS_MODELOS_CRONOGRAMA.apoioReferencia(modelo.horarioReferencia) }}
                </p>
              </div>

              <div
                class="modelo-cronograma__bloco pilha pilha--campo"
                data-teste="resumo-por-dia"
              >
                <h3
                  id="titulo-por-dia-modelo"
                  class="texto-rotulo"
                >
                  {{ TEXTOS_MODELOS_CRONOGRAMA.porDiaTitulo }}
                </h3>
                <dl
                  class="modelo-cronograma__dados"
                  aria-labelledby="titulo-por-dia-modelo"
                >
                  <div
                    v-for="resumo in resumoDias"
                    :key="resumo.dia"
                    class="modelo-cronograma__dado modelo-cronograma__dado--empilhado"
                    :data-teste="`resumo-dia-${resumo.dia}`"
                  >
                    <dt>{{ resumo.rotulo }}</dt>
                    <dd class="numeros-tabulares">
                      {{ resumo.detalhe }}
                    </dd>
                  </div>
                </dl>
              </div>

              <div
                v-if="extremos"
                class="modelo-cronograma__bloco pilha pilha--campo"
                data-teste="resumo-cerimonia"
              >
                <h3
                  id="titulo-cerimonia-modelo"
                  class="texto-rotulo"
                >
                  {{ TEXTOS_MODELOS_CRONOGRAMA.cerimoniaTitulo }}
                </h3>
                <dl
                  class="modelo-cronograma__dados"
                  aria-labelledby="titulo-cerimonia-modelo"
                >
                  <div class="modelo-cronograma__dado">
                    <dt>{{ TEXTOS_MODELOS_CRONOGRAMA.rotuloReferencia }}</dt>
                    <dd
                      class="numeros-tabulares"
                      data-teste="resumo-referencia"
                    >
                      {{ modelo.horarioReferencia }}
                    </dd>
                  </div>
                  <div class="modelo-cronograma__dado modelo-cronograma__dado--empilhado">
                    <dt>{{ TEXTOS_MODELOS_CRONOGRAMA.rotuloComeca }}</dt>
                    <dd data-teste="resumo-comeca">
                      {{ extremos.comeca }}
                    </dd>
                  </div>
                  <div class="modelo-cronograma__dado modelo-cronograma__dado--empilhado">
                    <dt>{{ TEXTOS_MODELOS_CRONOGRAMA.rotuloTermina }}</dt>
                    <dd data-teste="resumo-termina">
                      {{ extremos.termina }}
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            <RouterLink
              class="modelo-cronograma__voltar"
              :to="{ name: 'modelos-cronograma' }"
              data-teste="voltar-lateral"
            >
              {{ TEXTOS_MODELOS_CRONOGRAMA.voltarModelos }}
            </RouterLink>
          </aside>

          <div class="modelo-cronograma__principal pilha pilha--bloco">
            <section
              v-for="grupo in grupos"
              :key="grupo.dia"
              class="modelo-cronograma__grupo pilha pilha--grupo"
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
                <span class="modelo-cronograma__contagem texto-legenda">{{ TEXTOS_MODELOS_CRONOGRAMA.itens(grupo.itens.length) }}</span>
              </div>
              <ol
                class="modelo-cronograma__lista cartao"
                :aria-labelledby="`grupo-modelo-${grupo.dia}`"
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
          </div>
        </div>
      </div>
    </template>
  </LayoutPainelUsuario>
</template>

<style scoped>
.modelo-cronograma {
  --modelo-cronograma-largura-lateral: 18rem;

  container: modelo-cronograma / inline-size;
}

.modelo-cronograma__corpo {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-bloco);
  align-items: start;
}

.modelo-cronograma__principal,
.modelo-cronograma__lateral {
  min-width: 0;
}

.modelo-cronograma__lateral {
  container: lateral-modelo-cronograma / inline-size;
}

.modelo-cronograma__detalhes {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-ritmo-campo) var(--p-ritmo-grupo);
  margin: 0;
}

.modelo-cronograma__resumo {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-grupo);
}

.modelo-cronograma__resumo h2,
.modelo-cronograma__resumo h3,
.modelo-cronograma__total,
.modelo-cronograma__nota {
  margin: 0;
}

.modelo-cronograma__total {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-secao);
  font-weight: var(--p-fonte-peso-leve);
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-texto);
}

.modelo-cronograma__bloco {
  padding-top: var(--p-ritmo-grupo);
  border-top: 1px solid var(--p-cor-divisoria);
}

.modelo-cronograma__dados {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  margin: 0;
}

.modelo-cronograma__dado {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--p-ritmo-grupo);
  font-size: var(--p-fonte-tamanho-controle);
}

.modelo-cronograma__dado--empilhado {
  flex-direction: column;
  align-items: flex-start;
  gap: 0;
}

.modelo-cronograma__dado dt {
  color: var(--p-cor-texto);
}

.modelo-cronograma__dado dd {
  margin: 0;
  color: var(--p-cor-texto-secundario);
}

.modelo-cronograma__voltar {
  align-self: flex-start;
  font-size: var(--p-fonte-tamanho-controle);
}

.modelo-cronograma__cabeca-grupo {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-ritmo-campo) var(--p-ritmo-grupo);
  align-items: baseline;
  justify-content: space-between;
}

.modelo-cronograma__titulo-grupo {
  margin: 0;
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-secao);
  font-weight: var(--p-fonte-peso-leve);
  line-height: var(--p-fonte-entrelinha-titulo);
  letter-spacing: var(--p-fonte-espacamento-letras-display);
  color: var(--p-cor-texto);
}

.modelo-cronograma__contagem {
  margin: 0;
}

.modelo-cronograma .modelo-cronograma__lista {
  margin: 0;
  padding: var(--p-ritmo-campo) var(--p-ritmo-campo) var(--p-ritmo-campo) 0;
}

@container lateral-modelo-cronograma (min-width: 36rem) {
  .modelo-cronograma__resumo {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    column-gap: var(--p-ritmo-bloco);
    align-items: start;
  }

  .modelo-cronograma__bloco {
    padding-top: 0;
    padding-left: var(--p-ritmo-bloco);
    border-top: 0;
    border-left: 1px solid var(--p-cor-divisoria);
  }
}

@container modelo-cronograma (min-width: 64rem) {
  .modelo-cronograma__corpo {
    grid-template-columns: minmax(0, 1fr) var(--modelo-cronograma-largura-lateral);
  }

  .modelo-cronograma__lateral {
    grid-column: 2;
    grid-row: 1;
    position: sticky;
    top: var(--p-ritmo-bloco);
  }

  .modelo-cronograma__principal {
    grid-column: 1;
    grid-row: 1;
  }
}
</style>
