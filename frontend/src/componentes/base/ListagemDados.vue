<script setup lang="ts" generic="T extends Record<string, unknown>">
import { computed, useId } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'

import EstadoCarregando from './EstadoCarregando.vue'
import EstadoVazio from './EstadoVazio.vue'
import EstadoErro from './EstadoErro.vue'
import type { ColunaListagem } from './tipos'
import { breakpoints } from '@/design/tokens'
import { useTelaPequena } from '@/composables/useTelaPequena'
import { MENSAGENS_PADRAO } from '@/textos/mensagens'
import { ROTULOS_ACOES, ROTULOS_CAMPOS, ROTULOS_LISTAGEM, VALOR_AUSENTE } from '@/textos/rotulos'

const props = withDefaults(
  defineProps<{
    itens: T[]
    colunas: ColunaListagem<T>[]
    chave: keyof T & string
    rotulo: string
    carregando?: boolean
    erro?: string | null
    placeholderBusca?: string
    tituloVazio?: string
    descricaoVazio?: string
    filtrosAtivos?: boolean
    comBusca?: boolean
  }>(),
  {
    carregando: false,
    erro: null,
    placeholderBusca: ROTULOS_CAMPOS.placeholderBusca,
    tituloVazio: MENSAGENS_PADRAO.listaVaziaTitulo,
    descricaoVazio: undefined,
    filtrosAtivos: false,
    comBusca: true,
  },
)

const busca = defineModel<string>('busca', { default: '' })

const emit = defineEmits<{ 'tentar-novamente': []; 'limpar-filtros': [] }>()

const idBusca = useId()
const exibirCartoes = useTelaPequena(`(max-width: ${breakpoints.tablet - 1}px)`)

const temFiltroAplicado = computed(() => props.filtrosAtivos || busca.value.trim() !== '')
const colunaPrincipal = computed(() => props.colunas.find((coluna) => coluna.principal) ?? props.colunas[0])
const colunasSecundarias = computed(() => props.colunas.filter((coluna) => coluna !== colunaPrincipal.value))

function valorCelula(item: T, campo: keyof T & string): string {
  const valor = item[campo]
  if (valor === null || valor === undefined || valor === '') {
    return VALOR_AUSENTE
  }
  return String(valor)
}

function limparFiltros() {
  busca.value = ''
  emit('limpar-filtros')
}
</script>

