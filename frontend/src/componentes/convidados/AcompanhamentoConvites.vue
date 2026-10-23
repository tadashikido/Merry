<script setup lang="ts">
import { computed, useId } from 'vue'
import Button from 'primevue/button'

import { TEXTOS_CONFIRMACOES } from '@/textos/confirmacoes'
import { TEXTOS_ACOMPANHAMENTO_CONVITES, gruposSugeridos } from '@/textos/convidados'
import type { ConviteDto } from '@/tipos/convidados'
import type { TipoEvento } from '@/tipos/eventos'
import { gruposSemEnvio, resumirEnvio, temConviteSemGrupo } from '@/utilitarios/acompanhamentoConvites'
import { calcularPrazoConfirmacao, type DadosPrazoConfirmacao } from '@/utilitarios/prazoConfirmacao'
import { formatarDiaMes } from '@/utilitarios/rsvp'

const LIMITE_GRUPOS = 4

const props = defineProps<{
  convites: ConviteDto[]
  pessoasPendentes: number
  tipo: TipoEvento | null
  prazo: DadosPrazoConfirmacao | null
}>()

const emit = defineEmits<{
  'filtrar-pendentes': []
  'filtrar-grupo': [chave: string]
}>()

const idTitulo = `acompanhamento-convites-${useId()}`

const resumo = computed(() => resumirEnvio(props.convites))

const etapas = computed(() => [
  { chave: 'a-enviar', valor: resumo.value.aEnviar, legenda: TEXTOS_ACOMPANHAMENTO_CONVITES.aEnviar },
  { chave: 'aguardando', valor: resumo.value.aguardando, legenda: TEXTOS_ACOMPANHAMENTO_CONVITES.aguardando },
  { chave: 'respondidos', valor: resumo.value.respondidos, legenda: TEXTOS_ACOMPANHAMENTO_CONVITES.respondidos(resumo.value.respondidos) },
])

function proporcao(valor: number): string {
  return resumo.value.total > 0 ? `${(valor / resumo.value.total) * 100}%` : '0%'
}

const todosRespondidos = computed(() => resumo.value.total > 0 && resumo.value.aEnviar + resumo.value.aguardando === 0)

const grupos = computed(() => gruposSemEnvio(props.convites))
const gruposVisiveis = computed(() => grupos.value.slice(0, LIMITE_GRUPOS))
const gruposRestantes = computed(() => grupos.value.length - gruposVisiveis.value.length)

const orientacao = computed(() => {
  const semGrupo = temConviteSemGrupo(props.convites)
  return semGrupo ? TEXTOS_ACOMPANHAMENTO_CONVITES.orientacaoGrupos(gruposSugeridos(props.tipo)) : null
})

const prazo = computed(() => {
  if (!props.prazo) {
    return null
  }
  const calculado = calcularPrazoConfirmacao(props.prazo)
  if (!calculado) {
    return null
  }
  const data = formatarDiaMes(props.prazo.dataLimiteRsvpEfetiva)
  return calculado.encerrado
    ? { data: TEXTOS_CONFIRMACOES.prazoEncerrado(data), falta: null }
    : { data: TEXTOS_CONFIRMACOES.prazoAte(data), falta: TEXTOS_CONFIRMACOES.prazoFaltam(calculado.diasRestantes) }
})
</script>

