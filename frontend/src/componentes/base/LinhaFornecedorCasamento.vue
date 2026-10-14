<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { RouterLink } from 'vue-router'

import BadgeStatus from './BadgeStatus.vue'
import CanaisContato from './CanaisContato.vue'
import { ROTULOS_STATUS_FORNECEDOR_CASAMENTO, TEXTOS_FORNECEDORES_CASAMENTO } from '@/textos/fornecedoresCasamento'
import { TEXTOS_PARCELAS_FORNECEDOR } from '@/textos/financeiro'
import type { ResumoParcelasVinculoDto, StatusFornecedorCasamento } from '@/tipos/fornecedoresCasamento'
import { formatarDataCalendarioCurta, formatarMoeda } from '@/utilitarios/formatacao'
import { VARIANTES_STATUS_FORNECEDOR_CASAMENTO } from '@/utilitarios/fornecedoresCasamento'

const props = withDefaults(
  defineProps<{
    nomeEmpresa: string
    status: StatusFornecedorCasamento
    servico?: string | null
    valorOrcado?: number | null
    valorContratado?: number | null
    possuiContrato?: boolean
    destino?: RouteLocationRaw | null
    fornecedorArquivado?: boolean
    telefone?: string | null
    email?: string | null
    site?: string | null
    instagram?: string | null
    parcelas?: ResumoParcelasVinculoDto | null
  }>(),
  {
    servico: null,
    valorOrcado: null,
    valorContratado: null,
    possuiContrato: false,
    destino: null,
    fornecedorArquivado: false,
    telefone: null,
    email: null,
    site: null,
    instagram: null,
    parcelas: null,
  },
)

const cancelado = computed(() => props.status === 'Cancelado')
const orcado = computed(() => (props.valorOrcado === null ? '—' : formatarMoeda(props.valorOrcado)))
const contratado = computed(() => (props.valorContratado === null ? '—' : formatarMoeda(props.valorContratado)))
const resumoParcelas = computed(() => {
  const parcelas = props.parcelas
  if (!parcelas || parcelas.quantidade === 0) {
    return null
  }
  const partes = [TEXTOS_PARCELAS_FORNECEDOR.resumo(parcelas.pagas, parcelas.quantidade)]
  if (parcelas.proximoVencimento && parcelas.proximoValor !== null) {
    const data = formatarDataCalendarioCurta(parcelas.proximoVencimento).split(' ').slice(0, 2).join(' ')
    partes.push(TEXTOS_PARCELAS_FORNECEDOR.proxima(data, formatarMoeda(parcelas.proximoValor)))
  }
  return partes.join(' · ')
})
</script>

<template>
  <li
    class="linha-vinculo"
    :class="{ 'linha-vinculo--cancelado': cancelado }"
    data-teste="linha-vinculo"
  >
    <div class="linha-vinculo__identidade">
      <span class="linha-vinculo__titulo">
        <RouterLink
          v-if="destino"
          :to="destino"
          class="linha-vinculo__nome"
          data-teste="link-vinculo"
        >{{ nomeEmpresa }}</RouterLink>
        <span
          v-else
          class="linha-vinculo__nome"
        >{{ nomeEmpresa }}</span>
        <BadgeStatus
          :texto="ROTULOS_STATUS_FORNECEDOR_CASAMENTO[status]"
          :variante="VARIANTES_STATUS_FORNECEDOR_CASAMENTO[status]"
          data-teste="status-vinculo"
        />
      </span>
      <span
        v-if="servico"
        class="linha-vinculo__servico"
        data-teste="servico-vinculo"
      >{{ servico }}</span>
      <span
        v-if="fornecedorArquivado"
        class="linha-vinculo__servico"
      >{{ TEXTOS_FORNECEDORES_CASAMENTO.fornecedorArquivado }}</span>
    </div>

    <dl class="linha-vinculo__valores numeros-tabulares">
      <div class="linha-vinculo__valor">
        <dt>{{ TEXTOS_FORNECEDORES_CASAMENTO.rotuloOrcado }}</dt>
        <dd data-teste="orcado-vinculo">
          {{ orcado }}
        </dd>
      </div>
      <div class="linha-vinculo__valor linha-vinculo__valor--contratado">
        <dt>{{ TEXTOS_FORNECEDORES_CASAMENTO.rotuloContratado }}</dt>
        <dd data-teste="contratado-vinculo">
          {{ contratado }}
        </dd>
      </div>
    </dl>

    <div class="linha-vinculo__extras">
      <span
        v-if="resumoParcelas"
        class="linha-vinculo__contrato"
        data-teste="resumo-parcelas-vinculo"
      >
        <span
          class="ie ie-financeiro"
          aria-hidden="true"
        />
        {{ resumoParcelas }}
      </span>
      <BadgeStatus
        v-if="parcelas && parcelas.vencidas > 0"
        :texto="TEXTOS_PARCELAS_FORNECEDOR.vencidas(parcelas.vencidas)"
        variante="erro"
        data-teste="parcelas-vencidas-vinculo"
      />
      <span
        v-if="possuiContrato"
        class="linha-vinculo__contrato"
        data-teste="indicador-contrato"
      >
        <span
          class="ie ie-documento"
          aria-hidden="true"
        />
        {{ TEXTOS_FORNECEDORES_CASAMENTO.indicadorContrato }}
      </span>
      <CanaisContato
        :nome="nomeEmpresa"
        :telefone="telefone"
        :email="email"
        :site="site"
        :instagram="instagram"
        variante="compacta"
      />
    </div>

    <div
      v-if="$slots.acoes"
      class="linha-vinculo__acoes"
    >
      <slot name="acoes" />
    </div>
  </li>
