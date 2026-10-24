<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import Textarea from 'primevue/textarea'

import AtalhosPreenchimento from '@/componentes/base/AtalhosPreenchimento.vue'
import CampoFormulario from '@/componentes/base/CampoFormulario.vue'
import CampoSugestoes from '@/componentes/base/CampoSugestoes.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import { useFormulario } from '@/composables/useFormulario'
import { breakpoints } from '@/design/tokens'
import { useCronogramaStore } from '@/stores/cronograma'
import { ROTULOS_DIA_CRONOGRAMA, TEXTOS_CRONOGRAMA } from '@/textos/cronograma'
import { vocabularioOuNeutro } from '@/textos/tiposEvento'
import type { TipoEvento } from '@/tipos/eventos'
import {
  DIAS_CRONOGRAMA,
  type CronogramaDto,
  type DiaCronograma,
  type ItemCronogramaDto,
  type SalvarItemCronogramaRequest,
} from '@/tipos/cronograma'
import {
  duracaoEntre,
  formatarDuracao,
  LIMITES_CRONOGRAMA,
  proximoInicioSugerido,
  regraAtividade,
  regraInicio,
  regraTermino,
  responsaveisUsados,
  terminaNoDiaSeguinte,
  terminoDe,
} from '@/utilitarios/cronograma'
import { tamanhoMaximo } from '@/utilitarios/validacao'

const props = withDefaults(
  defineProps<{
    visivel: boolean
    eventoId: string
    cronograma: CronogramaDto
    item?: ItemCronogramaDto | null
    tipoEvento?: TipoEvento | null
  }>(),
  { item: null, tipoEvento: null },
)

const emit = defineEmits<{
  'update:visivel': [valor: boolean]
  salvo: [item: ItemCronogramaDto, mensagem: string]
  excluir: [item: ItemCronogramaDto]
}>()

const store = useCronogramaStore()
const executando = ref(false)
const mensagem = ref<string | null>(null)
const pontosQuebra = { [`${breakpoints.tablet - 1}px`]: 'calc(100vw - 2rem)' }

let lerInicio: () => string = () => ''

const formulario = useFormulario(
  {
    dia: 'DiaDoEvento' as DiaCronograma,
    inicio: '',
    termino: '',
    atividade: '',
    local: '',
    responsavel: '',
    fornecedorEventoId: null as string | null,
    instrucoes: '',
    notasInternas: '',
  },
  {
    inicio: [regraInicio],
    termino: [regraTermino(() => lerInicio())],
    atividade: [regraAtividade],
    local: [tamanhoMaximo(LIMITES_CRONOGRAMA.local)],
    responsavel: [tamanhoMaximo(LIMITES_CRONOGRAMA.responsavel)],
    instrucoes: [tamanhoMaximo(LIMITES_CRONOGRAMA.texto)],
    notasInternas: [tamanhoMaximo(LIMITES_CRONOGRAMA.texto)],
  },
)

lerInicio = () => formulario.valores.inicio

