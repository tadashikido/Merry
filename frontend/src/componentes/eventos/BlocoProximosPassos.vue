<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import Button from 'primevue/button'

import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import { useNotificacao } from '@/composables/useNotificacao'
import { useAcessoAnfitriaoStore } from '@/stores/acessoAnfitriao'
import { useProximosPassosStore } from '@/stores/proximosPassos'
import { ID_TITULO_ACESSO_ANFITRIAO } from '@/textos/acessoAnfitriao'
import { PASSOS_ONBOARDING, TEXTOS_PROXIMOS_PASSOS, type PassoOnboarding } from '@/textos/proximosPassos'
import { ROTULOS_ACOES } from '@/textos/rotulos'
import type { ChavePassoOnboarding, ProximosPassosEventoDto } from '@/tipos/proximosPassos'
import { estaDispensado, registrarDispensa } from '@/utilitarios/dispensaProximosPassos'
import { focarElemento } from '@/utilitarios/foco'

const props = defineProps<{ eventoId: string }>()

interface PassoExibido extends PassoOnboarding {
  concluido: boolean
  atual: boolean
  destino: RouteLocationRaw | null
}

const store = useProximosPassosStore()
const acessoAnfitriao = useAcessoAnfitriaoStore()
const notificacao = useNotificacao()
const dispensado = ref(false)

const passosServidor = computed(() => (store.eventoId === props.eventoId ? store.passos : null))
const falha = computed(() => (store.eventoId === props.eventoId ? store.falha : null))

const anfitriaoConvidadoLocal = computed<boolean | null>(() => {
  if (acessoAnfitriao.eventoId !== props.eventoId || acessoAnfitriao.carregando || acessoAnfitriao.falha) {
    return null
  }
  return acessoAnfitriao.acessos.some((acesso) => acesso.situacao === 'Pendente' || acesso.situacao === 'Ativo')
})

const estado = computed<ProximosPassosEventoDto | null>(() => {
  const servidor = passosServidor.value
  if (!servidor) {
    return null
  }
  const anfitriaoConvidado = anfitriaoConvidadoLocal.value ?? servidor.anfitriaoConvidado
  return {
    ...servidor,
    anfitriaoConvidado,
    todosConcluidos:
      anfitriaoConvidado && servidor.checklistAplicado && servidor.convidadosCadastrados && servidor.convitesEnviados,
  }
})

function destinoDoPasso(chave: ChavePassoOnboarding): RouteLocationRaw | null {
  const params = { id: props.eventoId }
  switch (chave) {
    case 'anfitriaoConvidado':
      return null
    case 'checklistAplicado':
      return { name: 'evento-checklist', params }
    case 'convidadosCadastrados':
    case 'convitesEnviados':
      return { name: 'evento-convidados', params }
  }
}

const passos = computed<PassoExibido[]>(() => {
  const atual = estado.value
  if (!atual) {
    return []
  }
  const indiceAtual = PASSOS_ONBOARDING.findIndex((passo) => !atual[passo.chave])
  return PASSOS_ONBOARDING.map((passo, indice) => ({
    ...passo,
    concluido: atual[passo.chave],
    atual: indice === indiceAtual,
    destino: destinoDoPasso(passo.chave),
  }))
})

const faltam = computed(() => passos.value.filter((passo) => !passo.concluido).length)
const carregandoInicial = computed(() => store.carregando && !passosServidor.value)
const comErro = computed(
  () => falha.value !== null && falha.value.tipo !== 'semPermissao' && falha.value.tipo !== 'naoEncontrado',
)
const exibir = computed(() => {
  if (dispensado.value) {
    return false
  }
  if (carregandoInicial.value || comErro.value) {
    return true
  }
  return estado.value !== null && !estado.value.todosConcluidos
})

watch(
  () => props.eventoId,
  (id) => {
    dispensado.value = estaDispensado(id)
    if (!dispensado.value) {
      void store.carregar(id)
    }
  },
  { immediate: true },
)

