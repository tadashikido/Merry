<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Button from 'primevue/button'

import LayoutImpressao from '@/layouts/LayoutImpressao.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import ResumoCardapio from '@/componentes/base/ResumoCardapio.vue'
import type { LinhaCardapio } from '@/componentes/base/tipos'
import { useConfirmacoesStore } from '@/stores/confirmacoes'
import type { FalhaConvidados } from '@/stores/convidados'
import { useEventosStore } from '@/stores/eventos'
import { TEXTOS_CONFIRMACOES, TEXTOS_FICHA_BUFFET } from '@/textos/confirmacoes'
import { ROTULOS_TIPO_RESTRICAO, TEXTOS_PREPARO_BUFFET } from '@/textos/dadosSensiveis'
import type { ExportacaoBuffetDto, PessoaBuffetDto } from '@/tipos/confirmacoes'
import { descreverRestricoes } from '@/utilitarios/exportacaoBuffet'
import { cabecalhoFichaEvento, origemDaFicha } from '@/utilitarios/fichaBuffet'
import { formatarData, formatarDataHora, formatarNomesAnfitrioes, formatarNumero } from '@/utilitarios/formatacao'
import { faixaConfirmacao } from '@/utilitarios/painelConfirmacoes'
import { conferenciaBuffet } from '@/utilitarios/preparoBuffet'

const props = defineProps<{ id: string }>()

const store = useConfirmacoesStore()
const eventos = useEventosStore()
const roteador = useRouter()

const ficha = ref<ExportacaoBuffetDto | null>(null)
const carregando = ref(false)
const falha = ref<FalhaConvidados | null>(null)

const nomes = computed(() =>
  ficha.value ? formatarNomesAnfitrioes(ficha.value.evento.nomePrimeiraPessoa, ficha.value.evento.nomeSegundaPessoa) : '',
)

const evento = computed(() => (eventos.atual?.id === props.id ? eventos.atual : null))

const cabecalho = computed(() => (ficha.value ? cabecalhoFichaEvento(ficha.value.evento, evento.value) : null))

const faixa = computed(() => (ficha.value ? faixaConfirmacao(ficha.value.confirmados.total, ficha.value.pendentes) : null))

const conferencia = computed(() =>
  ficha.value ? conferenciaBuffet(ficha.value.restricoes, cabecalho.value?.tipo ?? null) : null,
)

const temConferencia = computed(
  () =>
    conferencia.value !== null &&
    (conferencia.value.orientacoes.length > 0 || conferencia.value.outras > 0 || conferencia.value.necessidades > 0),
)

function lerEstadoAnterior(): unknown {
  const estado: unknown = window.history.state
  return typeof estado === 'object' && estado !== null && 'back' in estado ? estado.back : null
}

const origem = computed(() => origemDaFicha(lerEstadoAnterior(), props.id, (caminho) => roteador.resolve(caminho)))

const voltar = computed(() =>
  origem.value === 'restricoes'
    ? { rota: { name: 'restricoes-alimentares', params: { id: props.id } }, rotulo: TEXTOS_FICHA_BUFFET.voltarRestricoes }
    : { rota: { name: 'painel-confirmacoes', params: { id: props.id } }, rotulo: TEXTOS_FICHA_BUFFET.voltar },
)

const linhasContagem = computed<LinhaCardapio[]>(() =>
  ficha.value
    ? [
        { chave: 'adultos', rotulo: TEXTOS_FICHA_BUFFET.adultos, valor: ficha.value.confirmados.adultos },
        { chave: 'criancas', rotulo: TEXTOS_FICHA_BUFFET.criancas, valor: ficha.value.confirmados.criancas },
        { chave: 'total', rotulo: TEXTOS_FICHA_BUFFET.total, valor: ficha.value.confirmados.total },
      ]
    : [],
)