<template>
  <section
    class="acompanhamento cartao"
    :aria-labelledby="idTitulo"
    data-teste="acompanhamento-convites"
  >
    <div class="acompanhamento__corpo">
      <div class="acompanhamento__situacao pilha pilha--grupo">
        <div class="acompanhamento__topo">
          <h2
            :id="idTitulo"
            class="acompanhamento__titulo"
          >
            {{ TEXTOS_ACOMPANHAMENTO_CONVITES.titulo }}
          </h2>
          <p
            v-if="prazo"
            class="acompanhamento__prazo"
            data-teste="acompanhamento-prazo"
          >
            <span>{{ prazo.data }}</span><template v-if="prazo.falta">
              <span class="somente-leitor-tela">, </span>
              <span class="acompanhamento__falta">{{ prazo.falta }}</span>
            </template>
          </p>
        </div>

        <div
          class="acompanhamento__barra"
          aria-hidden="true"
        >
          <span
            v-for="etapa in etapas"
            :key="etapa.chave"
            class="acompanhamento__segmento"
            :class="`acompanhamento__segmento--${etapa.chave}`"
            :style="{ inlineSize: proporcao(etapa.valor) }"
          />
        </div>

        <ol
          class="acompanhamento__etapas"
          :aria-label="TEXTOS_ACOMPANHAMENTO_CONVITES.trilhaRotulo"
        >
          <li
            v-for="etapa in etapas"
            :key="etapa.chave"
            class="acompanhamento__etapa"
            :data-teste="`acompanhamento-${etapa.chave}`"
          >
            <span
              class="acompanhamento__numero numeros-tabulares"
              aria-hidden="true"
            >{{ etapa.valor.toLocaleString('pt-BR') }}</span>
            <span
              class="acompanhamento__legenda"
              aria-hidden="true"
            >
              <span
                class="acompanhamento__marcador"
                :class="`acompanhamento__marcador--${etapa.chave}`"
              />{{ etapa.legenda }}
            </span>
            <span class="somente-leitor-tela">{{ TEXTOS_ACOMPANHAMENTO_CONVITES.numeroAcessivel(etapa.valor, etapa.legenda) }}</span>
          </li>
        </ol>

        <p
          v-if="todosRespondidos"
          class="acompanhamento__nota"
          data-teste="acompanhamento-todos-respondidos"
        >
          {{ TEXTOS_ACOMPANHAMENTO_CONVITES.todosRespondidos }}
        </p>
        <div
          v-else-if="pessoasPendentes > 0"
          class="acompanhamento__acao"
        >
          <Button
            :label="TEXTOS_ACOMPANHAMENTO_CONVITES.verPendentes(pessoasPendentes)"
            icon="ie ie-confirmacoes"
            severity="secondary"
            outlined
            size="small"
            data-teste="ver-pendentes"
            @click="emit('filtrar-pendentes')"
          />
        </div>
      </div>

      <div
        v-if="gruposVisiveis.length > 0 || orientacao"
        class="acompanhamento__grupos-orientacao pilha pilha--grupo"
      >
        <div
          v-if="gruposVisiveis.length > 0"
          class="acompanhamento__grupos pilha pilha--campo"
          data-teste="grupos-sem-envio"
        >
          <h3 class="acompanhamento__subtitulo">
            {{ TEXTOS_ACOMPANHAMENTO_CONVITES.gruposSemEnvioTitulo }}
          </h3>
          <ul class="acompanhamento__lista-grupos">
            <li
              v-for="grupo in gruposVisiveis"
              :key="grupo.chave"
            >
              <Button
                :label="grupo.rotulo"
                :aria-label="TEXTOS_ACOMPANHAMENTO_CONVITES.filtrarGrupo(grupo.rotulo)"
                class="acompanhamento__grupo"
                severity="secondary"
                text
                size="small"
                data-teste="grupo-sem-envio"
                @click="emit('filtrar-grupo', grupo.chave)"
              />
            </li>
            <li
              v-if="gruposRestantes > 0"
              class="acompanhamento__mais"
              data-teste="grupos-sem-envio-mais"
            >
              {{ TEXTOS_ACOMPANHAMENTO_CONVITES.maisGrupos(gruposRestantes) }}
            </li>
          </ul>
        </div>

        <p
          v-if="orientacao"
          class="acompanhamento__orientacao"
          data-teste="acompanhamento-orientacao"
        >
          {{ orientacao }}
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.acompanhamento {
  container: acompanhamento / inline-size;
  min-width: 0;
}

.acompanhamento__corpo {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-grupo);
}