const edicao = computed(() => props.item !== null)
const opcoesDia = DIAS_CRONOGRAMA.map((valor) => ({ valor, rotulo: ROTULOS_DIA_CRONOGRAMA[valor] }))
const opcoesFornecedor = computed(() => {
  const disponiveis = props.cronograma.fornecedoresDisponiveis.map((fornecedor) => ({
    valor: fornecedor.fornecedorEventoId as string | null,
    rotulo: fornecedor.nomeEmpresa,
  }))
  const atual = props.item?.fornecedor
  if (atual && !disponiveis.some((opcao) => opcao.valor === atual.fornecedorEventoId)) {
    disponiveis.push({ valor: atual.fornecedorEventoId, rotulo: atual.nomeEmpresa })
  }
  return [{ valor: null, rotulo: TEXTOS_CRONOGRAMA.nenhumFornecedor }, ...disponiveis]
})
const locaisDoTipo = computed(() => vocabularioOuNeutro(props.tipoEvento).locais)
const atalhosLocal = computed(() => [
  ...(props.cronograma.localCerimonia
    ? [
        {
          rotulo: TEXTOS_CRONOGRAMA.atalhoLocal(locaisDoTipo.value.principal, props.cronograma.localCerimonia),
          valor: props.cronograma.localCerimonia,
        },
      ]
    : []),
  ...(props.cronograma.localRecepcao && props.cronograma.localRecepcao !== props.cronograma.localCerimonia
    ? [
        {
          rotulo: TEXTOS_CRONOGRAMA.atalhoLocal(locaisDoTipo.value.secundario, props.cronograma.localRecepcao),
          valor: props.cronograma.localRecepcao,
        },
      ]
    : []),
])
const sugestoesResponsavel = computed(() => responsaveisUsados(props.cronograma.itens))
const duracao = computed(() => duracaoEntre(formulario.valores.inicio.trim(), formulario.valores.termino.trim()))
const dicaTermino = computed(() => {
  if (duracao.value === null) {
    return undefined
  }
  const texto = formatarDuracao(duracao.value)
  return terminaNoDiaSeguinte(formulario.valores.inicio.trim(), formulario.valores.termino.trim())
    ? TEXTOS_CRONOGRAMA.dicaDiaSeguinte(texto)
    : TEXTOS_CRONOGRAMA.dicaDuracao(texto)
})
const conflitosAtuais = computed(() => {
  if (!props.item) {
    return []
  }
  const porId = new Map(props.cronograma.itens.map((item) => [item.id, item]))
  const vistos = new Set<string>()
  return props.item.conflitos
    .filter((conflito) => !vistos.has(conflito.itemId) && vistos.add(conflito.itemId))
    .map((conflito) => {
      const outro = porId.get(conflito.itemId)
      const quem = conflito.motivo === 'Fornecedor' ? outro?.fornecedor?.nomeEmpresa : outro?.responsavel
      return TEXTOS_CRONOGRAMA.conflitoNoDialogo(conflito.atividade, conflito.inicio, quem ?? '')
    })
})

const aberto = computed({
  get: () => props.visivel,
  set: (valor: boolean) => {
    if (!valor && !executando.value) {
      emit('update:visivel', false)
    }
  },
})

function preencher(item: ItemCronogramaDto | null) {
  formulario.redefinir()
  mensagem.value = null
  if (!item) {
    return
  }
  formulario.valores.dia = item.dia
  formulario.valores.inicio = item.inicio
  formulario.valores.termino = terminoDe(item.inicio, item.duracaoMinutos)
  formulario.valores.atividade = item.atividade
  formulario.valores.local = item.local ?? ''
  formulario.valores.responsavel = item.responsavel ?? ''
  formulario.valores.fornecedorEventoId = item.fornecedor?.fornecedorEventoId ?? null
  formulario.valores.instrucoes = item.instrucoes ?? ''
  formulario.valores.notasInternas = item.notasInternas ?? ''
}

watch(
  () => props.visivel,
  (visivel) => {
    if (visivel) {
      preencher(props.item)
    }
  },
  { immediate: true },
)

function focarInicio() {
  void nextTick(() => document.getElementById('cronograma-inicio')?.focus())
}

function focarPrimeiroInvalido() {
  const campo = formulario.primeiroCampoInvalido.value
  if (campo) {
    void nextTick(() => document.getElementById(`cronograma-${String(campo)}`)?.focus())
  }
}

function texto(valor: string): string | null {
  const limpo = valor.trim()
  return limpo === '' ? null : limpo
}

function montarRequest(): SalvarItemCronogramaRequest {
  return {
    dia: formulario.valores.dia,
    inicio: formulario.valores.inicio.trim(),
    duracaoMinutos: duracao.value,
    atividade: formulario.valores.atividade.trim(),
    local: texto(formulario.valores.local),
    responsavel: texto(formulario.valores.responsavel),
    fornecedorEventoId: formulario.valores.fornecedorEventoId,
    instrucoes: texto(formulario.valores.instrucoes),
    notasInternas: texto(formulario.valores.notasInternas),
  }
}

