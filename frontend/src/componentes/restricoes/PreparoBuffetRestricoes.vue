<script setup lang="ts">
import { computed, useId } from 'vue'
import { RouterLink } from 'vue-router'

import { ORIENTACAO_TIPO_RESTRICAO, ROTULOS_TIPO_RESTRICAO, TEXTOS_PREPARO_BUFFET } from '@/textos/dadosSensiveis'
import { vocabularioOuNeutro } from '@/textos/tiposEvento'
import type { RelatorioRestricoesAlimentaresDto } from '@/tipos/dadosSensiveis'
import type { TipoEvento } from '@/tipos/eventos'
import { formatarNumero } from '@/utilitarios/formatacao'
import { situacaoPreparoBuffet } from '@/utilitarios/preparoBuffet'

const props = defineProps<{
  relatorio: RelatorioRestricoesAlimentaresDto
  tipo: TipoEvento | null
  eventoId: string
}>()

const idTitulo = `preparo-buffet-${useId()}`

const situacao = computed(() => situacaoPreparoBuffet(props.relatorio))
const doces = computed(() => vocabularioOuNeutro(props.tipo).cardapio.doces)

const linhaRespostas = computed(() => {
  const { confirmadas, semResposta, pendentesPorTipo } = situacao.value
  if (semResposta > 0 && pendentesPorTipo.length > 0) {
    return TEXTOS_PREPARO_BUFFET.seConfirmarem(
      pendentesPorTipo.map((contagem) => TEXTOS_PREPARO_BUFFET.itemContagem(ROTULOS_TIPO_RESTRICAO[contagem.tipo], contagem.quantidade)),
    )
  }
  if (semResposta === 0 && confirmadas > 0) {
    return TEXTOS_PREPARO_BUFFET.todosResponderam
  }
  return null
})

const orientacoes = computed(() =>
  situacao.value.tiposConfirmados.map((contagem) => ({
    tipo: contagem.tipo,
    rotulo: TEXTOS_PREPARO_BUFFET.itemContagem(ROTULOS_TIPO_RESTRICAO[contagem.tipo], contagem.quantidade),
    texto: ORIENTACAO_TIPO_RESTRICAO[contagem.tipo](doces.value),
  })),
)

const temConferencia = computed(
  () => orientacoes.value.length > 0 || props.relatorio.outrasRestricoes > 0 || props.relatorio.necessidadesEspeciais > 0,
)
</script>

<template>
  <section
    class="preparo cartao"
    :aria-labelledby="idTitulo"
    data-teste="preparo-buffet"
  >
    <div class="preparo__corpo">
      <div class="preparo__situacao pilha pilha--grupo">
        <h2
          :id="idTitulo"
          class="preparo__titulo"
        >
          {{ TEXTOS_PREPARO_BUFFET.titulo }}
        </h2>

        <ul
          class="preparo__numeros"
          :aria-label="TEXTOS_PREPARO_BUFFET.situacaoRotulo"
        >
          <li
            class="preparo__numero-item"
            data-teste="preparo-confirmadas"
          >
            <span
              class="preparo__numero numeros-tabulares"
              aria-hidden="true"
            >{{ formatarNumero(situacao.confirmadas) }}</span>
            <span
              class="preparo__legenda"
              aria-hidden="true"
            >{{ TEXTOS_PREPARO_BUFFET.confirmaram(situacao.confirmadas) }}</span>
            <span class="somente-leitor-tela">{{ TEXTOS_PREPARO_BUFFET.confirmaramAcessivel(situacao.confirmadas) }}</span>
          </li>
          <li
            class="preparo__numero-item"
            data-teste="preparo-sem-resposta"
          >
            <span
              class="preparo__numero numeros-tabulares"
              aria-hidden="true"
            >{{ formatarNumero(situacao.semResposta) }}</span>
            <span
              class="preparo__legenda"
              aria-hidden="true"
            >{{ TEXTOS_PREPARO_BUFFET.semResposta }}</span>
            <span class="somente-leitor-tela">{{ TEXTOS_PREPARO_BUFFET.semRespostaAcessivel(situacao.semResposta) }}</span>
          </li>
        </ul>

        <p
          v-if="linhaRespostas"
          class="preparo__nota"
          data-teste="preparo-respostas"
        >
          {{ linhaRespostas }}
        </p>

        <p
          v-if="situacao.confirmadas === 0"
          class="preparo__nota"
          data-teste="preparo-ninguem-confirmou"
        >
          {{ TEXTOS_PREPARO_BUFFET.ninguemConfirmou }}
        </p>

        <div
          v-if="situacao.alergiaConfirmada"
          class="preparo__alergia"
          data-teste="preparo-alergia"
        >
          <p class="preparo__alergia-titulo">
            <span
              class="ie ie-alerta"
              aria-hidden="true"
            />
            {{ TEXTOS_PREPARO_BUFFET.alergiaTitulo }}
          </p>
          <p class="preparo__alergia-texto">
            {{ TEXTOS_PREPARO_BUFFET.alergiaTexto }}
          </p>
        </div>
      </div>

      <div class="preparo__conferencia pilha pilha--grupo">
        <div
          v-if="temConferencia"
          class="pilha pilha--campo"
          data-teste="preparo-conferir"
        >
          <h3 class="preparo__subtitulo">
            {{ TEXTOS_PREPARO_BUFFET.conferirTitulo }}
          </h3>
          <dl
            v-if="orientacoes.length > 0"
            class="preparo__orientacoes"
          >
            <div
              v-for="orientacao in orientacoes"
              :key="orientacao.tipo"
              class="preparo__orientacao"
              :data-teste="`preparo-orientacao-${orientacao.tipo}`"
            >
              <dt class="preparo__orientacao-rotulo">
                {{ orientacao.rotulo }}
              </dt>
              <dd class="preparo__orientacao-texto">
                {{ orientacao.texto }}
              </dd>
            </div>
          </dl>
          <p
            v-if="relatorio.outrasRestricoes > 0"
            class="preparo__nota"
            data-teste="preparo-outras"
          >
            {{ TEXTOS_PREPARO_BUFFET.outras(relatorio.outrasRestricoes) }}
          </p>
          <p
            v-if="relatorio.necessidadesEspeciais > 0"
            class="preparo__nota"
            data-teste="preparo-necessidades"
          >
            {{ TEXTOS_PREPARO_BUFFET.necessidades(relatorio.necessidadesEspeciais) }}
          </p>
        </div>

        <div class="preparo__ficha pilha pilha--campo">
          <RouterLink
            :to="{ name: 'impressao-buffet', params: { id: eventoId } }"
            class="preparo__link"
            data-teste="preparo-ficha"
          >
            <span
              class="ie ie-imprimir"
              aria-hidden="true"
            />
            {{ TEXTOS_PREPARO_BUFFET.ficha }}
          </RouterLink>
          <p class="preparo__privacidade">
            {{ TEXTOS_PREPARO_BUFFET.fichaNota }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.preparo {
  container: preparo-buffet / inline-size;
  min-width: 0;
}

.preparo__corpo {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-grupo);
}

