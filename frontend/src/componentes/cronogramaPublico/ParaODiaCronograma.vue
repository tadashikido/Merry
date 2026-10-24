<script setup lang="ts">
import { computed, useId } from 'vue'

import { TEXTOS_CRONOGRAMA_PUBLICO } from '@/textos/cronogramaPublico'
import { momentoDoModelo, referenciaDoModelo } from '@/textos/modelos'
import { TEXTOS_PARA_O_DIA } from '@/textos/rsvp'
import type { EventoCronogramaPublicoDto, ItemCronogramaPublicoDto } from '@/tipos/cronogramaPublico'
import type { FaseGrandeDia } from '@/tipos/grandeDia'
import { fraseMomentoDoCronograma, horariosPorDia, temConteudoParaODia } from '@/utilitarios/paraODiaCronograma'
import { linkMapaDoLocal, locaisDoConvite } from '@/utilitarios/rsvp'

const props = defineProps<{
  evento: EventoCronogramaPublicoDto
  itens: ItemCronogramaPublicoDto[]
  filtrado: boolean
  fase: FaseGrandeDia | null
  minutoAtual: number
}>()

const idTitulo = useId()

const referencia = computed(() => referenciaDoModelo(props.evento.tipo))
const frase = computed(() =>
  fraseMomentoDoCronograma({
    momento: momentoDoModelo(props.evento.tipo).artigo,
    horario: props.evento.horarioCerimonia,
    fase: props.fase,
    minutoAtual: props.minutoAtual,
  }),
)
const dias = computed(() => horariosPorDia(props.itens))
const locais = computed(() =>
  locaisDoConvite(props.evento).map((local) => ({ ...local, link: linkMapaDoLocal(local.valor) })),
)
const temConteudo = computed(() => temConteudoParaODia(props.evento, props.itens.length))
</script>

<template>
  <section
    v-if="temConteudo"
    class="para-o-dia-cronograma"
    :aria-labelledby="idTitulo"
    data-teste="cronograma-publico-para-o-dia"
  >
    <h2
      :id="idTitulo"
      class="para-o-dia-cronograma__titulo"
    >
      {{ TEXTOS_PARA_O_DIA.titulo(referencia.contracaoDe) }}
    </h2>

    <p
      v-if="frase"
      class="para-o-dia-cronograma__momento"
      data-teste="cronograma-publico-momento"
    >
      {{ frase }}
    </p>

    <div
      v-if="dias.length > 0"
      class="para-o-dia-cronograma__grupo"
    >
      <h3
        class="para-o-dia-cronograma__subtitulo"
        data-teste="cronograma-publico-horarios-titulo"
      >
        {{ filtrado ? TEXTOS_CRONOGRAMA_PUBLICO.seusHorarios : TEXTOS_CRONOGRAMA_PUBLICO.horariosEquipe }}
      </h3>
      <dl
        class="para-o-dia-cronograma__dias"
        :aria-label="TEXTOS_CRONOGRAMA_PUBLICO.horariosPorDia"
      >
        <div
          v-for="dia in dias"
          :key="dia.dia"
          class="para-o-dia-cronograma__dia"
          :data-teste="`cronograma-publico-horarios-${dia.dia}`"
        >
          <dt>{{ dia.rotulo }}</dt>
          <dd>{{ dia.texto }}</dd>
        </div>
      </dl>
    </div>

    <div
      v-if="locais.length > 0"
      class="para-o-dia-cronograma__grupo"
    >
      <h3 class="para-o-dia-cronograma__subtitulo">
        {{ TEXTOS_PARA_O_DIA.comoChegar }}
      </h3>
      <ul class="para-o-dia-cronograma__locais">
        <li
          v-for="local in locais"
          :key="local.chave"
          class="para-o-dia-cronograma__local"
          data-teste="cronograma-publico-local"
        >
          <span class="para-o-dia-cronograma__rotulo">{{ local.rotulo }}</span>
          <span class="para-o-dia-cronograma__nome">{{ local.valor }}</span>
          <a
            class="para-o-dia-cronograma__mapa"
            :href="local.link"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="TEXTOS_PARA_O_DIA.abrirMapaAcessivel(local.valor)"
            data-teste="cronograma-publico-abrir-mapa"
          >{{ TEXTOS_PARA_O_DIA.abrirMapa }}</a>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.para-o-dia-cronograma {
  container: para-o-dia-cronograma / inline-size;
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-grupo);
  min-width: 0;
}

.para-o-dia-cronograma__titulo,
.para-o-dia-cronograma__subtitulo,
.para-o-dia-cronograma__momento {
  margin: 0;
}

.para-o-dia-cronograma__titulo {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-secao);
  font-weight: var(--p-fonte-peso-leve);
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-operacao-texto);
  overflow-wrap: anywhere;
}

.para-o-dia-cronograma__momento {
  padding-inline-start: var(--p-ritmo-grupo);
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-titulo);
  font-style: italic;
  font-variant-numeric: lining-nums;
  line-height: 1.35;
  color: var(--p-cor-operacao-texto);
  border-inline-start: var(--p-dimensao-fio-cronograma) solid var(--p-cor-operacao-destaque);
}

.para-o-dia-cronograma__grupo {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  min-width: 0;
}

.para-o-dia-cronograma__subtitulo {
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-apoio);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-operacao-apoio);
}

.para-o-dia-cronograma__dias {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  margin: 0;
}

.para-o-dia-cronograma__dia {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  font-size: var(--p-fonte-tamanho-controle);
}

.para-o-dia-cronograma__dia dt {
  color: var(--p-cor-operacao-apoio);
}

.para-o-dia-cronograma__dia dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
  color: var(--p-cor-operacao-texto);
  overflow-wrap: anywhere;
}

.para-o-dia-cronograma__locais {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-grupo);
  margin: 0;
  padding: 0;
  list-style: none;
}

.para-o-dia-cronograma__local {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
}

.para-o-dia-cronograma__rotulo {
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-corpo);
  font-style: italic;
  line-height: 1.3;
  color: var(--p-cor-operacao-apoio);
}

.para-o-dia-cronograma__nome {
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-operacao-texto);
  overflow-wrap: anywhere;
}

.para-o-dia-cronograma__mapa {
  display: inline-flex;
  align-items: center;
  min-height: var(--p-dimensao-alvo-toque-movel);
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-operacao-destaque);
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

.para-o-dia-cronograma__mapa:focus-visible {
  outline: 2px solid var(--p-cor-operacao-destaque);
  outline-offset: 2px;
}

@container para-o-dia-cronograma (min-width: 20rem) {
  .para-o-dia-cronograma__dia {
    grid-template-columns: var(--p-dimensao-coluna-rotulo-dia-operacao) minmax(0, 1fr);
    gap: var(--p-ritmo-campo);
  }
}

@container para-o-dia-cronograma (min-width: 30rem) {
  .para-o-dia-cronograma__locais {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
