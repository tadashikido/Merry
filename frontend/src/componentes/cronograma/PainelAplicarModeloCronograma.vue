<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import Button from 'primevue/button'
import Select from 'primevue/select'

import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import { useNotificacao } from '@/composables/useNotificacao'
import { useCronogramaStore } from '@/stores/cronograma'
import { useModelosCronogramaStore } from '@/stores/modelosCronograma'
import { ROTULOS_DIA_CRONOGRAMA } from '@/textos/cronograma'
import { TEXTOS_APLICAR_MODELO_CRONOGRAMA } from '@/textos/modelosCronograma'
import type { AplicacaoModeloCronogramaDto, ItemPrevistoCronogramaDto } from '@/tipos/modelosCronograma'

const props = defineProps<{ casamentoId: string; podeInformarHorario: boolean }>()

const emit = defineEmits<{ fechar: [] }>()

const cronograma = useCronogramaStore()
const modelos = useModelosCronogramaStore()
const notificacao = useNotificacao()

const modeloSelecionado = ref<string | null>(null)
const previa = ref<AplicacaoModeloCronogramaDto | null>(null)
const carregandoPrevia = ref(false)
const erroPrevia = ref(false)
const aplicando = ref(false)
const erroAplicacao = ref<string | null>(null)

const opcoesModelos = computed(() =>
  (modelos.lista ?? []).map((modelo) => ({
    valor: modelo.id,
    rotulo: TEXTOS_APLICAR_MODELO_CRONOGRAMA.opcaoModelo(modelo.nome, modelo.quantidadeItens),
  })),
)

function ponto(item: ItemPrevistoCronogramaDto): string {
  return TEXTOS_APLICAR_MODELO_CRONOGRAMA.previaPonto(ROTULOS_DIA_CRONOGRAMA[item.dia], item.inicio, item.atividade)
}

const linhasPrevia = computed<string[]>(() => {
  const atual = previa.value
  if (!atual || atual.excedeLimite || atual.semHorarioCerimonia) {
    return []
  }
  if (atual.itensCriados === 0) {
    return [TEXTOS_APLICAR_MODELO_CRONOGRAMA.previaNada]
  }
  const linhas = [TEXTOS_APLICAR_MODELO_CRONOGRAMA.previaCriar(atual.itensCriados)]
  if (atual.primeiroItem && atual.ultimoItem) {
    linhas.push(TEXTOS_APLICAR_MODELO_CRONOGRAMA.previaFaixa(ponto(atual.primeiroItem), ponto(atual.ultimoItem)))
  }
  if (atual.jaAplicados > 0) {
    linhas.push(TEXTOS_APLICAR_MODELO_CRONOGRAMA.previaExistentes(atual.jaAplicados))
  }
  if (atual.fornecedoresPreenchidos > 0) {
    linhas.push(TEXTOS_APLICAR_MODELO_CRONOGRAMA.previaFornecedores(atual.fornecedoresPreenchidos))
  }
  if (atual.itensAjustados > 0) {
    linhas.push(TEXTOS_APLICAR_MODELO_CRONOGRAMA.previaAjustados(atual.itensAjustados))
  }
  return linhas
})

const podeAplicar = computed(
  () =>
    Boolean(modeloSelecionado.value) &&
    previa.value !== null &&
    !previa.value.excedeLimite &&
    !previa.value.semHorarioCerimonia &&
    previa.value.itensCriados > 0 &&
    !carregandoPrevia.value,
)

onMounted(() => {
  void modelos.listar()
  void nextTick(() => document.getElementById('cronograma-modelo')?.focus())
})

watch(
  () => modelos.lista,
  (lista) => {
    if (!lista || lista.length === 0) {
      modeloSelecionado.value = null
      return
    }
    if (!modeloSelecionado.value || !lista.some((modelo) => modelo.id === modeloSelecionado.value)) {
      modeloSelecionado.value = (lista.find((modelo) => modelo.sugerido) ?? lista[0])?.id ?? null
    }
  },
  { immediate: true },
)

watch(
  modeloSelecionado,
  () => {
    void atualizarPrevia()
  },
  { immediate: true },
)

async function atualizarPrevia() {
  const modeloId = modeloSelecionado.value
  if (!modeloId) {
    previa.value = null
    return
  }
  carregandoPrevia.value = true
  erroPrevia.value = false
  erroAplicacao.value = null
  const resultado = await cronograma.previa(props.casamentoId, modeloId)
  if (modeloSelecionado.value !== modeloId) {
    return
  }
  carregandoPrevia.value = false
  if (resultado.ok) {
    previa.value = resultado.valor
  } else {
    previa.value = null
    erroPrevia.value = true
  }
}

async function aplicar() {
  const modeloId = modeloSelecionado.value
  if (!modeloId || !podeAplicar.value) {
    return
  }
  aplicando.value = true
  erroAplicacao.value = null
  const resultado = await cronograma.aplicar(props.casamentoId, modeloId)
  aplicando.value = false

  if (!resultado.ok) {
    if (resultado.falha.tipo === 'conflito') {
      notificacao.erro(TEXTOS_APLICAR_MODELO_CRONOGRAMA.erroConcorrente)
      void cronograma.carregar(props.casamentoId)
      void atualizarPrevia()
      return
    }
    erroAplicacao.value =
      resultado.falha.tipo === 'regra' && resultado.falha.mensagem
        ? resultado.falha.mensagem
        : TEXTOS_APLICAR_MODELO_CRONOGRAMA.erroAplicar
    return
  }

  notificacao.sucesso(TEXTOS_APLICAR_MODELO_CRONOGRAMA.toastAplicado(resultado.valor.itensCriados))
  emit('fechar')
}
</script>