const CAMPOS_SERVIDOR: Record<string, keyof typeof formulario.valores> = {
  dia: 'dia',
  inicio: 'inicio',
  duracaoMinutos: 'termino',
  atividade: 'atividade',
  local: 'local',
  responsavel: 'responsavel',
  fornecedorEventoId: 'fornecedorEventoId',
  instrucoes: 'instrucoes',
  notasInternas: 'notasInternas',
}

async function salvar(continuar: boolean) {
  mensagem.value = null
  if (!formulario.validar()) {
    focarPrimeiroInvalido()
    return
  }
  executando.value = true
  const dados = montarRequest()
  const resultado = props.item
    ? await store.atualizar(props.eventoId, props.item.id, dados)
    : await store.criar(props.eventoId, dados)
  executando.value = false

  if (!resultado.ok) {
    let algumCampo = false
    for (const [campoServidor, mensagemCampo] of Object.entries(resultado.falha.errosCampos)) {
      const campo = CAMPOS_SERVIDOR[campoServidor]
      if (campo) {
        formulario.erros[campo] = mensagemCampo
        algumCampo = true
      }
    }
    if (resultado.falha.tipo === 'conflito') {
      mensagem.value = TEXTOS_CRONOGRAMA.erroConcorrencia
    } else if (!algumCampo) {
      mensagem.value = resultado.falha.mensagem ?? TEXTOS_CRONOGRAMA.erroSalvar
    }
    focarPrimeiroInvalido()
    return
  }

  emit('salvo', resultado.valor, props.item ? TEXTOS_CRONOGRAMA.sucessoSalvo : TEXTOS_CRONOGRAMA.sucessoCriado)

  if (continuar && !props.item) {
    const dia = formulario.valores.dia
    const proximo = proximoInicioSugerido(formulario.valores.inicio.trim(), formulario.valores.termino.trim())
    formulario.redefinir()
    formulario.valores.dia = dia
    formulario.valores.inicio = proximo
    focarInicio()
    return
  }

  emit('update:visivel', false)
}

function excluir() {
  if (props.item && !executando.value) {
    emit('excluir', props.item)
  }
}
</script>

