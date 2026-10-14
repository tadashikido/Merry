<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import Button from 'primevue/button'

import LayoutImpressao from '@/layouts/LayoutImpressao.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import ResumoCardapio from '@/componentes/base/ResumoCardapio.vue'
import type { LinhaCardapio } from '@/componentes/base/tipos'
import { useConfirmacoesStore } from '@/stores/confirmacoes'
import type { FalhaConvidados } from '@/stores/convidados'
import { TEXTOS_CONFIRMACOES, TEXTOS_FICHA_BUFFET } from '@/textos/confirmacoes'
import { ROTULOS_TIPO_RESTRICAO } from '@/textos/dadosSensiveis'
import type { ExportacaoBuffetDto, PessoaBuffetDto } from '@/tipos/confirmacoes'
import { descreverRestricoes } from '@/utilitarios/exportacaoBuffet'
import {
  formatarData,
  formatarDataCalendarioComDiaSemana,
  formatarDataHora,
  formatarNomesCasal,
  formatarNumero,
} from '@/utilitarios/formatacao'

const props = defineProps<{ id: string }>()

const store = useConfirmacoesStore()

const ficha = ref<ExportacaoBuffetDto | null>(null)
const carregando = ref(false)
const falha = ref<FalhaConvidados | null>(null)

const nomes = computed(() =>
  ficha.value ? formatarNomesCasal(ficha.value.casamento.nomePrimeiraPessoa, ficha.value.casamento.nomeSegundaPessoa) : '',
)

const quando = computed(() => {
  if (!ficha.value) {
    return ''
  }
  const data = formatarDataCalendarioComDiaSemana(ficha.value.casamento.data)
  return ficha.value.casamento.horario ? `${data}, ${ficha.value.casamento.horario}` : data
})

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
        :to="{ name: 'painel-confirmacoes', params: { id } }"
        data-teste="voltar-painel"
      >
        {{ TEXTOS_FICHA_BUFFET.voltar }}
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
      class="ficha"
      data-teste="ficha-buffet"
    >
      <header class="ficha__cabecalho">
        <h1 class="ficha__casal">
          {{ nomes }}
        </h1>
        <p class="ficha__quando numeros-tabulares">
          {{ quando }}
        </p>
        <p
          v-if="ficha.casamento.localRecepcao"
          class="ficha__local"
        >
          {{ ficha.casamento.localRecepcao }}
        </p>
        <p class="ficha__gerado">
          {{ TEXTOS_FICHA_BUFFET.gerado(formatarDataHora(ficha.geradoEm)) }}
        </p>
      </header>

      <ResumoCardapio
        class="ficha__bloco"
        :titulo="TEXTOS_FICHA_BUFFET.contagem"
        :linhas="linhasContagem"
      >
        <template
          v-if="ficha.pendentes > 0"
          #rodape
        >
          <span data-teste="ficha-pendentes">{{ TEXTOS_FICHA_BUFFET.pendentes(ficha.pendentes) }}</span>
        </template>
      </ResumoCardapio>

      <section
        class="ficha__secao ficha__bloco"
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
          class="ficha__nota"
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
        <template v-else>
          <dl class="ficha__linhas">
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
          <table
            v-if="ficha.restricoes.pessoas.length > 0"
            class="ficha__tabela"
            data-teste="ficha-restricoes-pessoas"
          >
            <caption class="ficha__legenda-tabela">
              {{ TEXTOS_FICHA_BUFFET.restricoesPorPessoa }}
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  {{ TEXTOS_FICHA_BUFFET.colunaNome }}
                </th>
                <th scope="col">
                  {{ TEXTOS_FICHA_BUFFET.colunaConvite }}
                </th>
                <th scope="col">
                  {{ TEXTOS_FICHA_BUFFET.colunaRestricao }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(pessoa, indiceRestricao) in ficha.restricoes.pessoas"
                :key="`${indiceRestricao}-${pessoa.convite}-${pessoa.nome}`"
              >
                <td>{{ pessoa.nome }}</td>
                <td>{{ pessoa.convite }}</td>
                <td>{{ restricaoPessoa(pessoa) }}</td>
              </tr>
            </tbody>
          </table>
        </template>
      </section>

      <section
        class="ficha__secao"
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
            class="ficha__convite"
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

      <footer class="ficha__rodape">
        {{ TEXTOS_FICHA_BUFFET.rodape }}
      </footer>
    </article>
  </LayoutImpressao>
</template>

<style scoped>
.ficha {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-8);
}

.ficha__cabecalho {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  padding-bottom: var(--p-espaco-4);
  border-bottom: 1px solid var(--p-cor-borda);
}

.ficha__casal {
  font-family: var(--p-fonte-display);
  font-variant-numeric: lining-nums;
  font-size: var(--p-fonte-tamanho-pagina-celular);
  line-height: var(--p-fonte-entrelinha-titulo);
}

.ficha__quando,
.ficha__local {
  margin: 0;
  color: var(--p-cor-texto);
}

.ficha__gerado {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
}

.ficha__bloco {
  max-width: none;
}

.ficha__secao {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-3);
}

.ficha__titulo {
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-secao);
  line-height: var(--p-fonte-entrelinha-titulo);
}

.ficha__nota {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
}

.ficha__linhas {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
  margin: 0;
}

.ficha__linha {
  display: flex;
  align-items: baseline;
  gap: var(--p-espaco-2);
}

.ficha__linha::after {
  order: 1;
  flex: 1;
  min-width: var(--p-espaco-4);
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
  break-inside: avoid;
}

.ficha__legenda-tabela {
  padding-bottom: var(--p-espaco-2);
  font-weight: var(--p-fonte-peso-seminegrito);
  text-align: left;
}

.ficha__tabela th,
.ficha__tabela td {
  padding: var(--p-espaco-2);
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid var(--p-cor-borda);
  overflow-wrap: anywhere;
}

.ficha__tabela th {
  color: var(--p-cor-texto-apoio);
  font-weight: var(--p-fonte-peso-medio);
}

.ficha__convites {
  columns: 1;
  column-gap: var(--p-espaco-8);
}

.ficha__convite {
  margin-bottom: var(--p-espaco-4);
  break-inside: avoid;
}

.ficha__nome-convite {
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-corpo);
  font-weight: var(--p-fonte-peso-seminegrito);
}

.ficha__nome-convite span {
  font-weight: var(--p-fonte-peso-regular);
  color: var(--p-cor-texto-apoio);
}

.ficha__pessoas {
  margin: var(--p-espaco-1) 0 0;
  padding-left: var(--p-espaco-4);
}

.ficha__marcador {
  color: var(--p-cor-texto-apoio);
}

.ficha__rodape {
  padding-top: var(--p-espaco-3);
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
  border-top: 1px solid var(--p-cor-borda);
}

@media (min-width: 640px) {
  .ficha__casal {
    font-size: var(--p-fonte-tamanho-pagina);
  }

  .ficha__convites {
    columns: 2;
  }
}

@media print {
  .ficha {
    gap: 6mm;
  }

  .ficha__convites {
    columns: 2;
  }

  .ficha :deep(.resumo-cardapio) {
    padding: 0;
    border: 0;
  }

  .ficha__casal {
    font-size: 20pt;
  }
}
</style>