const linhasRestricoes = computed<LinhaCardapio[]>(() => {
  const restricoes = ficha.value?.restricoes
  if (!restricoes) {
    return []
  }
  const linhas: LinhaCardapio[] = restricoes.porTipo.map((contagem) => ({
    chave: contagem.tipo,
    rotulo: ROTULOS_TIPO_RESTRICAO[contagem.tipo] ?? contagem.tipo,
    valor: contagem.quantidade,
  }))
  if (restricoes.outrasRestricoes > 0) {
    linhas.push({ chave: 'outras', rotulo: TEXTOS_FICHA_BUFFET.outrasRestricoes, valor: restricoes.outrasRestricoes })
  }
  if (restricoes.necessidadesEspeciais > 0) {
    linhas.push({ chave: 'necessidades', rotulo: TEXTOS_FICHA_BUFFET.necessidadesEspeciais, valor: restricoes.necessidadesEspeciais })
  }
  return linhas
})

function marcadores(pessoa: PessoaBuffetDto): string {
  const partes: string[] = []
  if (pessoa.faixaEtaria === 'Crianca') {
    partes.push(TEXTOS_FICHA_BUFFET.crianca)
  }
  if (pessoa.acompanhante) {
    partes.push(TEXTOS_FICHA_BUFFET.acompanhante)
  }
  return partes.join(', ')
}

function restricaoPessoa(pessoa: Pick<PessoaBuffetDto, 'tipos' | 'outraRestricao' | 'necessidadeEspecial'>): string {
  const partes = [descreverRestricoes(pessoa)]
  if (pessoa.necessidadeEspecial) {
    partes.push(TEXTOS_FICHA_BUFFET.necessidade(pessoa.necessidadeEspecial))
  }
  return partes.filter(Boolean).join('; ')
}

async function carregar(id: string) {
  carregando.value = true
  falha.value = null
  const resultado = await store.exportar(id, 'impressao')
  if (props.id !== id) {
    return
  }
  if (resultado.ok) {
    ficha.value = resultado.valor
  } else {
    ficha.value = null
    falha.value = resultado.falha
  }
  carregando.value = false
}

watch(
  () => props.id,
  (id) => {
    ficha.value = null
    void carregar(id)
    void eventos.obter(id)
  },
  { immediate: true },
)

watch(nomes, (valor) => {
  if (valor) {
    document.title = TEXTOS_FICHA_BUFFET.titulo(valor)
  }
})

function imprimir() {
  window.print()
}
</script>

