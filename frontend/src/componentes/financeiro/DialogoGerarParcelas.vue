<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'

import CampoFormulario from '@/componentes/base/CampoFormulario.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import { useFormulario } from '@/composables/useFormulario'
import { breakpoints } from '@/design/tokens'
import { useFinanceiroStore } from '@/stores/financeiro'
import { TEXTOS_GERADOR_PARCELAS, TEXTOS_PARCELA } from '@/textos/financeiro'
import type { FornecedorFinanceiroDto } from '@/tipos/financeiro'
import { deCentavos, paraCentavos } from '@/utilitarios/centavos'
import {
  dataValida,
  gerarParcelasLocal,
  LIMITES_PARCELA,
  regraQuantidade,
  regraValorParcela,
  regraVencimento,
  saldoAParcelarCentavos,
} from '@/utilitarios/financeiro'
import { formatarDataCalendarioCurta, formatarMoeda } from '@/utilitarios/formatacao'

const props = defineProps<{ visivel: boolean; eventoId: string; fornecedor: FornecedorFinanceiroDto | null }>()

const emit = defineEmits<{ 'update:visivel': [valor: boolean]; gerado: [mensagem: string] }>()

const store = useFinanceiroStore()
const executando = ref(false)
const mensagem = ref<string | null>(null)
const pontosQuebra = { [`${breakpoints.tablet - 1}px`]: 'calc(100vw - 2rem)' }

const formulario = useFormulario(
  { quantidade: 1 as number | null, valorTotal: null as number | null, primeiroVencimento: '' },
  { quantidade: [regraQuantidade], valorTotal: [regraValorParcela], primeiroVencimento: [regraVencimento] },
)

const saldoCentavos = computed(() =>
  props.fornecedor ? saldoAParcelarCentavos(props.fornecedor.valorContratado, props.fornecedor.parcelas) : 0,
)
const totalCentavos = computed(() => paraCentavos(formulario.valores.valorTotal))
const excedenteCentavos = computed(() => totalCentavos.value - saldoCentavos.value)
const previa = computed(() => {
  const quantidade = formulario.valores.quantidade ?? 0
  if (!dataValida(formulario.valores.primeiroVencimento) || quantidade < 1 || quantidade > LIMITES_PARCELA.quantidadeMaxima) {
    return []
  }
  return gerarParcelasLocal(totalCentavos.value, quantidade, formulario.valores.primeiroVencimento)
})
const valorPequeno = computed(
  () =>
    totalCentavos.value > 0 &&
    (formulario.valores.quantidade ?? 0) > 0 &&
    dataValida(formulario.valores.primeiroVencimento) &&
    previa.value.length === 0,
)
const ultima = computed(() => previa.value[previa.value.length - 1] ?? null)
const podeGerar = computed(() => previa.value.length > 0 && excedenteCentavos.value <= 0 && !executando.value)

const aberto = computed({
  get: () => props.visivel,
  set: (valor: boolean) => {
    if (!valor && !executando.value) {
      emit('update:visivel', false)
    }
  },
})

watch(
  () => props.visivel,
  (visivel) => {
    if (!visivel) {
      return
    }
    formulario.redefinir()
    mensagem.value = null
    formulario.valores.valorTotal = saldoCentavos.value > 0 ? deCentavos(saldoCentavos.value) : null
  },
  { immediate: true },
)

async function gerar() {
  mensagem.value = null
  if (!formulario.validar() || !props.fornecedor) {
    return
  }
  if (excedenteCentavos.value > 0) {
    formulario.erros.valorTotal = TEXTOS_PARCELA.erroSomaExcede(formatarMoeda(deCentavos(excedenteCentavos.value)))
    return
  }
  if (previa.value.length === 0) {
    mensagem.value = TEXTOS_GERADOR_PARCELAS.previaValorPequeno
    return
  }
  executando.value = true
  const resultado = await store.gerarParcelas(props.eventoId, props.fornecedor.fornecedorEventoId, {
    quantidade: formulario.valores.quantidade ?? 1,
    valorTotal: deCentavos(totalCentavos.value),
    primeiroVencimento: formulario.valores.primeiroVencimento,
    observacao: null,
  })
  executando.value = false
  if (!resultado.ok) {
    const campos = resultado.falha.errosCampos
    for (const campo of ['quantidade', 'valorTotal', 'primeiroVencimento'] as const) {
      if (campos[campo]) {
        formulario.erros[campo] = campos[campo]
      }
    }
    if (!campos.quantidade && !campos.valorTotal && !campos.primeiroVencimento) {
      mensagem.value =
        resultado.falha.tipo === 'conflito' ? TEXTOS_PARCELA.erroConcorrencia : (resultado.falha.mensagem ?? TEXTOS_GERADOR_PARCELAS.erro)
    }
    return
  }
  emit('gerado', TEXTOS_GERADOR_PARCELAS.sucesso(previa.value.length, props.fornecedor.nomeEmpresa))
  emit('update:visivel', false)
}
</script>

