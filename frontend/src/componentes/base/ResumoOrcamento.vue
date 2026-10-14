<script setup lang="ts">
import { computed, useId } from 'vue'

import BadgeStatus from './BadgeStatus.vue'
import { ROTULOS_CATEGORIA_FORNECEDOR } from '@/textos/fornecedores'
import { TEXTOS_REGUA_PAGAMENTOS } from '@/textos/financeiro'
import { TEXTOS_RESUMO_ORCAMENTO } from '@/textos/fornecedoresCasamento'
import type { ResumoOrcamentoDto } from '@/tipos/fornecedoresCasamento'
import { paraCentavos } from '@/utilitarios/centavos'
import { formatarMoeda } from '@/utilitarios/formatacao'
import { excedenteOrcamento, proporcaoContratada, proporcoesPagamento } from '@/utilitarios/fornecedoresCasamento'

const props = withDefaults(defineProps<{ resumo: ResumoOrcamentoDto; exibirPagamentos?: boolean }>(), {
  exibirPagamentos: false,
})

const idTitulo = `resumo-orcamento-${useId()}`

function percentual(valor: number): string {
  return `${Math.round(valor * 1000) / 10}%`
}

const linhas = computed(() =>
  props.resumo.categorias.map((categoria) => {
    const excedente = excedenteOrcamento(categoria)
    const proporcoes = proporcoesPagamento(categoria.orcado, categoria.contratado, categoria.pago ?? 0)
    const vencido = categoria.vencido ?? 0
    return {
      chave: categoria.categoria,
      rotulo: ROTULOS_CATEGORIA_FORNECEDOR[categoria.categoria],
      contratado: categoria.contratado > 0 ? formatarMoeda(categoria.contratado) : null,
      orcado: categoria.orcado > 0 ? formatarMoeda(categoria.orcado) : null,
      pago: formatarMoeda(categoria.pago ?? 0),
      semValores: categoria.contratado <= 0 && categoria.orcado <= 0,
      preenchimento: `${Math.round(proporcaoContratada(categoria) * 100)}%`,
      preenchimentoPago: percentual(proporcoes.pago),
      preenchimentoAPagar: percentual(proporcoes.aPagar),
      excedente: excedente > 0 ? TEXTOS_RESUMO_ORCAMENTO.acimaDoOrcado(formatarMoeda(excedente)) : null,
      vencido: paraCentavos(vencido) > 0 ? TEXTOS_REGUA_PAGAMENTOS.vencidos(formatarMoeda(vencido)) : null,
    }
  }),
)

const totalPago = computed(() => props.resumo.totalPago ?? 0)
const totalVencido = computed(() => props.resumo.totalVencido ?? 0)
const proporcoesTotais = computed(() =>
  proporcoesPagamento(props.resumo.totalOrcado, props.resumo.totalContratado, totalPago.value),
)
const reguaTotalAria = computed(() => {
  const { pago, aPagar, livre } = proporcoesTotais.value
  return TEXTOS_REGUA_PAGAMENTOS.reguaAria(Math.round(pago * 100), Math.round(aPagar * 100), Math.round(livre * 100))
})
const apoioPagamentos = computed(() =>
  TEXTOS_REGUA_PAGAMENTOS.apoio(
    formatarMoeda(props.resumo.totalPendente ?? 0),
    paraCentavos(totalVencido.value) > 0 ? formatarMoeda(totalVencido.value) : null,
    formatarMoeda(props.resumo.totalOrcado),
  ),
)

const totalExcedente = computed(() =>
  excedenteOrcamento({ orcado: props.resumo.totalOrcado, contratado: props.resumo.totalContratado }),
)
</script>