<template>
  <LayoutImpressao :rotulo-acoes="TEXTOS_FICHA_BUFFET.acoesRotulo">
    <template #acoes>
      <RouterLink
        :to="voltar.rota"
        data-teste="voltar-painel"
      >
        {{ voltar.rotulo }}
      </RouterLink>
      <Button
        :label="TEXTOS_FICHA_BUFFET.imprimir"
        icon="ie ie-imprimir"
        :disabled="!ficha"
        data-teste="imprimir"
        @click="imprimir"
      />
    </template>

    <EstadoCarregando
      v-if="carregando && !ficha"
      variante="cartao"
      :linhas="3"
    />

    <EstadoErro
      v-else-if="falha"
      :titulo="falha.tipo === 'naoEncontrado' ? TEXTOS_CONFIRMACOES.naoEncontradoTitulo : TEXTOS_FICHA_BUFFET.erroCarregar"
      :mensagem="falha.tipo === 'semPermissao' ? TEXTOS_CONFIRMACOES.semAcesso : TEXTOS_CONFIRMACOES.naoEncontradoTexto"
      :pode-tentar-novamente="falha.tipo !== 'semPermissao' && falha.tipo !== 'naoEncontrado'"
      @tentar-novamente="carregar(id)"
    />

    <article
      v-else-if="ficha"
      class="ficha pilha pilha--bloco"
      data-teste="ficha-buffet"
    >
      <header class="ficha__cabecalho pilha pilha--grupo">
        <div class="ficha__documento">
          <p class="ficha__documento-nome">
            {{ TEXTOS_FICHA_BUFFET.documento }}
          </p>
          <p class="ficha__gerado texto-legenda numeros-tabulares">
            {{ TEXTOS_FICHA_BUFFET.gerado(formatarDataHora(ficha.geradoEm)) }}
          </p>
        </div>
        <div class="ficha__identificacao pilha pilha--campo">
          <p
            v-if="cabecalho?.tipoRotulo"
            class="ficha__tipo"
            data-teste="ficha-tipo"
          >
            {{ cabecalho.tipoRotulo }}
          </p>
          <h1 class="ficha__anfitriao">
            {{ nomes }}
          </h1>
        </div>
        <dl
          class="ficha__detalhes"
          :aria-label="TEXTOS_FICHA_BUFFET.detalhesRotulo"
          data-teste="ficha-detalhes"
        >
          <div
            v-for="detalhe in cabecalho?.detalhes ?? []"
            :key="detalhe.chave"
            class="ficha__detalhe"
            :data-teste="`ficha-detalhe-${detalhe.chave}`"
          >
            <dt>{{ detalhe.rotulo }}</dt>
            <dd class="numeros-tabulares">
              {{ detalhe.valor }}
            </dd>
          </div>
        </dl>
      </header>

      <div class="ficha__resumos">
        <ResumoCardapio
          class="ficha__bloco"
          :titulo="TEXTOS_FICHA_BUFFET.contagem"
          :linhas="linhasContagem"
        >
          <template
            v-if="ficha.pendentes > 0 && faixa"
            #rodape
          >
            <span data-teste="ficha-pendentes">{{ TEXTOS_FICHA_BUFFET.pendentes(ficha.pendentes) }}</span>
            <span data-teste="ficha-maximo">{{ TEXTOS_FICHA_BUFFET.maximo(faixa.maximo) }}</span>
          </template>
        </ResumoCardapio>

        <section
          class="ficha__bloco ficha__restricoes pilha pilha--grupo"
          aria-labelledby="ficha-restricoes"
        >
          <h2
            id="ficha-restricoes"
            class="ficha__titulo"
          >
            {{ TEXTOS_FICHA_BUFFET.restricoes }}
          </h2>
          <p
            v-if="ficha.restricoes.dadosExcluidosEm"
            class="ficha__nota"
          >
            {{ TEXTOS_FICHA_BUFFET.dadosExcluidos(formatarData(ficha.restricoes.dadosExcluidosEm)) }}
          </p>
          <p
            v-if="ficha.restricoes.registrosIlegiveis > 0"
            class="ficha__nota ficha__nota--alerta"
            role="alert"
          >
            {{ TEXTOS_FICHA_BUFFET.ilegiveis(ficha.restricoes.registrosIlegiveis) }}
          </p>
          <p
            v-if="linhasRestricoes.length === 0"
            class="ficha__nota"
          >
            {{ TEXTOS_FICHA_BUFFET.semRestricoes }}
          </p>
          <dl
            v-else
            class="ficha__linhas"
          >
            <div
              v-for="linha in linhasRestricoes"
              :key="linha.chave"
              class="ficha__linha"
            >
              <dt>{{ linha.rotulo }}</dt>
              <dd class="numeros-tabulares">
                {{ formatarNumero(linha.valor) }}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section
        v-if="temConferencia && conferencia"
        class="ficha__conferir pilha pilha--grupo"
        aria-labelledby="ficha-conferir"
        data-teste="ficha-conferir"
      >
        <h2
          id="ficha-conferir"
          class="ficha__titulo"
        >
          {{ TEXTOS_FICHA_BUFFET.conferirTitulo }}
        </h2>
        <div
          v-if="conferencia.alergia"
          class="ficha__alergia"
          data-teste="ficha-alergia"
        >
          <p class="ficha__alergia-titulo">
            <span
              class="ie ie-alerta"
              aria-hidden="true"
            />
            {{ TEXTOS_PREPARO_BUFFET.alergiaTitulo }}
          </p>
          <p class="ficha__alergia-texto">
            {{ TEXTOS_PREPARO_BUFFET.alergiaTexto }}
          </p>
        </div>
        <dl
          v-if="conferencia.orientacoes.length > 0"
          class="ficha__orientacoes"
        >
          <div
            v-for="orientacao in conferencia.orientacoes"
            :key="orientacao.tipo"
            class="ficha__orientacao"
            :data-teste="`ficha-orientacao-${orientacao.tipo}`"
          >
            <dt class="ficha__orientacao-rotulo">
              {{ orientacao.rotulo }}
            </dt>
            <dd class="ficha__orientacao-texto">
              {{ orientacao.texto }}
            </dd>
          </div>
        </dl>
        <p
          v-if="conferencia.outras > 0"
          class="ficha__nota"
          data-teste="ficha-conferir-outras"
        >
          {{ TEXTOS_PREPARO_BUFFET.outras(conferencia.outras) }}
        </p>
        <p
          v-if="conferencia.necessidades > 0"
          class="ficha__nota"
          data-teste="ficha-conferir-necessidades"
        >
          {{ TEXTOS_PREPARO_BUFFET.necessidades(conferencia.necessidades) }}
        </p>
      </section>

      <table
        v-if="linhasRestricoes.length > 0 && ficha.restricoes.pessoas.length > 0"
        class="ficha__tabela"
        data-teste="ficha-restricoes-pessoas"
      >
        <caption class="ficha__legenda-tabela">
          {{ TEXTOS_FICHA_BUFFET.restricoesPorPessoa }}
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              class="texto-rotulo"
            >
              {{ TEXTOS_FICHA_BUFFET.colunaNome }}
            </th>
            <th
              scope="col"
              class="texto-rotulo"
            >
              {{ TEXTOS_FICHA_BUFFET.colunaConvite }}
            </th>
            <th
              scope="col"
              class="texto-rotulo"
            >
              {{ TEXTOS_FICHA_BUFFET.colunaRestricao }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(pessoa, indiceRestricao) in ficha.restricoes.pessoas"
            :key="`${indiceRestricao}-${pessoa.convite}-${pessoa.nome}`"
          >
            <td class="ficha__celula-nome">
              {{ pessoa.nome }}
            </td>
            <td>{{ pessoa.convite }}</td>
            <td>{{ restricaoPessoa(pessoa) }}</td>
          </tr>
        </tbody>
      </table>

      <section
        class="ficha__confirmados pilha pilha--grupo"
        aria-labelledby="ficha-confirmados"
      >
        <h2
          id="ficha-confirmados"
          class="ficha__titulo"
        >
          {{ TEXTOS_FICHA_BUFFET.confirmados(ficha.convites.length) }}
        </h2>
        <p
          v-if="ficha.convites.length === 0"
          class="ficha__nota"
        >
          {{ TEXTOS_FICHA_BUFFET.semConfirmados }}
        </p>
        <div
          v-else
          class="ficha__convites"
        >
          <section
            v-for="(convite, indiceConvite) in ficha.convites"
            :key="`${indiceConvite}-${convite.nome}`"
            class="ficha__convite pilha pilha--campo"
            data-teste="ficha-convite"
          >
            <h3 class="ficha__nome-convite">
              {{ convite.nome }} <span class="numeros-tabulares">({{ convite.pessoas.length }})</span>
            </h3>
            <ul class="ficha__pessoas">
              <li
                v-for="(pessoa, indicePessoa) in convite.pessoas"
                :key="`${indicePessoa}-${pessoa.nome}`"
              >
                {{ pessoa.nome }}<span
                  v-if="marcadores(pessoa)"
                  class="ficha__marcador"
                >, {{ marcadores(pessoa) }}</span>
              </li>
            </ul>
          </section>
        </div>
      </section>

      <footer
        class="ficha__rodape"
        data-teste="ficha-aviso-saude"
      >
        {{ TEXTOS_FICHA_BUFFET.rodape }}
      </footer>
    </article>
  </LayoutImpressao>
</template>

<style scoped>
.ficha {
  container: ficha / inline-size;
}

.ficha__cabecalho {
  padding-bottom: var(--p-ritmo-cartao);
  border-bottom: 1px solid var(--p-cor-texto);
}

.ficha__identificacao {
  min-width: 0;
}

.ficha__anfitriao {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-pagina-celular);
  font-weight: var(--p-fonte-peso-leve);
  font-variant-numeric: lining-nums;
  line-height: var(--p-fonte-entrelinha-titulo);
  letter-spacing: var(--p-fonte-espacamento-letras-display);
  overflow-wrap: anywhere;
}

