<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'

import CampoFormulario from '@/componentes/base/CampoFormulario.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import { useFormulario } from '@/composables/useFormulario'
import { breakpoints } from '@/design/tokens'
import { useMesasStore } from '@/stores/mesas'
import { TEXTOS_MESAS } from '@/textos/mesas'
import type { MesaDto } from '@/tipos/mesas'
import { LIMITES_MESA, regraCapacidadeMesa, regraNomeMesa, regraNumeroMesa } from '@/utilitarios/validacaoMesas'
import { rotuloMesa } from '@/utilitarios/mesas'

const props = withDefaults(
  defineProps<{ visivel: boolean; casamentoId: string; mesa?: MesaDto | null; numeroSugerido?: number }>(),
  { mesa: null, numeroSugerido: 1 },
)

const emit = defineEmits<{ 'update:visivel': [valor: boolean]; salvo: [mensagem: string] }>()

const store = useMesasStore()
const executando = ref(false)
const mensagem = ref<string | null>(null)
const pontosQuebra = { [`${breakpoints.tablet - 1}px`]: 'calc(100vw - 2rem)' }

const formulario = useFormulario(
  { numero: null as number | null, nome: '', capacidade: 8 as number | null, especial: false },
  { numero: [regraNumeroMesa], nome: [regraNomeMesa], capacidade: [regraCapacidadeMesa] },
)

const edicao = computed(() => props.mesa !== null)
const titulo = computed(() => (props.mesa ? TEXTOS_MESAS.formEditar(rotuloMesa(props.mesa)) : TEXTOS_MESAS.formNova))

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
    if (props.mesa) {
      formulario.valores.numero = props.mesa.numero
      formulario.valores.nome = props.mesa.nome ?? ''
      formulario.valores.capacidade = props.mesa.capacidade
      formulario.valores.especial = props.mesa.especial
    } else {
      formulario.valores.numero = props.numeroSugerido
    }
  },
  { immediate: true },
)

async function salvar() {
  mensagem.value = null
  if (!formulario.validar()) {
    return
  }
  const dados = {
    numero: formulario.valores.numero,
    nome: formulario.valores.nome.trim() || null,
    capacidade: formulario.valores.capacidade,
    especial: formulario.valores.especial,
  }
  executando.value = true
  const resultado = props.mesa
    ? await store.atualizarMesa(props.casamentoId, props.mesa.id, dados)
    : await store.criarMesa(props.casamentoId, dados)
  executando.value = false

  if (!resultado.ok) {
    const campos = resultado.falha.errosCampos
    let campoComErro = false
    for (const campo of ['numero', 'nome', 'capacidade'] as const) {
      if (campos[campo]) {
        formulario.erros[campo] = campos[campo]
        campoComErro = true
      }
    }
    if (resultado.falha.tipo === 'conflito') {
      mensagem.value = TEXTOS_MESAS.erroConflito
    } else if (resultado.falha.tipo === 'semPermissao') {
      mensagem.value = TEXTOS_MESAS.erroSemPermissaoAcao
    } else if (resultado.falha.tipo === 'conexao') {
      mensagem.value = TEXTOS_MESAS.erroConexao
    } else if (campos.especial) {
      mensagem.value = campos.especial
    } else if (!campoComErro) {
      mensagem.value = resultado.falha.mensagem ?? TEXTOS_MESAS.erroSalvarMesa
    }
    return
  }
  const rotulo = rotuloMesa(resultado.valor)
  emit('salvo', edicao.value ? TEXTOS_MESAS.mesaSalva(rotulo) : TEXTOS_MESAS.mesaCriada(rotulo))
  emit('update:visivel', false)
}
</script>