</template>

<style scoped>
.linha-vinculo {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    'identidade acoes'
    'valores valores'
    'extras extras';
  gap: var(--p-espaco-2) var(--p-espaco-3);
  align-items: center;
  padding: var(--p-espaco-3) var(--p-espaco-4);
  list-style: none;
}

.linha-vinculo + .linha-vinculo {
  border-top: 1px solid var(--p-cor-divisoria);
}

.linha-vinculo__identidade {
  display: flex;
  grid-area: identidade;
  flex-direction: column;
  gap: var(--p-espaco-1);
  min-width: 0;
}

.linha-vinculo__titulo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-espaco-2);
}

.linha-vinculo__nome {
  font-size: var(--p-fonte-tamanho-titulo);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto);
  text-decoration: none;
  overflow-wrap: anywhere;
}

a.linha-vinculo__nome:hover {
  color: var(--p-cor-primaria);
  text-decoration: underline;
}

.linha-vinculo__servico {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
  overflow-wrap: anywhere;
}

.linha-vinculo__valores {
  display: flex;
  grid-area: valores;
  flex-wrap: wrap;
  gap: var(--p-espaco-1) var(--p-espaco-5);
  margin: 0;
}

.linha-vinculo__valor {
  display: flex;
  align-items: baseline;
  gap: var(--p-espaco-2);
}

.linha-vinculo__valor dt {
  font-size: var(--p-fonte-tamanho-rotulo);
  color: var(--p-cor-texto-apoio);
}

.linha-vinculo__valor dd {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-secundario);
}

.linha-vinculo__valor--contratado dd {
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto);
}

.linha-vinculo__extras {
  display: flex;
  grid-area: extras;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-espaco-2) var(--p-espaco-4);
}

.linha-vinculo__contrato {
  display: inline-flex;
  align-items: center;
  gap: var(--p-espaco-1);
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-secundario);
}

.linha-vinculo__acoes {
  grid-area: acoes;
  align-self: start;
}

.linha-vinculo--cancelado .linha-vinculo__nome,
.linha-vinculo--cancelado .linha-vinculo__valor dd {
  color: var(--p-cor-texto-apoio);
}

@media (min-width: 1024px) {
  .linha-vinculo {
    grid-template-columns: minmax(0, 2fr) minmax(0, 2fr) minmax(0, 1.5fr) auto;
    grid-template-areas: 'identidade valores extras acoes';
    gap: var(--p-espaco-4);
  }

  .linha-vinculo__valores {
    flex-direction: column;
  }

  .linha-vinculo__valor {
    justify-content: space-between;
  }

  .linha-vinculo__extras {
    justify-content: flex-end;
  }

  .linha-vinculo__acoes {
    align-self: center;
  }
}
</style>