<template>
  <section
    class="resumo-orcamento"
    :aria-labelledby="idTitulo"
    data-teste="resumo-orcamento"
  >
    <h2
      :id="idTitulo"
      class="resumo-orcamento__titulo"
    >
      {{ TEXTOS_RESUMO_ORCAMENTO.titulo }}
    </h2>
    <p
      v-if="exibirPagamentos"
      class="resumo-orcamento__frase"
      data-teste="resumo-frase"
    >
      <span class="resumo-orcamento__numero">{{ formatarMoeda(totalPago) }}</span> <span class="resumo-orcamento__ligacao">{{ TEXTOS_REGUA_PAGAMENTOS.pagosDe }}</span> <span class="resumo-orcamento__numero resumo-orcamento__numero--orcado">{{ formatarMoeda(resumo.totalContratado) }}</span> <span class="resumo-orcamento__ligacao">{{ TEXTOS_REGUA_PAGAMENTOS.contratados }}</span>
    </p>
    <p
      v-else
      class="resumo-orcamento__frase"
      data-teste="resumo-frase"
    >
      <span class="resumo-orcamento__numero">{{ formatarMoeda(resumo.totalContratado) }}</span> <span class="resumo-orcamento__ligacao">{{ TEXTOS_RESUMO_ORCAMENTO.contratadosDe }}</span> <span class="resumo-orcamento__numero resumo-orcamento__numero--orcado">{{ formatarMoeda(resumo.totalOrcado) }}</span> <span class="resumo-orcamento__ligacao">{{ TEXTOS_RESUMO_ORCAMENTO.orcados }}</span>
    </p>
    <p class="resumo-orcamento__apoio">
      <span
        v-if="exibirPagamentos"
        data-teste="resumo-apoio"
      >{{ apoioPagamentos }}</span>
      <span
        v-else
        data-teste="resumo-apoio"
      >{{ TEXTOS_RESUMO_ORCAMENTO.apoio(resumo.quantidadeFornecedores, resumo.quantidadeContratados) }}</span>
      <BadgeStatus
        v-if="totalExcedente > 0"
        :texto="TEXTOS_RESUMO_ORCAMENTO.acimaDoOrcado(formatarMoeda(totalExcedente))"
        variante="alerta"
        icone="aviso"
        data-teste="resumo-excedente-total"
      />
    </p>

    <div
      v-if="exibirPagamentos"
      class="resumo-orcamento__regua-total"
      data-teste="resumo-regua-total"
    >
      <span
        class="resumo-orcamento__faixa"
        role="img"
        :aria-label="reguaTotalAria"
      >
        <span
          class="resumo-orcamento__camada resumo-orcamento__camada--pago"
          :style="{ inlineSize: percentual(proporcoesTotais.pago) }"
        />
        <span
          class="resumo-orcamento__camada resumo-orcamento__camada--a-pagar"
          :style="{ inlineSize: percentual(proporcoesTotais.aPagar) }"
        />
      </span>
      <ul
        class="resumo-orcamento__legenda"
        aria-hidden="true"
      >
        <li class="resumo-orcamento__legenda-item">
          <span class="resumo-orcamento__amostra resumo-orcamento__amostra--pago" />{{ TEXTOS_REGUA_PAGAMENTOS.legendaPago }}
        </li>
        <li class="resumo-orcamento__legenda-item">
          <span class="resumo-orcamento__amostra resumo-orcamento__amostra--a-pagar" />{{ TEXTOS_REGUA_PAGAMENTOS.legendaAPagar }}
        </li>
        <li class="resumo-orcamento__legenda-item">
          <span class="resumo-orcamento__amostra resumo-orcamento__amostra--livre" />{{ TEXTOS_REGUA_PAGAMENTOS.legendaLivre }}
        </li>
      </ul>
    </div>

    <table
      class="resumo-orcamento__tabela"
      role="table"
      data-teste="resumo-tabela"
    >
      <caption class="somente-leitor-tela">
        {{ exibirPagamentos ? TEXTOS_REGUA_PAGAMENTOS.legenda : TEXTOS_RESUMO_ORCAMENTO.legenda }}
      </caption>
      <thead
        class="somente-leitor-tela"
        role="rowgroup"
      >
        <tr role="row">
          <th
            scope="col"
            role="columnheader"
          >
            {{ TEXTOS_RESUMO_ORCAMENTO.colunaCategoria }}
          </th>
          <th
            scope="col"
            role="columnheader"
          >
            {{ TEXTOS_RESUMO_ORCAMENTO.colunaProporcao }}
          </th>
          <th
            scope="col"
            role="columnheader"
          >
            {{ exibirPagamentos ? TEXTOS_REGUA_PAGAMENTOS.colunaPago : TEXTOS_RESUMO_ORCAMENTO.colunaContratado }}
          </th>
          <th
            scope="col"
            role="columnheader"
          >
            {{ exibirPagamentos ? TEXTOS_RESUMO_ORCAMENTO.colunaContratado : TEXTOS_RESUMO_ORCAMENTO.colunaOrcado }}
          </th>
        </tr>
      </thead>
      <tbody role="rowgroup">
        <tr
          v-for="linha in linhas"
          :key="linha.chave"
          role="row"
          class="resumo-orcamento__linha"
          :data-teste="`resumo-categoria-${linha.chave}`"
        >
          <th
            scope="row"
            role="rowheader"
            class="resumo-orcamento__categoria"
          >
            {{ linha.rotulo }}
          </th>
          <td
            class="resumo-orcamento__regua-celula"
            role="cell"
          >
            <span
              class="resumo-orcamento__regua"
              :class="{ 'resumo-orcamento__regua--excedida': linha.excedente && !exibirPagamentos, 'resumo-orcamento__regua--camadas': exibirPagamentos }"
              aria-hidden="true"
            >
              <template v-if="exibirPagamentos">
                <span
                  class="resumo-orcamento__camada resumo-orcamento__camada--pago"
                  :style="{ inlineSize: linha.preenchimentoPago }"
                />
                <span
                  class="resumo-orcamento__camada resumo-orcamento__camada--a-pagar"
                  :style="{ inlineSize: linha.preenchimentoAPagar }"
                />
              </template>
              <span
                v-else
                class="resumo-orcamento__preenchimento"
                :style="{ inlineSize: linha.preenchimento }"
              />
            </span>
          </td>
          <td
            class="resumo-orcamento__valor resumo-orcamento__valor--contratado numeros-tabulares"
            role="cell"
          >
            <template v-if="linha.semValores">
              <span class="resumo-orcamento__vazio">{{ TEXTOS_RESUMO_ORCAMENTO.semValores }}</span>
            </template>
            <template v-else-if="exibirPagamentos">
              <span
                class="resumo-orcamento__contratado"
                data-teste="resumo-pago"
              >{{ linha.pago }}</span>
              <span
                class="resumo-orcamento__de"
                aria-hidden="true"
              >{{ TEXTOS_REGUA_PAGAMENTOS.pagos }}</span>
              <BadgeStatus
                v-if="linha.vencido"
                :texto="linha.vencido"
                variante="erro"
                data-teste="resumo-vencido"
              />
            </template>
            <template v-else>
              <span class="resumo-orcamento__contratado">{{ linha.contratado ?? '—' }}</span>
              <BadgeStatus
                v-if="linha.excedente"
                :texto="linha.excedente"
                variante="alerta"
                icone="aviso"
                data-teste="resumo-excedente"
              />
            </template>
          </td>
          <td
            class="resumo-orcamento__valor resumo-orcamento__valor--orcado numeros-tabulares"
            role="cell"
          >
            <span
              v-if="!linha.semValores"
              class="resumo-orcamento__de"
              aria-hidden="true"
            >{{ TEXTOS_RESUMO_ORCAMENTO.de }}</span>
            {{ exibirPagamentos ? (linha.contratado ?? '—') : (linha.orcado ?? '—') }}
          </td>
        </tr>
      </tbody>
      <tfoot role="rowgroup">
        <tr
          class="resumo-orcamento__linha resumo-orcamento__linha--total"
          role="row"
        >
          <th
            scope="row"
            role="rowheader"
            class="resumo-orcamento__categoria"
          >
            {{ TEXTOS_RESUMO_ORCAMENTO.total }}
          </th>
          <td
            class="resumo-orcamento__regua-celula"
            role="cell"
          />
          <td
            class="resumo-orcamento__valor resumo-orcamento__valor--contratado numeros-tabulares"
            role="cell"
          >
            {{ exibirPagamentos ? formatarMoeda(totalPago) : formatarMoeda(resumo.totalContratado) }}
          </td>
          <td
            class="resumo-orcamento__valor resumo-orcamento__valor--orcado numeros-tabulares"
            role="cell"
          >
            <span
              class="resumo-orcamento__de"
              aria-hidden="true"
            >{{ TEXTOS_RESUMO_ORCAMENTO.de }}</span>
            {{ exibirPagamentos ? formatarMoeda(resumo.totalContratado) : formatarMoeda(resumo.totalOrcado) }}
          </td>
        </tr>
      </tfoot>
    </table>
  </section>