<template>
  <section
    class="listagem"
    :aria-label="rotulo"
  >
    <div
      v-if="comBusca || $slots.filtros"
      class="listagem__barra"
    >
      <div
        v-if="comBusca"
        class="listagem__busca"
      >
        <label
          class="somente-leitor-tela"
          :for="idBusca"
        >{{ ROTULOS_ACOES.buscar }}</label>
        <IconField>
          <InputIcon
            class="ie ie-busca"
            aria-hidden="true"
          />
          <InputText
            :id="idBusca"
            v-model="busca"
            type="search"
            :placeholder="placeholderBusca"
            :disabled="carregando"
            data-teste="busca-listagem"
          />
        </IconField>
      </div>
      <div
        v-if="$slots.filtros"
        class="listagem__filtros"
      >
        <slot name="filtros" />
      </div>
      <Button
        v-if="temFiltroAplicado"
        class="listagem__limpar"
        :label="ROTULOS_ACOES.limparFiltros"
        severity="secondary"
        text
        data-teste="limpar-filtros"
        @click="limparFiltros"
      />
    </div>

    <div class="listagem__conteudo">
      <EstadoCarregando
        v-if="carregando"
        :variante="exibirCartoes ? 'cartao' : 'lista'"
        :linhas="exibirCartoes ? 3 : 5"
      />

      <EstadoErro
        v-else-if="erro"
        :mensagem="erro"
        @tentar-novamente="emit('tentar-novamente')"
      />

      <EstadoVazio
        v-else-if="itens.length === 0 && temFiltroAplicado"
        :titulo="MENSAGENS_PADRAO.semResultadoTitulo"
        :descricao="MENSAGENS_PADRAO.semResultadoTexto"
        icone="busca"
      >
        <template #acao>
          <Button
            :label="ROTULOS_ACOES.limparFiltros"
            severity="secondary"
            outlined
            @click="limparFiltros"
          />
        </template>
      </EstadoVazio>

      <EstadoVazio
        v-else-if="itens.length === 0"
        :titulo="tituloVazio"
        :descricao="descricaoVazio"
      >
        <template
          v-if="$slots['acao-vazio']"
          #acao
        >
          <slot name="acao-vazio" />
        </template>
      </EstadoVazio>

      <ul
        v-else-if="exibirCartoes"
        class="listagem__cartoes"
        data-teste="listagem-cartoes"
      >
        <li
          v-for="item in itens"
          :key="String(item[chave])"
          class="listagem__cartao"
        >
          <p
            v-if="colunaPrincipal"
            class="listagem__cartao-titulo"
          >
            <slot
              :name="`celula-${colunaPrincipal.campo}`"
              :item="item"
            >
              {{ valorCelula(item, colunaPrincipal.campo) }}
            </slot>
          </p>
          <dl class="listagem__cartao-dados">
            <div
              v-for="coluna in colunasSecundarias"
              :key="coluna.campo"
              class="listagem__cartao-dado"
            >
              <dt>{{ coluna.titulo }}</dt>
              <dd>
                <slot
                  :name="`celula-${coluna.campo}`"
                  :item="item"
                >
                  {{ valorCelula(item, coluna.campo) }}
                </slot>
              </dd>
            </div>
          </dl>
          <div
            v-if="$slots['acoes-linha']"
            class="listagem__cartao-acoes"
          >
            <slot
              name="acoes-linha"
              :item="item"
            />
          </div>
        </li>
      </ul>

      <DataTable
        v-else
        class="listagem__tabela"
        :value="itens"
        :data-key="chave"
        :table-props="{ 'aria-label': rotulo }"
        data-teste="listagem-tabela"
      >
        <Column
          v-for="coluna in colunas"
          :key="coluna.campo"
          :field="coluna.campo"
          :header="coluna.titulo"
          :sortable="coluna.ordenavel"
          :style="coluna.largura ? { width: coluna.largura } : undefined"
          :class="{ 'listagem__coluna--secundaria': coluna.ocultarNoTablet }"
          :header-class="coluna.ocultarNoTablet ? 'listagem__coluna--secundaria' : undefined"
        >
          <template #body="{ data }">
            <slot
              :name="`celula-${coluna.campo}`"
              :item="data as T"
            >
              {{ valorCelula(data as T, coluna.campo) }}
            </slot>
          </template>
        </Column>
        <Column
          v-if="$slots['acoes-linha']"
          :header="ROTULOS_LISTAGEM.acoes"
          header-class="listagem__coluna-acoes"
        >
          <template #body="{ data }">
            <div class="listagem__acoes-linha">
              <slot
                name="acoes-linha"
                :item="data as T"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>
  </section>
</template>

<style scoped>
.listagem {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-4);
}

.listagem__barra {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-espaco-3);
}

.listagem__busca {
  flex: 1 1 16rem;
  max-width: 24rem;
}

.listagem__busca :deep(.p-iconfield),
.listagem__busca :deep(.p-inputtext) {
  width: 100%;
  min-height: var(--p-dimensao-alvo-toque);
}

.listagem__filtros {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-3);
}

.listagem__conteudo {
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
  overflow: hidden;
}

.listagem__conteudo > .estado-carregando {
  padding: var(--p-espaco-4);
}

.listagem__conteudo > .estado-erro {
  border: 0;
  border-radius: 0;
}

.listagem__tabela :deep(td) {
  font-variant-numeric: tabular-nums;
}

.listagem__tabela :deep(.listagem__coluna-acoes .p-datatable-column-header-content) {
  justify-content: flex-end;
}

.listagem__acoes-linha {
  display: flex;
  justify-content: flex-end;
  gap: var(--p-espaco-1);
}

.listagem__cartoes {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.listagem__cartao {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-3);
  padding: var(--p-espaco-4);
}

.listagem__cartao + .listagem__cartao {
  border-top: 1px solid var(--p-cor-borda);
}

.listagem__cartao-titulo {
  font-weight: var(--p-fonte-peso-seminegrito);
}

.listagem__cartao-dados {
  display: grid;
  gap: var(--p-espaco-2);
  margin: 0;
}

.listagem__cartao-dado {
  display: flex;
  justify-content: space-between;
  gap: var(--p-espaco-4);
  font-size: var(--p-fonte-tamanho-controle);
}

.listagem__cartao-dado dt {
  color: var(--p-cor-texto-apoio);
}

.listagem__cartao-dado dd {
  margin: 0;
  text-align: right;
}

.listagem__cartao-acoes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-2);
}

.listagem__cartao-acoes :deep(.p-button) {
  flex: 1 1 auto;
  min-height: var(--p-dimensao-alvo-toque);
}

@media (max-width: 1023px) {
  .listagem__tabela :deep(.listagem__coluna--secundaria) {
    display: none;
  }
}
</style>