.ficha__tipo {
  margin: 0;
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-corpo);
  font-style: italic;
  font-variant-numeric: lining-nums;
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto-apoio);
}

.ficha__detalhes {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-campo) var(--p-ritmo-cartao);
  margin: 0;
}

.ficha__detalhe {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.ficha__detalhe dt {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.ficha__detalhe dd {
  margin: 0;
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.ficha__conferir {
  break-inside: avoid;
}

.ficha__alergia {
  padding-left: var(--p-ritmo-grupo);
  border-left: medium solid var(--p-cor-primaria);
}

.ficha__alergia-titulo {
  display: flex;
  align-items: baseline;
  gap: var(--p-ritmo-campo);
  margin: 0;
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto);
}

.ficha__alergia-texto {
  margin: 0;
  font-size: var(--p-fonte-tamanho-apoio);
  line-height: var(--p-fonte-entrelinha-leitura);
  color: var(--p-cor-texto);
}

.ficha__orientacoes {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-grupo) var(--p-ritmo-cartao);
  margin: 0;
}

.ficha__orientacao {
  min-width: 0;
  padding-top: var(--p-ritmo-campo);
  border-top: 1px solid var(--p-cor-divisoria);
  break-inside: avoid;
}

.ficha__orientacao-rotulo {
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto);
}

