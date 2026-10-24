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
import ComoAplicarModelo from '@/componentes/modelos/ComoAplicarModelo.vue'
import { useModelosCronogramaStore } from '@/stores/modelosCronograma'
import { ROTULOS_DIA_CRONOGRAMA } from '@/textos/cronograma'
import { ROTULOS_CATEGORIA_FORNECEDOR } from '@/textos/fornecedores'
import {
  TEXTOS_MODELOS_POR_TIPO,
  abrirEventoDoModelo,
  momentoDoModelo,
  ondeApareceModelo,
  rotuloSugeridoDoModelo,
} from '@/textos/modelos'
import { TEXTOS_MODELOS_CRONOGRAMA, referenciaHorarioModelo, rotuloLocalModelo } from '@/textos/modelosCronograma'
import type { ItemModeloCronogramaDto } from '@/tipos/modelosCronograma'
import { descreverRelativoCerimonia, formatarDuracao, resumirDias } from '@/utilitarios/cronograma'
import {
  agruparItensModeloPorDia,
  alcanceDoModelo,
  equipeDoModelo,
  posicoesNoMomento,
  type PontoDoModelo,
} from '@/utilitarios/modelosCronograma'

const props = defineProps<{ modeloId: string }>()

const store = useModelosCronogramaStore()
const roteador = useRouter()
const rota = useRoute()

const modelo = computed(() => (store.atual?.id === props.modeloId ? store.atual : null))
const falha = computed(() => (modelo.value ? null : store.falhaAtual))
const grupos = computed(() => agruparItensModeloPorDia(modelo.value?.itens ?? []))
const momento = computed(() => momentoDoModelo(modelo.value?.tipoEvento))
const rotuloSugerido = computed(() => rotuloSugeridoDoModelo(modelo.value?.tipoEvento, TEXTOS_MODELOS_CRONOGRAMA.sugerido))
const ondeAparece = computed(() =>
  modelo.value ? ondeApareceModelo(modelo.value.tipoEvento, TEXTOS_MODELOS_CRONOGRAMA.recurso) : null,
)

const resumoDias = computed(() =>
  resumirDias(grupos.value).map((resumo) => ({
    dia: resumo.dia,
    rotulo: ROTULOS_DIA_CRONOGRAMA[resumo.dia],
    detalhe: TEXTOS_MODELOS_CRONOGRAMA.resumoDia(resumo.quantidade, resumo.intervalo),
  })),
)

const detalhePorDia = computed(() => new Map(resumoDias.value.map((resumo) => [resumo.dia, resumo.detalhe])))

const alcance = computed(() =>
  modelo.value ? alcanceDoModelo(modelo.value.itens, modelo.value.horarioReferencia) : null,
)

const posicoes = computed(() => posicoesNoMomento(modelo.value?.itens ?? []))

const equipe = computed(() =>
  equipeDoModelo(modelo.value?.itens ?? [], (categoria) => ROTULOS_CATEGORIA_FORNECEDOR[categoria]),
)

const temEquipe = computed(() => equipe.value.categorias.length > 0 || equipe.value.responsaveis.length > 0)

const passosAplicar = computed(() =>
  modelo.value
    ? [
        abrirEventoDoModelo(modelo.value.tipoEvento, 'Cronograma'),
        ...TEXTOS_MODELOS_CRONOGRAMA.passosAplicar(modelo.value.nome, momento.value.contracaoDe),
      ]
    : [],
)

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

function horario(ponto: PontoDoModelo): string {
  return TEXTOS_MODELOS_CRONOGRAMA.horarioNoDia(ROTULOS_DIA_CRONOGRAMA[ponto.dia], ponto.horario)
}

function relativo(minutos: number): string {
  return descreverRelativoCerimonia(minutos, momento.value.contracaoDe) ?? ''
}

function local(item: ItemModeloCronogramaDto): string | null {
  return item.referenciaLocal ? rotuloLocalModelo(item.referenciaLocal, modelo.value?.tipoEvento) : item.local
}

function fornecedor(item: ItemModeloCronogramaDto): string | null {
  return item.categoriaFornecedor ? ROTULOS_CATEGORIA_FORNECEDOR[item.categoriaFornecedor] : null
}