function dispensar() {
  registrarDispensa(props.eventoId)
  dispensado.value = true
  notificacao.sucesso(TEXTOS_PROXIMOS_PASSOS.dispensado)
}

function irParaAcessoAnfitriao() {
  void focarElemento(ID_TITULO_ACESSO_ANFITRIAO)
}
</script>

<template>
  <section
    v-if="exibir"
    class="proximos-passos"
    aria-labelledby="titulo-proximos-passos"
    data-teste="bloco-proximos-passos"
  >
    <div class="proximos-passos__cabecalho">
      <div class="proximos-passos__cabecalho-texto">
        <h2
          id="titulo-proximos-passos"
          class="proximos-passos__titulo"
        >
          {{ TEXTOS_PROXIMOS_PASSOS.titulo }}
        </h2>
        <p
          v-if="estado"
          class="proximos-passos__progresso"
          data-teste="progresso-proximos-passos"
        >
          {{ TEXTOS_PROXIMOS_PASSOS.progresso(faltam, passos.length) }}
        </p>
      </div>
      <Button
        :label="TEXTOS_PROXIMOS_PASSOS.dispensar"
        :aria-label="TEXTOS_PROXIMOS_PASSOS.dispensarAcessivel"
        severity="secondary"
        text
        size="small"
        data-teste="dispensar-proximos-passos"
        @click="dispensar"
      />
    </div>

    <EstadoCarregando
      v-if="carregandoInicial"
      variante="cartao"
      :linhas="2"
    />

    <div
      v-else-if="comErro"
      class="proximos-passos__erro"
      role="alert"
      data-teste="erro-proximos-passos"
    >
      <span
        class="ie ie-alerta"
        aria-hidden="true"
      />
      <span>{{ TEXTOS_PROXIMOS_PASSOS.erro }}</span>
      <Button
        :label="ROTULOS_ACOES.tentarNovamente"
        severity="secondary"
        text
        data-teste="tentar-proximos-passos"
        @click="store.carregar(eventoId)"
      />
    </div>

    <template v-else>
      <div
        class="proximos-passos__fio"
        aria-hidden="true"
      >
        <span
          v-for="passo in passos"
          :key="passo.chave"
          class="proximos-passos__segmento"
          :class="{ 'proximos-passos__segmento--concluido': passo.concluido }"
        />
      </div>

      <ol class="proximos-passos__lista">
        <li
          v-for="(passo, indice) in passos"
          :key="passo.chave"
          class="proximos-passos__passo"
          :class="{
            'proximos-passos__passo--concluido': passo.concluido,
            'proximos-passos__passo--atual': passo.atual,
          }"
          :aria-current="passo.atual ? 'step' : undefined"
          :data-teste="`passo-${passo.chave}`"
        >
          <span
            class="proximos-passos__marcador"
            aria-hidden="true"
          >
            <span
              v-if="passo.concluido"
              class="ie ie-concluir"
            />
            <template v-else>{{ indice + 1 }}</template>
          </span>

          <div class="proximos-passos__corpo">
            <span class="proximos-passos__rotulo">
              {{ passo.rotulo }}
              <span
                v-if="passo.concluido"
                class="somente-leitor-tela"
              >{{ TEXTOS_PROXIMOS_PASSOS.concluido }}</span>
            </span>

            <template v-if="passo.atual">
              <p class="proximos-passos__descricao">
                {{ passo.descricao }}
              </p>
              <Button
                v-if="passo.destino"
                :as="RouterLink"
                :to="passo.destino"
                :label="passo.acao"
                class="proximos-passos__acao-principal"
                :data-teste="`acao-${passo.chave}`"
              />
              <Button
                v-else
                :label="passo.acao"
                class="proximos-passos__acao-principal"
                :data-teste="`acao-${passo.chave}`"
                @click="irParaAcessoAnfitriao"
              />
            </template>
          </div>

          <template v-if="!passo.concluido && !passo.atual">
            <RouterLink
              v-if="passo.destino"
              :to="passo.destino"
              class="proximos-passos__link"
              :data-teste="`acao-${passo.chave}`"
            >
              {{ passo.acao }}
            </RouterLink>
            <button
              v-else
              type="button"
              class="proximos-passos__link"
              :data-teste="`acao-${passo.chave}`"
              @click="irParaAcessoAnfitriao"
            >
              {{ passo.acao }}
            </button>
          </template>
        </li>
      </ol>
    </template>
  </section>