</template>

<style scoped>
.resumo-orcamento {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
  padding: var(--p-espaco-5) var(--p-espaco-4);
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.resumo-orcamento .resumo-orcamento__titulo {
  margin: 0;
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-apoio);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto-secundario);
}

.resumo-orcamento__frase {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 var(--p-espaco-2);
  margin: 0;
}

.resumo-orcamento__numero {
  font-family: var(--p-fonte-editorial);
  font-size: var(--p-fonte-tamanho-pagina-celular);
  font-weight: var(--p-fonte-peso-seminegrito);
  line-height: var(--p-fonte-entrelinha-titulo);
  font-variant-numeric: lining-nums tabular-nums;
  color: var(--p-cor-primaria);
}

.resumo-orcamento__numero--orcado {
  color: var(--p-cor-texto);
}

.resumo-orcamento__ligacao {
  font-size: var(--p-fonte-tamanho-corpo);
  color: var(--p-cor-texto-secundario);
}

.resumo-orcamento__apoio {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-espaco-2) var(--p-espaco-3);
  margin: 0;
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.resumo-orcamento__tabela {
  display: block;
  width: 100%;
  margin-top: var(--p-espaco-3);
  border-collapse: collapse;
}

.resumo-orcamento__tabela tbody,
.resumo-orcamento__tabela tfoot {
  display: block;
}