function distancia(item: ItemModeloCronogramaDto): string {
  return relativo(item.minutosDesdeCerimonia)
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
              :texto="rotuloSugerido"
              variante="informacao"
              icone="informacao"
            />
            <span
              v-else
              class="modelo-cronograma__origem"
              data-teste="origem-modelo"
            >{{ TEXTOS_MODELOS_POR_TIPO.origemAssessoria }}</span>
            <span>{{ TEXTOS_MODELOS_CRONOGRAMA.itens(modelo.itens.length) }}</span>
            <span data-teste="referencia-modelo">{{ referenciaHorarioModelo(modelo.horarioReferencia, modelo.tipoEvento) }}</span>
          </p>
          <p
            class="modelo-cronograma__onde"
            data-teste="onde-aparece-modelo"
          >
            {{ ondeAparece }}
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

      <div class="modelo-cronograma com-lateral pilha pilha--bloco">
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
          :descricao="TEXTOS_MODELOS_CRONOGRAMA.itensVazioTextoPara(momento.contracaoDe)"
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
                <span
                  class="modelo-cronograma__contagem texto-legenda numeros-tabulares"
                  :data-teste="`intervalo-grupo-${grupo.dia}`"
                >{{ detalhePorDia.get(grupo.dia) }}</span>
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
                <dl
                  v-if="alcance"
                  class="modelo-cronograma__alcance"
                  data-teste="alcance-modelo"
                >
                  <div>
                    <dt>{{ TEXTOS_MODELOS_CRONOGRAMA.rotuloComeca }}</dt>
                    <dd>
                      <span
                        class="numeros-tabulares"
                        data-teste="primeiro-horario-modelo"
                      >{{ horario(alcance.comeca) }}</span>
                      <span
                        class="modelo-cronograma__apoio"
                        data-teste="resumo-comeca"
                      >{{ relativo(alcance.comeca.minutos) }}</span>
                    </dd>
                  </div>
                  <div v-if="alcance.duracaoMinutos !== null">
                    <dt>{{ TEXTOS_MODELOS_CRONOGRAMA.rotuloTermina }}</dt>
                    <dd>
                      <span
                        class="numeros-tabulares"
                        data-teste="ultimo-horario-modelo"
                      >{{ horario(alcance.termina) }}</span>
                      <span
                        class="modelo-cronograma__apoio"
                        data-teste="resumo-termina"
                      >{{ relativo(alcance.termina.minutos) }}</span>
                    </dd>
                  </div>
                  <div v-if="alcance.duracaoMinutos !== null">
                    <dt>{{ TEXTOS_MODELOS_CRONOGRAMA.rotuloDuracao }}</dt>
                    <dd
                      class="numeros-tabulares"
                      data-teste="duracao-modelo"
                    >
                      {{ TEXTOS_MODELOS_CRONOGRAMA.duracaoRoteiro(formatarDuracao(alcance.duracaoMinutos)) }}
                    </dd>
                  </div>
                </dl>
                <p
                  class="modelo-cronograma__nota texto-legenda"
                  data-teste="apoio-referencia"
                >
                  {{ TEXTOS_MODELOS_CRONOGRAMA.apoioReferencia(modelo.horarioReferencia, momento.artigo) }}
                </p>
              </div>

              <div
                class="modelo-cronograma__bloco pilha pilha--campo"
                data-teste="resumo-cerimonia"
              >
                <h3
                  id="titulo-momento-modelo"
                  class="texto-rotulo"
                >
                  {{ TEXTOS_MODELOS_CRONOGRAMA.momentoTitulo(momento.relativoAoMomento) }}
                </h3>
                <dl
                  class="modelo-cronograma__dados"
                  aria-labelledby="titulo-momento-modelo"
                >
                  <div class="modelo-cronograma__dado">
                    <dt>{{ TEXTOS_MODELOS_CRONOGRAMA.rotuloMomento(momento.nome) }}</dt>
                    <dd
                      class="numeros-tabulares"
                      data-teste="resumo-referencia"
                    >
                      {{ modelo.horarioReferencia }}
                    </dd>
                  </div>
                  <div class="modelo-cronograma__dado">
                    <dt>{{ TEXTOS_MODELOS_CRONOGRAMA.rotuloAntes }}</dt>
                    <dd
                      class="numeros-tabulares"
                      data-teste="resumo-antes"
                    >
                      {{ posicoes.antes }}
                    </dd>
                  </div>
                  <div class="modelo-cronograma__dado">
                    <dt>{{ TEXTOS_MODELOS_CRONOGRAMA.rotuloNaHora }}</dt>
                    <dd
                      class="numeros-tabulares"
                      data-teste="resumo-na-hora"
                    >
                      {{ posicoes.naHora }}
                    </dd>
                  </div>
                  <div class="modelo-cronograma__dado">
                    <dt>{{ TEXTOS_MODELOS_CRONOGRAMA.rotuloDepois }}</dt>
                    <dd
                      class="numeros-tabulares"
                      data-teste="resumo-depois"
                    >
                      {{ posicoes.depois }}
                    </dd>
                  </div>
                </dl>
              </div>

              <div
                class="modelo-cronograma__bloco modelo-cronograma__bloco--por-dia pilha pilha--campo"
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
                v-if="temEquipe"
                class="modelo-cronograma__bloco pilha pilha--campo"
                data-teste="resumo-equipe"
              >
                <h3
                  id="titulo-equipe-modelo"
                  class="texto-rotulo"
                >
                  {{ TEXTOS_MODELOS_CRONOGRAMA.equipeTitulo }}
                </h3>
                <dl
                  class="modelo-cronograma__dados"
                  aria-labelledby="titulo-equipe-modelo"
                >
                  <div
                    v-if="equipe.categorias.length > 0"
                    class="modelo-cronograma__dado modelo-cronograma__dado--empilhado"
                  >
                    <dt>{{ TEXTOS_MODELOS_CRONOGRAMA.equipeFornecedores }}</dt>
                    <dd data-teste="equipe-fornecedores">
                      {{
                        equipe.categorias
                          .map((grupo) => TEXTOS_MODELOS_CRONOGRAMA.equipeCategoria(ROTULOS_CATEGORIA_FORNECEDOR[grupo.categoria], grupo.quantidade))
                          .join(', ')
                      }}
                    </dd>
                  </div>
                  <div
                    v-if="equipe.responsaveis.length > 0"
                    class="modelo-cronograma__dado modelo-cronograma__dado--empilhado"
                  >
                    <dt>{{ TEXTOS_MODELOS_CRONOGRAMA.equipeResponsaveis }}</dt>
                    <dd data-teste="equipe-responsaveis">
                      {{ equipe.responsaveis.join(', ') }}
                    </dd>
                  </div>
                </dl>
                <p
                  v-if="equipe.semNinguem > 0"
                  class="modelo-cronograma__nota texto-legenda"
                  data-teste="equipe-sem-ninguem"
                >
                  {{ TEXTOS_MODELOS_CRONOGRAMA.semNinguem(equipe.semNinguem) }}
                </p>
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

          <ComoAplicarModelo
            class="modelo-cronograma__aplicar"
            :titulo="TEXTOS_MODELOS_POR_TIPO.comoAplicarTitulo"
            :passos="passosAplicar"
            :nota="TEXTOS_MODELOS_CRONOGRAMA.notaAplicar"
          />
        </div>
      </div>
    </template>
  </LayoutPainelUsuario>
</template>

<style scoped>
.modelo-cronograma {
  container: modelo-cronograma com-lateral / inline-size;
}

.modelo-cronograma__corpo {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-bloco);
  align-items: start;
}

