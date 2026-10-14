<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import Button from 'primevue/button'

import BadgeStatus from '@/componentes/base/BadgeStatus.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import { ROTULOS_ACOES } from '@/textos/rotulos'
import { TEXTOS_TAREFAS } from '@/textos/tarefas'
import type { PendenciasTarefasDto, SituacaoFiltroTarefa, TarefaPendenteDto } from '@/tipos/tarefas'
import { formatarNomesCasal, formatarNumero } from '@/utilitarios/formatacao'
import { LIMITE_ITENS_PENDENCIAS } from '@/utilitarios/tarefas'

const props = withDefaults(
  defineProps<{ pendencias: PendenciasTarefasDto | null; carregando?: boolean; comErro?: boolean }>(),
  { carregando: false, comErro: false },
)

defineEmits<{ tentarNovamente: [] }>()

interface GrupoPendencias {
  chave: SituacaoFiltroTarefa
  titulo: string
  total: number
  itens: TarefaPendenteDto[]
}

const grupos = computed<GrupoPendencias[]>(() => {
  const dados = props.pendencias
  if (!dados) {
    return []
  }
  return [
    { chave: 'atrasadas' as const, titulo: TEXTOS_TAREFAS.dashGrupoAtrasadas, total: dados.totalAtrasadas, itens: dados.atrasadas },
    { chave: 'semana' as const, titulo: TEXTOS_TAREFAS.dashGrupoSemana, total: dados.totalEstaSemana, itens: dados.estaSemana },
  ]
    .filter((grupo) => grupo.total > 0)
    .map((grupo) => ({ ...grupo, itens: grupo.itens.slice(0, LIMITE_ITENS_PENDENCIAS) }))
})

const semPendencias = computed(() => props.pendencias !== null && grupos.value.length === 0)

function prazoCurto(item: TarefaPendenteDto): string {
  if (item.diasParaPrazo < 0) {
    return TEXTOS_TAREFAS.dashPrazoAtraso(-item.diasParaPrazo)
  }
  return item.diasParaPrazo === 0 ? TEXTOS_TAREFAS.dashPrazoHoje : TEXTOS_TAREFAS.dashPrazoFuturo(item.diasParaPrazo)
}
</script>

<template>
  <section
    class="pendencias-tarefas"
    aria-labelledby="titulo-pendencias-tarefas"
    data-teste="bloco-pendencias-tarefas"
  >
    <div class="pendencias-tarefas__cabecalho">
      <h2
        id="titulo-pendencias-tarefas"
        class="pendencias-tarefas__titulo"
      >
        {{ TEXTOS_TAREFAS.dashTitulo }}
      </h2>
      <dl
        v-if="pendencias && !semPendencias"
        class="pendencias-tarefas__numeros"
      >
        <div class="pendencias-tarefas__numero pendencias-tarefas__numero--atraso">
          <dt class="pendencias-tarefas__rotulo-numero">
            {{ TEXTOS_TAREFAS.dashAtrasadas(pendencias.totalAtrasadas, pendencias.casamentosComAtraso) }}
          </dt>
          <dd
            class="pendencias-tarefas__valor"
            data-teste="total-atrasadas"
          >
            {{ formatarNumero(pendencias.totalAtrasadas) }}
          </dd>
        </div>
        <div class="pendencias-tarefas__numero">
          <dt class="pendencias-tarefas__rotulo-numero">
            {{ TEXTOS_TAREFAS.dashSemana }}
          </dt>
          <dd
            class="pendencias-tarefas__valor"
            data-teste="total-semana"
          >
            {{ formatarNumero(pendencias.totalEstaSemana) }}
          </dd>
        </div>
      </dl>
    </div>

    <EstadoCarregando
      v-if="carregando && !pendencias"
      variante="lista"
      :linhas="3"
    />

    <div
      v-else-if="comErro"
      class="pendencias-tarefas__erro"
      role="alert"
    >
      <span
        class="ie ie-alerta"
        aria-hidden="true"
      />
      <span>{{ TEXTOS_TAREFAS.dashErro }}</span>
      <Button
        :label="ROTULOS_ACOES.tentarNovamente"
        severity="secondary"
        text
        data-teste="tentar-pendencias"
        @click="$emit('tentarNovamente')"
      />
    </div>

    <p
      v-else-if="semPendencias"
      class="pendencias-tarefas__vazio"
      data-teste="pendencias-vazio"
    >
      <span
        class="ie ie-concluido"
        aria-hidden="true"
      />
      {{ TEXTOS_TAREFAS.dashVazio }}
    </p>

    <div
      v-else
      class="pendencias-tarefas__grupos"
    >
      <div
        v-for="grupo in grupos"
        :key="grupo.chave"
        class="pendencias-tarefas__grupo"
        :data-teste="`grupo-pendencias-${grupo.chave}`"
      >
        <h3
          :id="`pendencias-${grupo.chave}`"
          class="pendencias-tarefas__subtitulo"
        >
          {{ grupo.titulo }}
        </h3>
        <ul
          class="pendencias-tarefas__lista"
          :aria-labelledby="`pendencias-${grupo.chave}`"
        >
          <li
            v-for="item in grupo.itens"
            :key="item.id"
            class="pendencias-tarefas__item"
            data-teste="item-pendencia"
          >
            <BadgeStatus
              :texto="prazoCurto(item)"
              :variante="grupo.chave === 'atrasadas' ? 'erro' : 'alerta'"
            />
            <RouterLink
              class="pendencias-tarefas__link"
              :to="{ name: 'casamento-tarefas', params: { id: item.casamentoId }, query: { situacao: grupo.chave } }"
            >
              {{ item.titulo }}
            </RouterLink>
            <span class="pendencias-tarefas__casal">{{ formatarNomesCasal(item.nomePrimeiraPessoa, item.nomeSegundaPessoa) }}</span>
          </li>
        </ul>
        <p
          v-if="grupo.total > grupo.itens.length"
          class="pendencias-tarefas__mais"
        >
          {{ TEXTOS_TAREFAS.dashMais(grupo.total - grupo.itens.length) }}
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pendencias-tarefas {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-grupo);
  padding: var(--p-ritmo-cartao);
  container-type: inline-size;
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
  background: var(--p-cor-superficie);
}