.resumo-orcamento__linha {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    'categoria contratado'
    'orcado orcado'
    'regua regua';
  gap: var(--p-espaco-1) var(--p-espaco-3);
  align-items: center;
  padding: var(--p-espaco-3) 0;
  border-top: 1px solid var(--p-cor-divisoria);
}

.resumo-orcamento__linha--total {
  grid-template-areas:
    'categoria contratado'
    'orcado orcado';
}

.resumo-orcamento__categoria {
  grid-area: categoria;
  padding: 0;
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-seminegrito);
  text-align: start;
  color: var(--p-cor-texto);
}

.resumo-orcamento__regua-celula {
  grid-area: regua;
  padding: 0;
}

.resumo-orcamento__linha--total .resumo-orcamento__regua-celula {
  display: none;
}

.resumo-orcamento__regua {
  display: block;
  height: 6px;
  overflow: hidden;
  background: var(--p-cor-trilho);
  border-radius: var(--p-raio-total);
}

.resumo-orcamento__preenchimento {
  display: block;
  height: 100%;
  background: var(--p-cor-primaria);
  border-radius: var(--p-raio-total);
  transition: inline-size var(--p-duracao-lenta) ease-out;
}

.resumo-orcamento__regua--camadas,
.resumo-orcamento__faixa {
  display: flex;
  gap: 2px;
}

.resumo-orcamento__faixa {
  height: var(--p-espaco-3);
  overflow: hidden;
  background: var(--p-cor-trilho);
  border-radius: var(--p-raio-controle);
}

.resumo-orcamento__camada {
  display: block;
  flex-shrink: 0;
  height: 100%;
  transition: inline-size var(--p-duracao-lenta) ease-out;
}

.resumo-orcamento__camada--pago {
  background: var(--p-cor-primaria);
}

.resumo-orcamento__camada--a-pagar {
  background: var(--p-cor-champagne-claro);
}

.resumo-orcamento__regua-total {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
  margin-top: var(--p-espaco-2);
}

.resumo-orcamento__legenda {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-1) var(--p-espaco-5);
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-secundario);
}

.resumo-orcamento__legenda-item {
  display: inline-flex;
  align-items: center;
  gap: var(--p-espaco-2);
}

.resumo-orcamento__amostra {
  display: inline-block;
  width: var(--p-espaco-2);
  height: var(--p-espaco-2);
  border-radius: var(--p-raio-tag);
}

.resumo-orcamento__amostra--pago {
  background: var(--p-cor-primaria);
}

.resumo-orcamento__amostra--a-pagar {
  background: var(--p-cor-champagne-claro);
}

.resumo-orcamento__amostra--livre {
  background: var(--p-cor-trilho);
  box-shadow: inset 0 0 0 1px var(--p-cor-borda-controle);
}

.resumo-orcamento__regua--excedida .resumo-orcamento__preenchimento {
  background: var(--p-cor-alerta-texto);
}

.resumo-orcamento__valor {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: var(--p-espaco-1) var(--p-espaco-2);
  padding: 0;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto);
  text-align: end;
}

.resumo-orcamento__valor--contratado {
  grid-area: contratado;
}

.resumo-orcamento__valor--orcado {
  grid-area: orcado;
  justify-content: flex-start;
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.resumo-orcamento__linha--total .resumo-orcamento__valor {
  font-weight: var(--p-fonte-peso-seminegrito);
}

.resumo-orcamento__contratado {
  font-weight: var(--p-fonte-peso-seminegrito);
}

.resumo-orcamento__de,
.resumo-orcamento__vazio {
  color: var(--p-cor-texto-apoio);
}

@media (min-width: 640px) {
  .resumo-orcamento {
    padding: var(--p-espaco-6);
  }

  .resumo-orcamento__numero {
    font-size: var(--p-fonte-tamanho-pagina);
  }

  .resumo-orcamento__linha,
  .resumo-orcamento__linha--total {
    grid-template-columns: minmax(0, 3fr) minmax(0, 4fr) minmax(0, 3fr) minmax(0, 3fr);
    grid-template-areas: 'categoria regua contratado orcado';
    gap: var(--p-espaco-4);
  }

  .resumo-orcamento__linha--total .resumo-orcamento__regua-celula {
    display: block;
  }

  .resumo-orcamento__valor--orcado {
    justify-content: flex-end;
    font-size: var(--p-fonte-tamanho-controle);
  }
}

@media (prefers-reduced-motion: reduce) {
  .resumo-orcamento__camada,
  .resumo-orcamento__preenchimento {
    transition: none;
  }
}
</style>
