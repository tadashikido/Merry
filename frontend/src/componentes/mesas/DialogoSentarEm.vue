<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import RadioButton from 'primevue/radiobutton'

import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import OcupacaoMesa from '@/componentes/base/OcupacaoMesa.vue'
import { breakpoints } from '@/design/tokens'
import { TEXTOS_MESAS } from '@/textos/mesas'
import { vocabularioOuNeutro } from '@/textos/tiposEvento'
import type { TipoEvento } from '@/tipos/eventos'
import type { MesaDto, PessoaMesaDto } from '@/tipos/mesas'
import { opcoesSentar, rotuloMesa } from '@/utilitarios/mesas'

const props = withDefaults(
  defineProps<{
    visivel: boolean
    mesas: MesaDto[]
    selecionadas: PessoaMesaDto[]
    executando?: boolean
    mensagem?: string | null
    podeCriarMesa?: boolean
    tipoEvento?: TipoEvento | null
  }>(),
  { executando: false, mensagem: null, podeCriarMesa: true, tipoEvento: null },
)

const emit = defineEmits<{ 'update:visivel': [valor: boolean]; escolher: [mesaId: string]; 'criar-mesa': [] }>()

const escolhida = ref<string | null>(null)
const pontosQuebra = { [`${breakpoints.tablet - 1}px`]: '100vw' }

const rotuloEspecial = computed(() => vocabularioOuNeutro(props.tipoEvento).mesaEspecial)
const opcoes = computed(() => opcoesSentar(props.mesas, props.selecionadas))
const titulo = computed(() => TEXTOS_MESAS.sentarTitulo(props.selecionadas.length))

const aberto = computed({
  get: () => props.visivel,
  set: (valor: boolean) => {
    if (!valor && !props.executando) {
      emit('update:visivel', false)
    }
  },
})

watch(
  () => props.visivel,
  (visivel) => {
    if (visivel) {
      escolhida.value = null
    }
  },
)

watch(opcoes, (atuais) => {
  if (escolhida.value && !atuais.some((opcao) => opcao.mesa.id === escolhida.value && opcao.cabe)) {
    escolhida.value = null
  }
})

function situacao(opcao: (typeof opcoes.value)[number]): string {
  if (opcao.atual) {
    return TEXTOS_MESAS.mesaAtual
  }
  if (opcao.livres === 0) {
    return TEXTOS_MESAS.completa
  }
  return opcao.cabe ? TEXTOS_MESAS.livresOpcao(opcao.livres) : TEXTOS_MESAS.soLivres(opcao.livres)
}

function confirmar() {
  if (escolhida.value) {
    emit('escolher', escolhida.value)
  }
}
</script>

<template>
  <Dialog
    v-model:visible="aberto"
    class="dialogo-sentar"
    modal
    :header="titulo"
    :closable="!executando"
    :close-on-escape="!executando"
    :draggable="false"
    :style="{ width: '32rem' }"
    :breakpoints="pontosQuebra"
    data-teste="dialogo-sentar"
  >
    <div
      v-if="mesas.length === 0"
      class="dialogo-sentar__vazio"
    >
      <p>{{ TEXTOS_MESAS.semMesasDialogo }}</p>
      <Button
        v-if="podeCriarMesa"
        :label="TEXTOS_MESAS.novaMesa"
        icon="ie ie-mais"
        severity="secondary"
        outlined
        data-teste="sentar-criar-mesa"
        @click="emit('criar-mesa')"
      />
    </div>
    <fieldset
      v-else
      class="dialogo-sentar__opcoes"
    >
      <legend class="somente-leitor-tela">
        {{ TEXTOS_MESAS.sentarRotuloGrupo }}
      </legend>
      <div
        v-for="opcao in opcoes"
        :key="opcao.mesa.id"
        class="dialogo-sentar__opcao"
        :class="{
          'dialogo-sentar__opcao--indisponivel': !opcao.cabe,
          'dialogo-sentar__opcao--escolhida': escolhida === opcao.mesa.id,
          'dialogo-sentar__opcao--especial': opcao.mesa.especial,
        }"
        data-teste="opcao-mesa"
      >
        <RadioButton
          v-model="escolhida"
          :input-id="`sentar-${opcao.mesa.id}`"
          name="sentar-mesa"
          :value="opcao.mesa.id"
          :disabled="!opcao.cabe || executando"
          :aria-describedby="`sentar-${opcao.mesa.id}-situacao`"
        />
        <label
          :for="`sentar-${opcao.mesa.id}`"
          class="dialogo-sentar__rotulo"
        >{{ rotuloMesa(opcao.mesa, rotuloEspecial) }}</label>
        <OcupacaoMesa
          :ocupados="opcao.mesa.ocupacao"
          :lugares="opcao.mesa.capacidade"
          compacta
        />
        <span
          :id="`sentar-${opcao.mesa.id}-situacao`"
          class="dialogo-sentar__situacao"
        >{{ situacao(opcao) }}</span>
      </div>
    </fieldset>

    <MensagemFormulario
      v-if="mensagem"
      class="dialogo-sentar__mensagem"
      :mensagem="mensagem"
      data-teste="mensagem-sentar"
    />

    <template #footer>
      <Button
        :label="TEXTOS_MESAS.cancelar"
        severity="secondary"
        text
        :disabled="executando"
        data-teste="cancelar-sentar"
        @click="aberto = false"
      />
      <Button
        v-if="mesas.length > 0"
        :label="TEXTOS_MESAS.sentarConfirmar"
        :disabled="!escolhida"
        :loading="executando"
        data-teste="confirmar-sentar"
        @click="confirmar"
      />
    </template>
  </Dialog>
</template>

<style scoped>
.dialogo-sentar__vazio {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--p-ritmo-grupo);
}

.dialogo-sentar__vazio p {
  margin: 0;
}

.dialogo-sentar__opcoes {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  margin: 0;
  padding: 0;
  border: 0;
}

.dialogo-sentar__opcao {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: calc(var(--p-ritmo-campo) / 2) var(--p-ritmo-grupo);
  min-block-size: var(--p-dimensao-alvo-toque-movel);
  padding: var(--p-ritmo-campo) var(--p-ritmo-grupo);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-controle);
}

.dialogo-sentar__opcao--especial {
  border-inline-start: var(--p-dimensao-fio-cronograma) solid var(--p-cor-acento);
}

.dialogo-sentar__opcao--escolhida {
  background: var(--p-cor-primaria-suave);
  border-color: var(--p-cor-primaria);
}

.dialogo-sentar__opcao--indisponivel .dialogo-sentar__rotulo {
  color: var(--p-cor-texto-apoio);
}

.dialogo-sentar__rotulo {
  font-weight: var(--p-fonte-peso-medio);
  cursor: pointer;
}

.dialogo-sentar__situacao {
  grid-column: 2 / -1;
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.dialogo-sentar__opcao :deep(.ocupacao-mesa) {
  justify-self: end;
}

.dialogo-sentar__mensagem {
  margin-top: var(--p-ritmo-grupo);
}
</style>