.pendencias-tarefas__cabecalho {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--p-espaco-4);
}

.pendencias-tarefas__titulo {
  margin: 0;
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-secao);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto);
}

.pendencias-tarefas__numeros {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-6);
  margin: 0;
}

.pendencias-tarefas__numero {
  display: flex;
  flex-direction: column-reverse;
  gap: var(--p-espaco-1);
}

.pendencias-tarefas__valor {
  margin: 0;
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-pagina-celular);
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-texto);
  font-variant-numeric: lining-nums tabular-nums;
}

.pendencias-tarefas__numero--atraso .pendencias-tarefas__valor {
  color: var(--p-cor-erro-texto);
}

.pendencias-tarefas__rotulo-numero {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.pendencias-tarefas__grupos {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-espaco-5);
}

.pendencias-tarefas__subtitulo {
  margin: 0 0 var(--p-espaco-2);
  font-size: var(--p-fonte-tamanho-apoio);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto-secundario);
}

.pendencias-tarefas__lista {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pendencias-tarefas__item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  column-gap: var(--p-espaco-3);
  row-gap: var(--p-espaco-1);
  min-height: var(--p-dimensao-alvo-toque);
  padding: var(--p-espaco-2) 0;
}

.pendencias-tarefas__item + .pendencias-tarefas__item {
  border-top: 1px solid var(--p-cor-divisoria);
}

.pendencias-tarefas__link {
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-medio);
  overflow-wrap: anywhere;
}

.pendencias-tarefas__casal {
  grid-column: 2;
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.pendencias-tarefas__mais,
.pendencias-tarefas__vazio {
  margin: var(--p-espaco-2) 0 0;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
}

.pendencias-tarefas__vazio {
  display: flex;
  align-items: center;
  gap: var(--p-espaco-2);
  margin: 0;
}

.pendencias-tarefas__vazio .ie {
  color: var(--p-cor-primaria);
}

.pendencias-tarefas__erro {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-espaco-2);
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-erro-texto);
}

@container (min-width: 52rem) {
  .pendencias-tarefas__grupos {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .pendencias-tarefas__casal {
    grid-column: auto;
    justify-self: end;
  }

  .pendencias-tarefas__item {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }
}
</style>