<template>
  <Dialog
    v-model:visible="aberto"
    class="dialogo-gerar"
    modal
    :header="fornecedor ? TEXTOS_GERADOR_PARCELAS.titulo(fornecedor.nomeEmpresa) : ''"
    :closable="!executando"
    :close-on-escape="!executando"
    :draggable="false"
    :style="{ width: '34rem' }"
    :breakpoints="pontosQuebra"
    data-teste="dialogo-gerar-parcelas"
  >
    <form
      class="dialogo-gerar__formulario"
      novalidate
      @submit.prevent="gerar"
    >
      <div class="dialogo-gerar__linha">
        <CampoFormulario
          v-slot="{ id: idEntrada, invalido, descritoPor }"
          :rotulo="TEXTOS_GERADOR_PARCELAS.campoQuantidade"
          id-campo="gerar-quantidade"
          obrigatorio
          :erro="formulario.erros.quantidade"
        >
          <InputNumber
            v-model="formulario.valores.quantidade"
            :input-id="idEntrada"
            :min="1"
            :max="LIMITES_PARCELA.quantidadeMaxima"
            show-buttons
            :use-grouping="false"
            aria-required="true"
            :invalid="invalido"
            :aria-invalid="invalido"
            :aria-describedby="descritoPor"
            :readonly="executando"
            data-teste="campo-quantidade"
            @update:model-value="formulario.revalidarAoDigitar('quantidade')"
            @blur="formulario.validarAoSair('quantidade')"
          />
        </CampoFormulario>

        <CampoFormulario
          v-slot="{ id: idEntrada, invalido, descritoPor }"
          :rotulo="TEXTOS_GERADOR_PARCELAS.campoPrimeiroVencimento"
          id-campo="gerar-primeiro-vencimento"
          obrigatorio
          :erro="formulario.erros.primeiroVencimento"
        >
          <InputText
            :id="idEntrada"
            v-model="formulario.valores.primeiroVencimento"
            type="date"
            :min="LIMITES_PARCELA.dataMinima"
            :max="LIMITES_PARCELA.dataMaxima"
            aria-required="true"
            :invalid="invalido"
            :aria-invalid="invalido"
            :aria-describedby="descritoPor"
            :readonly="executando"
            data-teste="campo-primeiro-vencimento"
            @update:model-value="formulario.revalidarAoDigitar('primeiroVencimento')"
            @blur="formulario.validarAoSair('primeiroVencimento')"
          />
        </CampoFormulario>
      </div>

      <CampoFormulario
        v-slot="{ id: idEntrada, invalido, descritoPor }"
        :rotulo="TEXTOS_GERADOR_PARCELAS.campoValorTotal"
        id-campo="gerar-valor-total"
        obrigatorio
        :dica="TEXTOS_GERADOR_PARCELAS.dicaValorTotal(formatarMoeda(deCentavos(Math.max(saldoCentavos, 0))))"
        :erro="formulario.erros.valorTotal"
      >
        <InputNumber
          v-model="formulario.valores.valorTotal"
          :input-id="idEntrada"
          mode="currency"
          currency="BRL"
          locale="pt-BR"
          :min="0"
          :max="deCentavos(LIMITES_PARCELA.valorMaximoCentavos)"
          :allow-empty="true"
          aria-required="true"
          :invalid="invalido"
          :aria-invalid="invalido"
          :aria-describedby="descritoPor"
          :readonly="executando"
          data-teste="campo-valor-total"
          @update:model-value="formulario.revalidarAoDigitar('valorTotal')"
          @blur="formulario.validarAoSair('valorTotal')"
        />
      </CampoFormulario>

      <section
        class="dialogo-gerar__previa"
        aria-labelledby="gerar-previa-titulo"
        data-teste="previa-parcelas"
      >
        <h3
          id="gerar-previa-titulo"
          class="dialogo-gerar__previa-titulo"
        >
          {{ TEXTOS_GERADOR_PARCELAS.previaTitulo }}
        </h3>
        <p
          class="somente-leitor-tela"
          aria-live="polite"
        >
          {{ ultima ? TEXTOS_GERADOR_PARCELAS.previaResumo(previa.length, formatarMoeda(deCentavos(ultima.valorCentavos))) : '' }}
        </p>
        <p
          v-if="valorPequeno"
          class="dialogo-gerar__nota dialogo-gerar__nota--alerta"
          data-teste="previa-valor-pequeno"
        >
          {{ TEXTOS_GERADOR_PARCELAS.previaValorPequeno }}
        </p>
        <p
          v-else-if="previa.length === 0"
          class="dialogo-gerar__nota"
        >
          {{ TEXTOS_GERADOR_PARCELAS.previaVazia }}
        </p>
        <template v-else>
          <ol class="dialogo-gerar__lista numeros-tabulares">
            <li
              v-for="parcela in previa"
              :key="parcela.numero"
              class="dialogo-gerar__item"
              :class="{ 'dialogo-gerar__item--ultima': parcela.numero === previa.length && previa.length > 1 }"
              data-teste="previa-item"
            >
              <span class="dialogo-gerar__numero">{{ parcela.numero }}/{{ previa.length }}</span>
              <span>{{ formatarDataCalendarioCurta(parcela.vencimento) }}</span>
              <span class="dialogo-gerar__valor">{{ formatarMoeda(deCentavos(parcela.valorCentavos)) }}</span>
            </li>
          </ol>
          <p class="dialogo-gerar__nota">
            {{ TEXTOS_GERADOR_PARCELAS.notaCentavos }} {{ TEXTOS_GERADOR_PARCELAS.notaMensal }}
          </p>
        </template>
      </section>

      <MensagemFormulario
        v-if="mensagem"
        :mensagem="mensagem"
        data-teste="mensagem-gerar"
      />
    </form>

    <template #footer>
      <Button
        :label="TEXTOS_PARCELA.cancelar"
        severity="secondary"
        text
        :disabled="executando"
        data-teste="cancelar-gerar"
        @click="aberto = false"
      />
      <Button
        :label="TEXTOS_GERADOR_PARCELAS.confirmar(previa.length || (formulario.valores.quantidade ?? 1))"
        :loading="executando"
        :disabled="!podeGerar"
        data-teste="confirmar-gerar"
        @click="gerar"
      />
    </template>
  </Dialog>