</template>

<style scoped>
.proximos-passos {
  container: proximos-passos / inline-size;
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-4);
  padding: var(--p-ritmo-cartao);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
  background: var(--p-cor-superficie);
  box-shadow: var(--p-sombra-cartao);
}

.proximos-passos__cabecalho {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--p-espaco-3);
}

.proximos-passos__cabecalho-texto {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  min-width: 0;
}

.proximos-passos .proximos-passos__titulo {
  margin: 0;
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-secao);
  font-weight: var(--p-fonte-peso-regular);
  font-variant-numeric: lining-nums;
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-texto);
}

.proximos-passos__progresso {
  margin: 0;
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-secundario);
}

.proximos-passos__fio {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--p-espaco-1);
}

.proximos-passos__segmento {
  height: 0.25rem;
  border-radius: var(--p-raio-total);
  background: var(--p-cor-borda-controle);
}

.proximos-passos__segmento--concluido {
  background: var(--p-cor-primaria);
}

.proximos-passos__lista {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.proximos-passos__passo {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  column-gap: var(--p-espaco-3);
  row-gap: var(--p-espaco-1);
  align-items: start;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-secundario);
}

.proximos-passos__marcador {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 1.375rem;
  height: 1.375rem;
  font-size: var(--p-fonte-tamanho-rotulo);
  border: 1px solid var(--p-cor-borda-controle);
  border-radius: var(--p-raio-total);
  font-variant-numeric: lining-nums tabular-nums;
}

.proximos-passos__corpo {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--p-espaco-2);
  min-width: 0;
}

.proximos-passos__rotulo {
  line-height: 1.375rem;
}

.proximos-passos__descricao {
  margin: 0;
  max-width: 60ch;
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-secundario);
}

.proximos-passos__passo--concluido {
  color: var(--p-cor-texto-apoio);
}

.proximos-passos__passo--concluido .proximos-passos__rotulo {
  text-decoration: line-through;
}

.proximos-passos__passo--concluido .proximos-passos__marcador {
  color: var(--p-cor-superficie);
  background: var(--p-cor-primaria);
  border-color: var(--p-cor-primaria);
}

.proximos-passos__passo--atual {
  color: var(--p-cor-texto);
}

.proximos-passos__passo--atual .proximos-passos__rotulo {
  font-weight: var(--p-fonte-peso-seminegrito);
}

.proximos-passos__passo--atual .proximos-passos__marcador {
  font-weight: var(--p-fonte-peso-negrito);
  color: var(--p-cor-primaria);
  border: 1.5px solid var(--p-cor-primaria);
}

.proximos-passos__acao-principal {
  margin-top: var(--p-espaco-1);
  text-decoration: none;
}

.proximos-passos__link {
  grid-column: 2;
  justify-self: start;
  padding: 0;
  font: inherit;
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-acento-texto);
  text-decoration: underline;
  text-underline-offset: 0.2em;
  background: none;
  border: 0;
  cursor: pointer;
}

.proximos-passos__erro {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-espaco-2);
  color: var(--p-cor-texto-secundario);
}

@container proximos-passos (max-width: 29.99rem) {
  .proximos-passos__acao-principal {
    width: 100%;
    min-height: var(--p-dimensao-alvo-toque);
  }

  .proximos-passos__corpo {
    align-items: stretch;
  }
}

@container proximos-passos (min-width: 30rem) {
  .proximos-passos__passo {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }

  .proximos-passos__link {
    grid-column: 3;
    grid-row: 1;
    justify-self: end;
  }
}
</style>
