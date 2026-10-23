<script setup lang="ts">
import ContatoUmToque from '@/componentes/base/ContatoUmToque.vue'
import { TEXTOS_GRANDE_DIA } from '@/textos/grandeDia'
import type { FornecedorDoDia } from '@/tipos/grandeDia'
import { rotuloCategoria } from '@/utilitarios/cronogramaPublico'
import { urlTelefone, urlWhatsapp } from '@/utilitarios/fornecedores'

withDefaults(defineProps<{ fornecedores: FornecedorDoDia[]; mostrarSituacao?: boolean }>(), { mostrarSituacao: false })

function detalhe(fornecedor: FornecedorDoDia): string {
  const quando = fornecedor.encerrado ? TEXTOS_GRANDE_DIA.fornecedorEncerrado : TEXTOS_GRANDE_DIA.fornecedorAs(fornecedor.inicio)
  return [rotuloCategoria(fornecedor.categoria), fornecedor.contato, quando].filter((parte): parte is string => Boolean(parte)).join(' · ')
}

function situacao(fornecedor: FornecedorDoDia): string | null {
  if (fornecedor.situacao === 'Agora') {
    return TEXTOS_GRANDE_DIA.situacaoAgora
  }
  return fornecedor.situacao === 'Proximo' ? TEXTOS_GRANDE_DIA.situacaoProximo : null
}

function temContato(fornecedor: FornecedorDoDia): boolean {
  return Boolean(urlTelefone(fornecedor.telefone) || urlWhatsapp(fornecedor.telefone))
}
</script>

<template>
  <ul
    class="fornecedores-dia"
    data-teste="fornecedores-dia"
  >
    <li
      v-for="fornecedor in fornecedores"
      :key="fornecedor.chave"
      class="fornecedores-dia__item"
      data-teste="fornecedor-dia"
    >
      <div class="fornecedores-dia__texto">
        <p class="fornecedores-dia__nome">
          <span>{{ fornecedor.nomeEmpresa }}</span>
          <span
            v-if="mostrarSituacao && situacao(fornecedor)"
            class="fornecedores-dia__situacao"
            data-teste="fornecedor-dia-situacao"
          >{{ situacao(fornecedor) }}</span>
        </p>
        <p class="fornecedores-dia__detalhe">
          {{ detalhe(fornecedor) }}
        </p>
      </div>
      <ContatoUmToque
        v-if="temContato(fornecedor)"
        :nome="fornecedor.nomeEmpresa"
        :telefone="fornecedor.telefone"
      />
      <p
        v-else
        class="fornecedores-dia__sem-telefone"
        data-teste="fornecedor-dia-sem-telefone"
      >
        {{ TEXTOS_GRANDE_DIA.semTelefone }}
      </p>
    </li>
  </ul>
</template>

<style scoped>
.fornecedores-dia {
  margin: 0;
  padding: 0;
  list-style: none;
}

.fornecedores-dia__item {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
  padding: var(--p-espaco-3) 0;
  border-top: 1px solid var(--p-cor-operacao-divisoria);
}

.fornecedores-dia__item:first-child {
  padding-top: 0;
  border-top: 0;
}

.fornecedores-dia__texto {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  min-width: 0;
}

.fornecedores-dia__nome {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-1) var(--p-espaco-3);
  align-items: baseline;
  margin: 0;
  font-size: var(--p-fonte-tamanho-titulo);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-operacao-texto);
  overflow-wrap: anywhere;
}

.fornecedores-dia__situacao {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-operacao-destaque);
}

.fornecedores-dia__detalhe,
.fornecedores-dia__sem-telefone {
  margin: 0;
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-operacao-apoio);
  overflow-wrap: anywhere;
}
</style>