.preparo__situacao,
.preparo__conferencia {
  min-width: 0;
}

.preparo__titulo,
.preparo__subtitulo,
.preparo__nota,
.preparo__alergia-titulo,
.preparo__alergia-texto,
.preparo__privacidade {
  margin: 0;
}

.preparo__titulo {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-secao);
  font-weight: var(--p-fonte-peso-leve);
  color: var(--p-cor-texto);
}

.preparo__numeros {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--p-ritmo-campo);
  margin: 0;
  padding: 0;
  list-style: none;
}

.preparo__numero-item {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  min-width: 0;
}

.preparo__numero-item + .preparo__numero-item {
  padding-inline-start: var(--p-ritmo-campo);
  border-inline-start: 1px solid var(--p-cor-divisoria);
}

.preparo__numero {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-pagina-celular);
  font-weight: var(--p-fonte-peso-leve);
  font-variant-numeric: lining-nums tabular-nums;
  line-height: 1.1;
  color: var(--p-cor-texto);
}

.preparo__legenda {
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-corpo);
  font-style: italic;
  line-height: 1.2;
  color: var(--p-cor-texto-secundario);
  overflow-wrap: break-word;
}

.preparo__nota,
.preparo__privacidade {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-secundario);
}

.preparo__alergia {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  padding-inline-start: var(--p-ritmo-campo);
  border-inline-start: 2px solid var(--p-cor-primaria);
}

.preparo__alergia-titulo {
  display: flex;
  align-items: baseline;
  gap: var(--p-espaco-2);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto);
}

.preparo__alergia-titulo .ie {
  color: var(--p-cor-primaria);
}

.preparo__alergia-texto {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto);
}

.preparo__subtitulo {
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto);
}

.preparo__orientacoes {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  margin: 0;
}

.preparo__orientacao {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
}

.preparo__orientacao-rotulo {
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto);
}

.preparo__orientacao-texto {
  margin: 0;
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-secundario);
}

.preparo__ficha {
  padding-block-start: var(--p-ritmo-campo);
  border-block-start: 1px solid var(--p-cor-divisoria);
}

.preparo__link {
  display: inline-flex;
  align-items: center;
  gap: var(--p-espaco-2);
  align-self: flex-start;
  padding-block: var(--p-espaco-1);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-primaria);
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

@container preparo-buffet (min-width: 36rem) {
  .preparo__corpo {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: var(--p-ritmo-bloco);
  }
}
</style>