.ficha__orientacao-texto {
  margin: 0;
  font-size: var(--p-fonte-tamanho-apoio);
  line-height: var(--p-fonte-entrelinha-leitura);
  color: var(--p-cor-texto);
}

.ficha__documento {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--p-ritmo-campo) var(--p-ritmo-grupo);
  padding-bottom: var(--p-ritmo-campo);
  border-bottom: 1px solid var(--p-cor-divisoria);
}

.ficha__documento-nome {
  margin: 0;
  font-size: var(--p-fonte-tamanho-titulo);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto);
}

.ficha__gerado {
  margin: 0;
}

.ficha__resumos {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-grupo);
  align-items: start;
}

.ficha__bloco,
.ficha :deep(.resumo-cardapio) {
  max-width: none;
  padding: var(--p-ritmo-cartao);
  background: none;
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
  break-inside: avoid;
}

.ficha :deep(.resumo-cardapio) {
  gap: var(--p-ritmo-grupo);
}

.ficha :deep(.resumo-cardapio__titulo) {
  font-weight: var(--p-fonte-peso-regular);
}

.ficha :deep(.resumo-cardapio__valor) {
  color: var(--p-cor-texto);
}

.ficha :deep(.resumo-cardapio__linha:last-child) {
  padding-top: var(--p-ritmo-campo);
  font-weight: var(--p-fonte-peso-medio);
  border-top: 1px solid var(--p-cor-texto);
}

.ficha :deep(.resumo-cardapio__linha:last-child::after) {
  border-bottom-color: transparent;
}

.ficha :deep(.resumo-cardapio__rodape) {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  margin: 0;
  font-family: var(--p-fonte-serif);
  font-style: italic;
  font-variant-numeric: lining-nums;
}

.ficha__titulo {
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-secao);
  font-weight: var(--p-fonte-peso-regular);
  line-height: var(--p-fonte-entrelinha-titulo);
}

.ficha__nota {
  margin: 0;
  font-family: var(--p-fonte-serif);
  font-variant-numeric: lining-nums;
  font-size: var(--p-fonte-tamanho-apoio);
  font-style: italic;
  line-height: var(--p-fonte-entrelinha-leitura);
  color: var(--p-cor-texto-apoio);
}

.ficha__nota--alerta {
  font-style: normal;
  color: var(--p-cor-texto);
}

.ficha__linhas {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  margin: 0;
}

.ficha__linha {
  display: flex;
  align-items: baseline;
  gap: var(--p-ritmo-campo);
}

.ficha__linha::after {
  order: 1;
  flex: 1;
  min-width: var(--p-ritmo-grupo);
  content: '';
  border-bottom: 1px dotted var(--p-cor-borda-campo);
}