<template>
  <Dialog
    v-model:visible="aberto"
    class="dialogo-mesa"
    modal
    :header="titulo"
    :closable="!executando"
    :close-on-escape="!executando"
    :draggable="false"
    :style="{ width: '28rem' }"
    :breakpoints="pontosQuebra"
    data-teste="dialogo-mesa"
  >
    <form
      class="dialogo-mesa__formulario pilha pilha--grupo"
      novalidate
      @submit.prevent="salvar"
    >
      <div class="dialogo-mesa__linha">
        <CampoFormulario
          v-slot="{ id: idEntrada, invalido, descritoPor }"
          :rotulo="TEXTOS_MESAS.campoNumero"
          id-campo="mesa-numero"
          obrigatorio
          :erro="formulario.erros.numero"
        >
          <InputNumber
            v-model="formulario.valores.numero"
            :input-id="idEntrada"
            :min="LIMITES_MESA.numeroMinimo"
            :max="LIMITES_MESA.numeroMaximo"
            :use-grouping="false"
            :allow-empty="true"
            aria-required="true"
            :invalid="invalido"
            :aria-invalid="invalido"
            :aria-describedby="descritoPor"
            :readonly="executando"
            data-teste="campo-numero-mesa"
            @update:model-value="formulario.revalidarAoDigitar('numero')"
            @blur="formulario.validarAoSair('numero')"
          />
        </CampoFormulario>

        <CampoFormulario
          v-slot="{ id: idEntrada, invalido, descritoPor }"
          :rotulo="TEXTOS_MESAS.campoLugares"
          id-campo="mesa-capacidade"
          obrigatorio
          :erro="formulario.erros.capacidade"
        >
          <InputNumber
            v-model="formulario.valores.capacidade"
            :input-id="idEntrada"
            :min="LIMITES_MESA.capacidadeMinima"
            :max="LIMITES_MESA.capacidadeMaxima"
            :allow-empty="true"
            aria-required="true"
            :invalid="invalido"
            :aria-invalid="invalido"
            :aria-describedby="descritoPor"
            :readonly="executando"
            data-teste="campo-capacidade-mesa"
            @update:model-value="formulario.revalidarAoDigitar('capacidade')"
            @blur="formulario.validarAoSair('capacidade')"
          />
        </CampoFormulario>
      </div>

      <CampoFormulario
        v-slot="{ id: idEntrada, invalido, descritoPor }"
        :rotulo="TEXTOS_MESAS.campoNome"
        id-campo="mesa-nome"
        :dica="TEXTOS_MESAS.dicaNome"
        :erro="formulario.erros.nome"
      >
        <InputText
          :id="idEntrada"
          v-model="formulario.valores.nome"
          :maxlength="LIMITES_MESA.nomeMaximo"
          :invalid="invalido"
          :aria-invalid="invalido"
          :aria-describedby="descritoPor"
          :readonly="executando"
          data-teste="campo-nome-mesa"
          @update:model-value="formulario.revalidarAoDigitar('nome')"
          @blur="formulario.validarAoSair('nome')"
        />
      </CampoFormulario>

      <div class="dialogo-mesa__especial">
        <Checkbox
          v-model="formulario.valores.especial"
          input-id="mesa-especial"
          binary
          :disabled="executando"
          aria-describedby="mesa-especial-dica"
          data-teste="campo-especial-mesa"
        />
        <span class="dialogo-mesa__especial-textos">
          <label for="mesa-especial">{{ TEXTOS_MESAS.campoNoivos }}</label>
          <span
            id="mesa-especial-dica"
            class="dialogo-mesa__dica"
          >{{ TEXTOS_MESAS.dicaNoivos }}</span>
        </span>
      </div>

      <MensagemFormulario
        v-if="mensagem"
        :mensagem="mensagem"
        data-teste="mensagem-mesa"
      />
    </form>

    <template #footer>
      <Button
        :label="TEXTOS_MESAS.cancelar"
        severity="secondary"
        text
        :disabled="executando"
        data-teste="cancelar-mesa"
        @click="aberto = false"
      />
      <Button
        :label="edicao ? TEXTOS_MESAS.salvarMesa : TEXTOS_MESAS.criarMesa"
        :loading="executando"
        data-teste="salvar-mesa"
        @click="salvar"
      />
    </template>
  </Dialog>
</template>

<style scoped>
.dialogo-mesa__linha {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  gap: var(--p-ritmo-grupo);
}

.dialogo-mesa__especial {
  display: flex;
  align-items: flex-start;
  gap: var(--p-ritmo-campo);
}

.dialogo-mesa__especial-textos {
  display: flex;
  flex-direction: column;
  gap: calc(var(--p-ritmo-campo) / 2);
}

.dialogo-mesa__especial-textos label {
  font-weight: var(--p-fonte-peso-medio);
  cursor: pointer;
}

.dialogo-mesa__dica {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}
</style>