.modelo-cronograma__principal,
.modelo-cronograma__lateral,
.modelo-cronograma__aplicar {
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
  font-variant-numeric: lining-nums;
}

.modelo-cronograma__origem {
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-controle);
  font-style: italic;
  color: var(--p-cor-texto-secundario);
}

.modelo-cronograma__onde {
  margin: var(--p-ritmo-campo) 0 0;
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-controle);
  font-style: italic;
  font-variant-numeric: lining-nums;
  line-height: var(--p-fonte-entrelinha-leitura);
  color: var(--p-cor-texto-secundario);
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

.modelo-cronograma__nota {
  font-variant-numeric: lining-nums;
}

.modelo-cronograma__total {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-secao);
  font-weight: var(--p-fonte-peso-leve);
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-texto);
}

.modelo-cronograma__alcance {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
}

.modelo-cronograma__alcance dt {
  color: var(--p-cor-texto-secundario);
}

.modelo-cronograma__alcance dd {
  display: flex;
  flex-direction: column;
  margin: 0;
  color: var(--p-cor-texto);
}

.modelo-cronograma__apoio {
  color: var(--p-cor-texto-secundario);
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
  overflow-wrap: anywhere;
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
  font-variant-numeric: lining-nums;
}

.modelo-cronograma .modelo-cronograma__lista {
  margin: 0;
  padding: var(--p-ritmo-campo) var(--p-ritmo-campo) var(--p-ritmo-campo) 0;
}

@container lateral-modelo-cronograma (min-width: 36rem) {
  .modelo-cronograma__resumo {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--p-ritmo-bloco);
    align-items: start;
  }

  .modelo-cronograma__bloco {
    padding-top: 0;
    padding-left: var(--p-ritmo-bloco);
    border-top: 0;
    border-left: 1px solid var(--p-cor-divisoria);
  }

  .modelo-cronograma__bloco:nth-child(odd) {
    padding-left: 0;
    border-left: 0;
  }
}

@container modelo-cronograma (max-width: 35.99rem) {
  .modelo-cronograma__bloco--por-dia {
    display: none;
  }
}

@container com-lateral (min-width: 52rem) {
  .modelo-cronograma__corpo {
    grid-template-columns: minmax(0, 1fr) var(--com-lateral-largura);
    grid-template-rows: auto 1fr;
  }

  .modelo-cronograma__lateral {
    grid-column: 2;
    grid-row: 1;
  }

  .modelo-cronograma__aplicar {
    grid-column: 2;
    grid-row: 2;
    align-self: start;
  }

  .modelo-cronograma__principal {
    grid-column: 1;
    grid-row: 1 / span 2;
  }
}
</style>