<template>
  <Dialog
    v-model:visible="aberto"
    class="dialogo-item-cronograma"
    modal
    :header="edicao ? TEXTOS_CRONOGRAMA.dialogoEditar : TEXTOS_CRONOGRAMA.dialogoNovo"
    :closable="!executando"
    :close-on-escape="!executando"
    :draggable="false"
    :style="{ width: '34rem' }"
    :breakpoints="pontosQuebra"
    data-teste="dialogo-item-cronograma"
    @show="focarInicio"
  >
    <form
      class="dialogo-item-cronograma__formulario"
      novalidate
      @submit.prevent="salvar(false)"
    >
      <div class="dialogo-item-cronograma__campo">
        <span
          id="cronograma-dia-rotulo"
          class="dialogo-item-cronograma__rotulo"
        >{{ TEXTOS_CRONOGRAMA.campoDia }}</span>
        <div class="dialogo-item-cronograma__trilho">
          <SelectButton
            v-model="formulario.valores.dia"
            :options="opcoesDia"
            option-label="rotulo"
            option-value="valor"
            :allow-empty="false"
            aria-labelledby="cronograma-dia-rotulo"
            :disabled="executando"
            data-teste="campo-dia-cronograma"
          />
        </div>
      </div>

      <div class="dialogo-item-cronograma__horarios">
        <CampoFormulario
          v-slot="{ id: idEntrada, invalido, descritoPor }"
          :rotulo="TEXTOS_CRONOGRAMA.campoInicio"
          id-campo="cronograma-inicio"
          obrigatorio
          :erro="formulario.erros.inicio"
        >
          <InputText
            :id="idEntrada"
            v-model="formulario.valores.inicio"
            type="time"
            aria-required="true"
            :invalid="invalido"
            :aria-invalid="invalido"
            :aria-describedby="descritoPor"
            :readonly="executando"
            data-teste="campo-inicio-cronograma"
            @update:model-value="formulario.revalidarAoDigitar('inicio')"
            @blur="formulario.validarAoSair('inicio')"
          />
        </CampoFormulario>
        <CampoFormulario
          v-slot="{ id: idEntrada, invalido, descritoPor }"
          :rotulo="TEXTOS_CRONOGRAMA.campoTermino"
          id-campo="cronograma-termino"
          :dica="dicaTermino"
          :erro="formulario.erros.termino"
        >
          <InputText
            :id="idEntrada"
            v-model="formulario.valores.termino"
            type="time"
            :invalid="invalido"
            :aria-invalid="invalido"
            :aria-describedby="descritoPor"
            :readonly="executando"
            data-teste="campo-termino-cronograma"
            @update:model-value="formulario.revalidarAoDigitar('termino')"
            @blur="formulario.validarAoSair('termino')"
          />
        </CampoFormulario>
      </div>

      <CampoFormulario
        v-slot="{ id: idEntrada, invalido, descritoPor }"
        :rotulo="TEXTOS_CRONOGRAMA.campoAtividade"
        id-campo="cronograma-atividade"
        obrigatorio
        :erro="formulario.erros.atividade"
      >
        <InputText
          :id="idEntrada"
          v-model="formulario.valores.atividade"
          :placeholder="TEXTOS_CRONOGRAMA.placeholderAtividade"
          :maxlength="LIMITES_CRONOGRAMA.atividadeMaximo"
          aria-required="true"
          :invalid="invalido"
          :aria-invalid="invalido"
          :aria-describedby="descritoPor"
          :readonly="executando"
          data-teste="campo-atividade-cronograma"
          @update:model-value="formulario.revalidarAoDigitar('atividade')"
          @blur="formulario.validarAoSair('atividade')"
        />
      </CampoFormulario>

      <div class="dialogo-item-cronograma__campo">
        <CampoFormulario
          v-slot="{ id: idEntrada, invalido, descritoPor }"
          :rotulo="TEXTOS_CRONOGRAMA.campoLocal"
          id-campo="cronograma-local"
          :erro="formulario.erros.local"
        >
          <InputText
            :id="idEntrada"
            v-model="formulario.valores.local"
            :maxlength="LIMITES_CRONOGRAMA.local"
            :invalid="invalido"
            :aria-invalid="invalido"
            :aria-describedby="descritoPor"
            :readonly="executando"
            data-teste="campo-local-cronograma"
          />
        </CampoFormulario>
        <AtalhosPreenchimento
          :rotulo="TEXTOS_CRONOGRAMA.rotuloAtalhos"
          :opcoes="atalhosLocal"
          :valor-atual="formulario.valores.local"
          :desabilitado="executando"
          @escolher="formulario.valores.local = $event"
        />
      </div>

      <CampoFormulario
        v-slot="{ id: idEntrada, invalido, descritoPor }"
        :rotulo="TEXTOS_CRONOGRAMA.campoResponsavel"
        id-campo="cronograma-responsavel"
        :dica="TEXTOS_CRONOGRAMA.dicaResponsavel"
        :erro="formulario.erros.responsavel"
      >
        <CampoSugestoes
          :id="idEntrada"
          v-model="formulario.valores.responsavel"
          :sugestoes="sugestoesResponsavel"
          :invalido="invalido"
          :descrito-por="descritoPor"
          :maximo="LIMITES_CRONOGRAMA.responsavel"
          :desabilitado="executando"
          data-teste="campo-responsavel-cronograma"
        />
      </CampoFormulario>

      <CampoFormulario
        v-slot="{ id: idEntrada, invalido, descritoPor }"
        :rotulo="TEXTOS_CRONOGRAMA.campoFornecedor"
        id-campo="cronograma-fornecedorEventoId"
        :erro="formulario.erros.fornecedorEventoId"
      >
        <Select
          v-model="formulario.valores.fornecedorEventoId"
          :input-id="idEntrada"
          :options="opcoesFornecedor"
          option-label="rotulo"
          option-value="valor"
          :invalid="invalido"
          :aria-describedby="descritoPor"
          :disabled="executando"
          data-teste="campo-fornecedor-cronograma"
        />
      </CampoFormulario>

      <CampoFormulario
        v-slot="{ id: idEntrada, invalido, descritoPor }"
        :rotulo="TEXTOS_CRONOGRAMA.campoInstrucoes"
        id-campo="cronograma-instrucoes"
        :dica="TEXTOS_CRONOGRAMA.dicaInstrucoes"
        :erro="formulario.erros.instrucoes"
      >
        <Textarea
          :id="idEntrada"
          v-model="formulario.valores.instrucoes"
          rows="3"
          auto-resize
          :maxlength="LIMITES_CRONOGRAMA.texto"
          :invalid="invalido"
          :aria-invalid="invalido"
          :aria-describedby="descritoPor"
          :readonly="executando"
          data-teste="campo-instrucoes-cronograma"
        />
      </CampoFormulario>

      <CampoFormulario
        v-slot="{ id: idEntrada, invalido, descritoPor }"
        :rotulo="TEXTOS_CRONOGRAMA.campoNotas"
        id-campo="cronograma-notasInternas"
        :dica="TEXTOS_CRONOGRAMA.dicaNotas"
        :erro="formulario.erros.notasInternas"
      >
        <Textarea
          :id="idEntrada"
          v-model="formulario.valores.notasInternas"
          rows="2"
          auto-resize
          :maxlength="LIMITES_CRONOGRAMA.texto"
          :invalid="invalido"
          :aria-invalid="invalido"
          :aria-describedby="descritoPor"
          :readonly="executando"
          data-teste="campo-notas-cronograma"
        />
      </CampoFormulario>

      <MensagemFormulario
        v-for="conflito in conflitosAtuais"
        :key="conflito"
        variante="alerta"
        :mensagem="conflito"
        data-teste="conflito-dialogo"
      />

      <MensagemFormulario
        v-if="mensagem"
        :mensagem="mensagem"
        data-teste="mensagem-cronograma"
      />
    </form>

    <template #footer>
      <div class="dialogo-item-cronograma__rodape">
        <Button
          v-if="edicao"
          :label="TEXTOS_CRONOGRAMA.excluir"
          icon="ie ie-excluir"
          severity="danger"
          text
          class="dialogo-item-cronograma__excluir"
          :disabled="executando"
          data-teste="excluir-item-cronograma"
          @click="excluir"
        />
        <div class="dialogo-item-cronograma__acoes">
          <Button
            :label="TEXTOS_CRONOGRAMA.cancelar"
            severity="secondary"
            text
            :disabled="executando"
            data-teste="cancelar-item-cronograma"
            @click="aberto = false"
          />
          <Button
            v-if="!edicao"
            :label="TEXTOS_CRONOGRAMA.salvarOutro"
            severity="secondary"
            outlined
            :disabled="executando"
            data-teste="salvar-outro-item-cronograma"
            @click="salvar(true)"
          />
          <Button
            :label="TEXTOS_CRONOGRAMA.salvar"
            :loading="executando"
            data-teste="salvar-item-cronograma"
            @click="salvar(false)"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.dialogo-item-cronograma__formulario {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-grupo);
}

.dialogo-item-cronograma__campo {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
}

.dialogo-item-cronograma__rotulo {
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto);
}

.dialogo-item-cronograma__trilho {
  max-width: 100%;
  overflow-x: auto;
}

.dialogo-item-cronograma__horarios {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--p-ritmo-grupo);
}

.dialogo-item-cronograma__rodape {
  display: flex;
  flex-direction: column-reverse;
  gap: var(--p-ritmo-grupo);
  width: 100%;
}

.dialogo-item-cronograma__acoes {
  display: flex;
  flex-direction: column-reverse;
  gap: var(--p-ritmo-campo);
}

.dialogo-item-cronograma__acoes :deep(.p-button),
.dialogo-item-cronograma__excluir {
  width: 100%;
}

@container aplicacao (min-width: 40rem) {
  .dialogo-item-cronograma__rodape {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .dialogo-item-cronograma__acoes {
    flex-direction: row;
    margin-left: auto;
  }

  .dialogo-item-cronograma__acoes :deep(.p-button),
  .dialogo-item-cronograma__excluir {
    width: auto;
  }
}
</style>
