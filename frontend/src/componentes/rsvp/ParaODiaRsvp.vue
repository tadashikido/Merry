<script setup lang="ts">
import { computed, useId } from 'vue'

import { descreverContagemAcessivel } from '@/textos/eventos'
import { referenciaDoModelo } from '@/textos/modelos'
import { TEXTOS_PARA_O_DIA } from '@/textos/rsvp'
import type { DataCalendario } from '@/tipos/eventos'
import type { EventoRsvpDto } from '@/tipos/rsvp'
import { diasAteOEvento, formatarDiaMes, linkMapaDoLocal, locaisDoConvite } from '@/utilitarios/rsvp'

const props = defineProps<{
  evento: EventoRsvpDto
  dataLimiteResposta: DataCalendario
  mostrarPrazo: boolean
  podeResponder: boolean
  hoje: DataCalendario
}>()

const idTitulo = useId()

const referencia = computed(() => referenciaDoModelo(props.evento.tipo))
const contagem = computed(() => {
  const dias = diasAteOEvento(props.evento.data, props.hoje)
  return dias === null || dias < 0 ? null : `${descreverContagemAcessivel(dias, referencia.value.artigo)}.`
})
const locais = computed(() =>
  locaisDoConvite(props.evento).map((local) => ({ ...local, link: linkMapaDoLocal(local.valor) })),
)
</script>

<template>
  <section
    class="para-o-dia"
    :aria-labelledby="idTitulo"
    data-teste="rsvp-para-o-dia"
  >
    <div class="para-o-dia__corpo">
      <h2
        :id="idTitulo"
        class="para-o-dia__titulo"
      >
        {{ TEXTOS_PARA_O_DIA.titulo(referencia.contracaoDe) }}
      </h2>

      <p
        v-if="contagem"
        class="para-o-dia__contagem"
        data-teste="rsvp-contagem"
      >
        {{ contagem }}
      </p>

      <div
        v-if="locais.length > 0"
        class="para-o-dia__chegar"
      >
        <h3 class="para-o-dia__subtitulo">
          {{ TEXTOS_PARA_O_DIA.comoChegar }}
        </h3>
        <ul class="para-o-dia__locais">
          <li
            v-for="local in locais"
            :key="local.chave"
            class="para-o-dia__local"
            data-teste="rsvp-local"
          >
            <span class="para-o-dia__rotulo">{{ local.rotulo }}</span>
            <span class="para-o-dia__nome">{{ local.valor }}</span>
            <a
              class="para-o-dia__mapa"
              :href="local.link"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="TEXTOS_PARA_O_DIA.abrirMapaAcessivel(local.valor)"
              data-teste="rsvp-abrir-mapa"
            >{{ TEXTOS_PARA_O_DIA.abrirMapa }}</a>
          </li>
        </ul>
      </div>

      <div
        v-if="mostrarPrazo || podeResponder"
        class="para-o-dia__notas"
      >
        <p
          v-if="mostrarPrazo"
          class="para-o-dia__nota"
          data-teste="rsvp-nota-prazo"
        >
          {{ TEXTOS_PARA_O_DIA.mudarResposta(formatarDiaMes(dataLimiteResposta)) }}
        </p>
        <p
          v-if="podeResponder"
          class="para-o-dia__nota"
          data-teste="rsvp-nota-link"
        >
          {{ TEXTOS_PARA_O_DIA.linkPessoal }}
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.para-o-dia {
  container: para-o-dia / inline-size;
  min-width: 0;
}

.para-o-dia__corpo {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-grupo);
  padding-top: var(--p-ritmo-cartao);
  border-top: 1px solid var(--p-cor-borda-publica);
}

.para-o-dia__titulo,
.para-o-dia__subtitulo,
.para-o-dia__contagem,
.para-o-dia__nota {
  margin: 0;
}

.para-o-dia__titulo {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-secao);
  font-weight: var(--p-fonte-peso-leve);
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.para-o-dia__contagem {
  padding-inline-start: var(--p-ritmo-campo);
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-corpo);
  font-style: italic;
  font-variant-numeric: lining-nums;
  line-height: 1.35;
  color: var(--p-cor-texto);
  border-inline-start: 2px solid var(--p-cor-primaria);
}

.para-o-dia__chegar {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
}

.para-o-dia__subtitulo {
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto);
}

.para-o-dia__locais {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-grupo);
  margin: 0;
  padding: 0;
  list-style: none;
}

.para-o-dia__local {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
}

.para-o-dia__rotulo {
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-corpo);
  font-style: italic;
  line-height: 1.3;
  color: var(--p-cor-apoio-publico);
}

.para-o-dia__nome {
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.para-o-dia__mapa {
  display: inline-flex;
  align-items: center;
  min-height: var(--p-dimensao-alvo-toque-movel);
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-primaria);
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

.para-o-dia__mapa:focus-visible {
  outline: 2px solid var(--p-cor-primaria);
  outline-offset: 2px;
  border-radius: var(--p-raio-tag);
}

.para-o-dia__notas {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
}

.para-o-dia__nota {
  font-size: var(--p-fonte-tamanho-apoio);
  line-height: 1.5;
  color: var(--p-cor-apoio-publico);
}

@container para-o-dia (min-width: 30rem) {
  .para-o-dia__locais {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