.ficha__linha dd {
  order: 2;
  margin: 0;
  font-weight: var(--p-fonte-peso-seminegrito);
}

.ficha__tabela {
  width: 100%;
  font-size: var(--p-fonte-tamanho-controle);
  border-collapse: collapse;
}

.ficha__tabela thead {
  display: table-header-group;
}

.ficha__tabela tr {
  break-inside: avoid;
}

.ficha__legenda-tabela {
  padding-bottom: var(--p-ritmo-grupo);
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-secao);
  line-height: var(--p-fonte-entrelinha-titulo);
  text-align: left;
}

.ficha__tabela th,
.ficha__tabela td {
  padding: var(--p-ritmo-campo) var(--p-ritmo-grupo) var(--p-ritmo-campo) 0;
  text-align: left;
  vertical-align: top;
  overflow-wrap: anywhere;
}

.ficha__tabela th:last-child,
.ficha__tabela td:last-child {
  padding-right: 0;
}

.ficha__tabela th {
  overflow-wrap: normal;
  border-bottom: 1px solid var(--p-cor-texto);
}

.ficha__tabela td {
  line-height: var(--p-fonte-entrelinha-interface);
  border-bottom: 1px solid var(--p-cor-divisoria);
}

.ficha__celula-nome {
  font-weight: var(--p-fonte-peso-medio);
}

.ficha__convites {
  columns: 1;
  column-gap: var(--p-ritmo-cartao);
}

.ficha__convite {
  padding-bottom: var(--p-ritmo-grupo);
  break-inside: avoid;
}

.ficha__nome-convite {
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-corpo);
  font-weight: var(--p-fonte-peso-medio);
  line-height: var(--p-fonte-entrelinha-interface);
  overflow-wrap: anywhere;
}

.ficha__nome-convite span {
  font-weight: var(--p-fonte-peso-regular);
  color: var(--p-cor-texto-apoio);
}

.ficha__pessoas {
  margin: 0;
  padding-left: var(--p-ritmo-grupo);
  line-height: var(--p-fonte-entrelinha-interface);
  overflow-wrap: anywhere;
}

.ficha__marcador {
  font-family: var(--p-fonte-serif);
  font-style: italic;
  color: var(--p-cor-texto-apoio);
}

.ficha__rodape {
  padding-top: var(--p-ritmo-grupo);
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-apoio);
  line-height: var(--p-fonte-entrelinha-leitura);
  color: var(--p-cor-texto);
  border-top: 1px solid var(--p-cor-texto);
  break-inside: avoid;
}

@container ficha (min-width: 36rem) {
  .ficha__anfitriao {
    font-size: var(--p-fonte-tamanho-pagina);
  }

  .ficha__resumos,
  .ficha__detalhes,
  .ficha__orientacoes {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .ficha__convites {
    columns: 2;
  }
}

@container ficha (min-width: 56rem) {
  .ficha__convites {
    columns: 3;
  }
}

@media print {
  .ficha {
    --pilha-espaco: var(--p-ritmo-cartao);
  }

  .ficha__anfitriao {
    font-size: var(--p-fonte-tamanho-pagina-celular);
  }

  .ficha__resumos,
  .ficha__detalhes,
  .ficha__orientacoes {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .ficha__alergia {
    border-left-color: var(--p-cor-texto);
  }

  .ficha__alergia-titulo .ie {
    display: none;
  }

  .ficha__legenda-tabela {
    break-after: avoid;
  }

  .ficha__bloco,
  .ficha :deep(.resumo-cardapio) {
    padding: var(--p-ritmo-grupo);
    border-color: var(--p-cor-texto-apoio);
  }

  .ficha__convites {
    columns: 2;
  }

  .ficha__nota,
  .ficha__tipo,
  .ficha__detalhe dt,
  .ficha__gerado,
  .ficha__marcador,
  .ficha__nome-convite span,
  .ficha :deep(.resumo-cardapio__rodape) {
    color: var(--p-cor-texto);
  }
}
</style>
