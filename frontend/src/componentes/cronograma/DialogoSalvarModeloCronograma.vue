<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'

import CampoFormulario from '@/componentes/base/CampoFormulario.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import { useFormulario } from '@/composables/useFormulario'
import { useNotificacao } from '@/composables/useNotificacao'
import { breakpoints } from '@/design/tokens'
import { useModelosCronogramaStore } from '@/stores/modelosCronograma'
import {
  TEXTOS_APLICAR_MODELO_CRONOGRAMA,
  TEXTOS_MODELOS_CRONOGRAMA,
  TEXTOS_SALVAR_COMO_MODELO,
} from '@/textos/modelosCronograma'
import {
  LIMITES_MODELO_CRONOGRAMA,
  regraDescricaoModeloCronograma,
  regraNomeModeloCronograma,
} from '@/utilitarios/modelosCronograma'
import { obrigatorio } from '@/utilitarios/validacao'

const props = defineProps<{
  visivel: boolean
  eventoId: string
  horarioCerimonia: string | null
}>()

const emit = defineEmits<{ 'update:visivel': [valor: boolean] }>()

const store = useModelosCronogramaStore()
const roteador = useRouter()
const notificacao = useNotificacao()
const executando = ref(false)
const mensagem = ref<string | null>(null)
const pontosQuebra = { [`${breakpoints.tablet - 1}px`]: 'calc(100vw - 2rem)' }

const formulario = useFormulario(
  { nome: '', descricao: '' },
  { nome: [obrigatorio, regraNomeModeloCronograma], descricao: [regraDescricaoModeloCronograma] },
)

const semHorario = computed(() => props.horarioCerimonia === null)

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
    if (visivel) {
      formulario.redefinir()
      mensagem.value = null
    }
  },
)

function focarNome() {
  void nextTick(() => document.getElementById('salvar-modelo-nome')?.focus())
}

async function salvar() {
  mensagem.value = null
  if (semHorario.value) {
    return
  }
  if (!formulario.validar()) {
    focarNome()
    return
  }
  executando.value = true
  const descricao = formulario.valores.descricao.trim()
  const resultado = await store.salvarDoEvento(props.eventoId, {
    nome: formulario.valores.nome.trim(),
    descricao: descricao === '' ? null : descricao,
  })
  executando.value = false

  if (!resultado.ok) {
    const erroNome = resultado.falha.errosCampos.nome
    if (erroNome) {
      formulario.erros.nome = erroNome
      focarNome()
      return
    }
    mensagem.value =
      resultado.falha.tipo === 'regra' && resultado.falha.mensagem
        ? resultado.falha.mensagem
        : TEXTOS_SALVAR_COMO_MODELO.erroSalvar
    return
  }

  const modelo = resultado.valor
  notificacao.sucesso(TEXTOS_SALVAR_COMO_MODELO.toast(modelo.nome))
  emit('update:visivel', false)
  void roteador.push({ name: 'modelo-cronograma', params: { modeloId: modelo.id } })
}
</script>

<template>
  <Dialog
    v-model:visible="aberto"
    modal
    :header="TEXTOS_SALVAR_COMO_MODELO.titulo"
    :closable="!executando"
    :close-on-escape="!executando"
    :draggable="false"
    :style="{ width: '32rem' }"
    :breakpoints="pontosQuebra"
    data-teste="dialogo-salvar-modelo"
    @show="focarNome"
  >
    <form
      class="dialogo-salvar-modelo"
      novalidate
      @submit.prevent="salvar"
    >
      <MensagemFormulario
        v-if="semHorario"
        variante="alerta"
        :mensagem="TEXTOS_APLICAR_MODELO_CRONOGRAMA.incompletoTitulo"
        data-teste="salvar-modelo-sem-horario"
      />
      <p
        v-else
        class="dialogo-salvar-modelo__nota"
        data-teste="nota-salvar-modelo"
      >
        {{ TEXTOS_SALVAR_COMO_MODELO.nota(horarioCerimonia ?? '') }}
      </p>

      <CampoFormulario
        v-slot="{ id: idEntrada, invalido, descritoPor }"
        :rotulo="TEXTOS_MODELOS_CRONOGRAMA.campoNome"
        id-campo="salvar-modelo-nome"
        obrigatorio
        :erro="formulario.erros.nome"
      >
        <InputText
          :id="idEntrada"
          v-model="formulario.valores.nome"
          autocomplete="off"
          :maxlength="LIMITES_MODELO_CRONOGRAMA.nomeMaximo"
          :placeholder="TEXTOS_MODELOS_CRONOGRAMA.campoNomePlaceholder"
          aria-required="true"
          :invalid="invalido"
          :aria-invalid="invalido"
          :aria-describedby="descritoPor"
          :readonly="executando"
          data-teste="campo-nome-modelo"
          @update:model-value="formulario.revalidarAoDigitar('nome')"
          @blur="formulario.validarAoSair('nome')"
        />
      </CampoFormulario>

      <CampoFormulario
        v-slot="{ id: idEntrada, invalido, descritoPor }"
        :rotulo="TEXTOS_MODELOS_CRONOGRAMA.campoDescricao"
        id-campo="salvar-modelo-descricao"
        :dica="TEXTOS_MODELOS_CRONOGRAMA.campoDescricaoDica(formulario.valores.descricao.length, LIMITES_MODELO_CRONOGRAMA.descricaoMaximo)"
        :erro="formulario.erros.descricao"
      >
        <Textarea
          :id="idEntrada"
          v-model="formulario.valores.descricao"
          rows="3"
          auto-resize
          :maxlength="LIMITES_MODELO_CRONOGRAMA.descricaoMaximo"
          :invalid="invalido"
          :aria-invalid="invalido"
          :aria-describedby="descritoPor"
          :readonly="executando"
          data-teste="campo-descricao-modelo"
        />
      </CampoFormulario>

      <MensagemFormulario
        v-if="mensagem"
        :mensagem="mensagem"
        data-teste="erro-salvar-modelo"
      />
    </form>

    <template #footer>
      <div class="dialogo-salvar-modelo__acoes">
        <Button
          :label="TEXTOS_SALVAR_COMO_MODELO.cancelar"
          severity="secondary"
          text
          :disabled="executando"
          data-teste="cancelar-salvar-modelo"
          @click="aberto = false"
        />
        <Button
          :label="TEXTOS_SALVAR_COMO_MODELO.salvar"
          :loading="executando"
          :disabled="semHorario"
          data-teste="confirmar-salvar-modelo"
          @click="salvar"
        />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.dialogo-salvar-modelo {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-grupo);
}

.dialogo-salvar-modelo__nota {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-secundario);
}

.dialogo-salvar-modelo__acoes {
  display: flex;
  flex-direction: column-reverse;
  gap: var(--p-ritmo-campo);
  width: 100%;
}

.dialogo-salvar-modelo__acoes :deep(.p-button) {
  width: 100%;
}

@media (min-width: 640px) {
  .dialogo-salvar-modelo__acoes {
    flex-direction: row;
    justify-content: flex-end;
  }

  .dialogo-salvar-modelo__acoes :deep(.p-button) {
    width: auto;
  }
}
</style>