<template>
  <section
    id="painel-aplicar-modelo-cronograma"
    class="painel-aplicar-modelo"
    aria-labelledby="titulo-aplicar-modelo-cronograma"
    data-teste="painel-aplicar-modelo"
  >
    <h2
      id="titulo-aplicar-modelo-cronograma"
      class="painel-aplicar-modelo__titulo"
    >
      {{ TEXTOS_APLICAR_MODELO_CRONOGRAMA.titulo }}
    </h2>

    <p
      v-if="modelos.lista && modelos.lista.length === 0"
      class="painel-aplicar-modelo__texto"
      data-teste="sem-modelos"
    >
      {{ TEXTOS_APLICAR_MODELO_CRONOGRAMA.semModelos }}
      <RouterLink :to="{ name: 'modelos-cronograma' }">
        {{ TEXTOS_APLICAR_MODELO_CRONOGRAMA.gerenciar }}
      </RouterLink>
    </p>

    <template v-else>
      <div class="painel-aplicar-modelo__campo">
        <label
          for="cronograma-modelo"
          class="painel-aplicar-modelo__rotulo"
        >{{ TEXTOS_APLICAR_MODELO_CRONOGRAMA.campoModelo }}</label>
        <Select
          v-model="modeloSelecionado"
          input-id="cronograma-modelo"
          :options="opcoesModelos"
          option-label="rotulo"
          option-value="valor"
          :loading="modelos.carregandoLista"
          :disabled="aplicando"
          data-teste="campo-modelo-cronograma"
        />
        <RouterLink
          class="painel-aplicar-modelo__gerenciar"
          :to="{ name: 'modelos-cronograma' }"
          data-teste="gerenciar-modelos"
        >
          {{ TEXTOS_APLICAR_MODELO_CRONOGRAMA.gerenciar }}
        </RouterLink>
      </div>

      <div
        class="painel-aplicar-modelo__previa"
        role="status"
        aria-live="polite"
        data-teste="previa-modelo-cronograma"
      >
        <p v-if="carregandoPrevia">
          {{ TEXTOS_APLICAR_MODELO_CRONOGRAMA.calculando }}
        </p>
        <p v-else-if="erroPrevia">
          {{ TEXTOS_APLICAR_MODELO_CRONOGRAMA.previaErro }}
        </p>
        <MensagemFormulario
          v-else-if="previa?.semHorarioCerimonia"
          variante="alerta"
          :mensagem="TEXTOS_APLICAR_MODELO_CRONOGRAMA.incompletoTitulo"
          data-teste="previa-sem-horario"
        >
          <p class="painel-aplicar-modelo__texto">
            {{ TEXTOS_APLICAR_MODELO_CRONOGRAMA.incompletoTexto }}
          </p>
          <RouterLink
            v-if="podeInformarHorario"
            :to="{ name: 'casamento-editar', params: { id: casamentoId } }"
            data-teste="previa-adicionar-horario"
          >
            {{ TEXTOS_APLICAR_MODELO_CRONOGRAMA.incompletoAcao }}
          </RouterLink>
        </MensagemFormulario>
        <MensagemFormulario
          v-else-if="previa?.excedeLimite"
          :mensagem="TEXTOS_APLICAR_MODELO_CRONOGRAMA.previaLimite(previa.itensNoCronograma, previa.itensCriados)"
          data-teste="previa-limite"
        />
        <template v-else>
          <p
            v-for="linha in linhasPrevia"
            :key="linha"
          >
            {{ linha }}
          </p>
        </template>
      </div>

      <MensagemFormulario
        v-if="erroAplicacao"
        :mensagem="erroAplicacao"
        data-teste="erro-aplicacao"
      />

      <div class="painel-aplicar-modelo__acoes">
        <Button
          :label="TEXTOS_APLICAR_MODELO_CRONOGRAMA.acao"
          :loading="aplicando"
          :disabled="!podeAplicar"
          data-teste="confirmar-aplicar-modelo"
          @click="aplicar"
        />
        <Button
          :label="TEXTOS_APLICAR_MODELO_CRONOGRAMA.cancelar"
          severity="secondary"
          text
          :disabled="aplicando"
          data-teste="fechar-aplicar-modelo"
          @click="emit('fechar')"
        />
      </div>
    </template>
  </section>
</template>

<style scoped>
.painel-aplicar-modelo {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-4);
  padding: var(--p-espaco-5) var(--p-espaco-4);
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.painel-aplicar-modelo__titulo {
  margin: 0;
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-titulo);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto);
}

.painel-aplicar-modelo__campo {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
}

.painel-aplicar-modelo__rotulo {
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto);
}

.painel-aplicar-modelo__gerenciar {
  align-self: flex-start;
  font-size: var(--p-fonte-tamanho-apoio);
}

.painel-aplicar-modelo__previa {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  min-height: var(--p-espaco-6);
}

.painel-aplicar-modelo__previa p,
.painel-aplicar-modelo__texto {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-secundario);
}

.painel-aplicar-modelo__acoes {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
}

.painel-aplicar-modelo__acoes :deep(.p-button) {
  min-height: var(--p-dimensao-alvo-toque);
}

@media (min-width: 640px) {
  .painel-aplicar-modelo {
    padding: var(--p-espaco-6);
  }

  .painel-aplicar-modelo__acoes {
    flex-direction: row;
  }
}
</style>