</template>

<style scoped>
.dialogo-gerar__formulario {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-grupo);
}

.dialogo-gerar__linha {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-grupo);
}

.dialogo-gerar__previa {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  padding: var(--p-ritmo-grupo);
  background: var(--p-cor-superficie-sutil);
  border: 1px solid var(--p-cor-divisoria);
  border-radius: var(--p-raio-controle);
}

.dialogo-gerar .dialogo-gerar__previa-titulo {
  margin: 0;
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-rotulo);
  font-weight: var(--p-fonte-peso-medio);
  line-height: 1.33;
  letter-spacing: var(--p-fonte-espacamento-letras-rotulo);
  text-transform: uppercase;
  color: var(--p-cor-texto-apoio);
}

.dialogo-gerar__lista {
  max-height: calc(var(--p-espaco-16) * 3.5);
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

.dialogo-gerar__item {
  display: grid;
  grid-template-columns: var(--p-espaco-12) minmax(0, 1fr) auto;
  gap: var(--p-espaco-3);
  padding: var(--p-espaco-1) 0;
  font-size: var(--p-fonte-tamanho-controle);
}

.dialogo-gerar__item + .dialogo-gerar__item {
  border-top: 1px solid var(--p-cor-divisoria);
}

.dialogo-gerar__item--ultima .dialogo-gerar__valor {
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto);
}

.dialogo-gerar__numero {
  color: var(--p-cor-texto-apoio);
}

.dialogo-gerar__nota {
  margin: 0;
  font-size: var(--p-fonte-tamanho-apoio);
  line-height: var(--p-fonte-entrelinha-corpo);
  color: var(--p-cor-texto-apoio);
}

.dialogo-gerar__nota--alerta {
  color: var(--p-cor-alerta-texto);
}

@media (min-width: 640px) {
  .dialogo-gerar__linha {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