.acompanhamento__situacao,
.acompanhamento__grupos-orientacao {
  min-width: 0;
}

.acompanhamento__topo {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--p-espaco-1) var(--p-ritmo-campo);
}

.acompanhamento__titulo,
.acompanhamento__subtitulo,
.acompanhamento__prazo,
.acompanhamento__nota,
.acompanhamento__orientacao {
  margin: 0;
}

.acompanhamento__titulo {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-secao);
  font-weight: var(--p-fonte-peso-leve);
  color: var(--p-cor-texto);
}

.acompanhamento__prazo {
  display: flex;
  flex-wrap: wrap;
  gap: 0 var(--p-espaco-2);
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-secundario);
}

.acompanhamento__falta {
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-primaria);
}

.acompanhamento__barra {
  display: flex;
  height: var(--p-espaco-1);
  overflow: hidden;
  background: var(--p-cor-trilho);
  border-radius: var(--p-raio-total);
}

.acompanhamento__segmento {
  display: block;
  height: 100%;
}

.acompanhamento__segmento--a-enviar,
.acompanhamento__marcador--a-enviar {
  background: var(--p-cor-trilho);
}

.acompanhamento__segmento--aguardando,
.acompanhamento__marcador--aguardando {
  background: color-mix(in srgb, var(--p-cor-primaria) 40%, var(--p-cor-superficie));
}

.acompanhamento__segmento--respondidos,
.acompanhamento__marcador--respondidos {
  background: var(--p-cor-primaria);
}

.acompanhamento__etapas {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--p-ritmo-campo);
  margin: 0;
  padding: 0;
  list-style: none;
}

.acompanhamento__etapa {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  min-width: 0;
}

.acompanhamento__etapa + .acompanhamento__etapa {
  padding-inline-start: var(--p-ritmo-campo);
  border-inline-start: 1px solid var(--p-cor-divisoria);
}

.acompanhamento__numero {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-pagina-celular);
  font-weight: var(--p-fonte-peso-leve);
  font-variant-numeric: lining-nums tabular-nums;
  line-height: 1.1;
  color: var(--p-cor-texto);
}

.acompanhamento__legenda {
  display: flex;
  align-items: baseline;
  gap: var(--p-espaco-1);
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-corpo);
  font-style: italic;
  line-height: 1.2;
  color: var(--p-cor-texto-secundario);
  overflow-wrap: break-word;
}

.acompanhamento__marcador {
  flex: none;
  inline-size: var(--p-espaco-2);
  block-size: var(--p-espaco-2);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-total);
}

.acompanhamento__acao {
  display: flex;
}

.acompanhamento__nota {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-secundario);
}

.acompanhamento__grupos-orientacao {
  padding-block-start: var(--p-ritmo-grupo);
  border-block-start: 1px solid var(--p-cor-divisoria);
}

.acompanhamento__grupo :deep(.p-button-label) {
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

.acompanhamento__subtitulo {
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto);
}

.acompanhamento__lista-grupos {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-espaco-1) var(--p-espaco-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.acompanhamento__mais {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.acompanhamento__orientacao {
  padding-inline-start: var(--p-ritmo-campo);
  border-inline-start: 2px solid var(--p-cor-primaria);
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-corpo);
  font-style: italic;
  color: var(--p-cor-texto-secundario);
}

@container acompanhamento (max-width: 29.99rem) {
  .acompanhamento__orientacao {
    display: none;
  }
}

@container acompanhamento (min-width: 30rem) {
  .acompanhamento__numero {
    font-size: var(--p-fonte-tamanho-pagina);
  }
}

@container acompanhamento (min-width: 36rem) {
  .acompanhamento__corpo {
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
    gap: var(--p-ritmo-bloco);
  }

  .acompanhamento__grupos-orientacao {
    padding-block-start: 0;
    padding-inline-start: var(--p-ritmo-bloco);
    border-block-start: 0;
    border-inline-start: 1px solid var(--p-cor-divisoria);
  }
}
</style>
