<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import Textarea from 'primevue/textarea'

import LayoutPainelUsuario from '@/layouts/LayoutPainelUsuario.vue'
import CabecalhoPagina from '@/componentes/base/CabecalhoPagina.vue'
import CampoFormulario from '@/componentes/base/CampoFormulario.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import { useFormulario } from '@/composables/useFormulario'
import { useNotificacao } from '@/composables/useNotificacao'
import { useCasamentosStore, type FalhaCasamento } from '@/stores/casamentos'
import { useTarefasStore } from '@/stores/tarefas'
import { TEXTOS_CASAMENTOS } from '@/textos/casamentos'
import {
  ROTULOS_CATEGORIA_TAREFA,
  ROTULOS_RESPONSAVEL_TAREFA,
  ROTULOS_STATUS_TAREFA,
  TEXTOS_TAREFAS,
} from '@/textos/tarefas'
import {
  CATEGORIAS_TAREFA,
  RESPONSAVEIS_TAREFA,
  STATUS_TAREFA,
  type CategoriaTarefa,
  type ResponsavelTarefa,
  type SalvarTarefaRequest,
  type StatusTarefa,
  type TarefaDto,
} from '@/tipos/tarefas'
import { focarElemento } from '@/utilitarios/foco'
import { formatarNomesCasal } from '@/utilitarios/formatacao'
import { LIMITES_TAREFA, descricaoTarefa, prazoTarefa, tituloTarefa } from '@/utilitarios/tarefas'
import { obrigatorio } from '@/utilitarios/validacao'

const CAMPOS = ['titulo', 'responsavel', 'prazo', 'categoria', 'descricao'] as const
type Campo = (typeof CAMPOS)[number]

const props = defineProps<{ id: string; tarefaId?: string }>()

const casamentos = useCasamentosStore()
const store = useTarefasStore()
const roteador = useRouter()
const notificacao = useNotificacao()

const edicao = computed(() => Boolean(props.tarefaId))
const carregandoTarefa = ref(false)
const falhaTarefa = ref<FalhaCasamento | null>(null)
const original = ref<TarefaDto | null>(null)
const enviando = ref(false)
const mensagemErro = ref<string | null>(null)
const status = ref<StatusTarefa>('AFazer')

const formulario = useFormulario(
  {
    titulo: '',
    responsavel: 'Assessoria' as ResponsavelTarefa,
    prazo: '',
    categoria: 'Geral' as CategoriaTarefa,
    descricao: '',
  },
  {
    titulo: [obrigatorio, tituloTarefa],
    prazo: [prazoTarefa],
    descricao: [descricaoTarefa],
  },
)

const idCampo = (campo: Campo | 'status') => `tarefa-${campo}`

const casamento = computed(() => (casamentos.atual?.id === props.id ? casamentos.atual : null))
const nomes = computed(() =>
  casamento.value ? formatarNomesCasal(casamento.value.nomePrimeiraPessoa, casamento.value.nomeSegundaPessoa) : '',
)
const arquivado = computed(() => casamento.value?.arquivado === true)
const titulo = computed(() => (edicao.value ? TEXTOS_TAREFAS.formEditar : TEXTOS_TAREFAS.formNova))
const rotuloSalvar = computed(() => (edicao.value ? TEXTOS_TAREFAS.salvar : TEXTOS_TAREFAS.criar))

const opcoesResponsavel = RESPONSAVEIS_TAREFA.map((valor) => ({ valor, rotulo: ROTULOS_RESPONSAVEL_TAREFA[valor] }))
const opcoesCategoria = CATEGORIAS_TAREFA.map((valor) => ({ valor, rotulo: ROTULOS_CATEGORIA_TAREFA[valor] }))
const opcoesStatus = STATUS_TAREFA.map((valor) => ({ valor, rotulo: ROTULOS_STATUS_TAREFA[valor] }))

function preencher(tarefa: TarefaDto) {
  original.value = tarefa
  status.value = tarefa.status
  Object.assign(formulario.valores, {
    titulo: tarefa.titulo,
    responsavel: tarefa.responsavel,
    prazo: tarefa.prazo ?? '',
    categoria: tarefa.categoria,
    descricao: tarefa.descricao ?? '',
  })
}

async function carregarTarefa() {
  if (!props.tarefaId) {
    return
  }
  carregandoTarefa.value = true
  falhaTarefa.value = null
  const resultado = await store.obter(props.id, props.tarefaId)
  carregandoTarefa.value = false
  if (resultado.ok) {
    preencher(resultado.valor)
    return
  }
  falhaTarefa.value = resultado.falha
}

onMounted(async () => {
  void casamentos.obter(props.id)
  await carregarTarefa()
  if (!falhaTarefa.value) {
    await focarElemento(idCampo('titulo'))
  }
})

function textoOuNulo(valor: string): string | null {
  const texto = valor.trim()
  return texto === '' ? null : texto
}

function montarRequest(): SalvarTarefaRequest {
  const valores = formulario.valores
  return {
    titulo: valores.titulo.trim(),
    descricao: textoOuNulo(valores.descricao),
    responsavel: valores.responsavel,
    categoria: valores.categoria,
    prazo: textoOuNulo(valores.prazo),
  }
}

function tratarFalha(falha: FalhaCasamento): boolean {
  const camposComErro = CAMPOS.filter((campo) => falha.errosCampos[campo])
  for (const campo of camposComErro) {
    formulario.erros[campo] = falha.errosCampos[campo]
  }
  const primeiro = camposComErro[0]
  if (primeiro) {
    void focarElemento(idCampo(primeiro))
    return true
  }
  if (falha.tipo === 'semPermissao') {
    mensagemErro.value = TEXTOS_TAREFAS.semPermissao
    return true
  }
  if (falha.tipo === 'regra' && falha.mensagem) {
    mensagemErro.value = falha.mensagem
    return true
  }
  if (falha.tipo === 'naoEncontrado') {
    mensagemErro.value = TEXTOS_TAREFAS.tarefaNaoEncontradaTexto
    return true
  }
  mensagemErro.value = TEXTOS_TAREFAS.erroSalvar
  return false
}

async function enviar() {
  mensagemErro.value = null
  if (!formulario.validar()) {
    const campo = formulario.primeiroCampoInvalido.value
    if (campo) {
      await focarElemento(idCampo(campo))
    }
    return
  }

  enviando.value = true
  const request = montarRequest()
  const resultado = props.tarefaId
    ? await store.atualizar(props.id, props.tarefaId, request)
    : await store.criar(props.id, request)

  if (!resultado.ok) {
    enviando.value = false
    tratarFalha(resultado.falha)
    return
  }

  if (props.tarefaId && original.value && status.value !== resultado.valor.status) {
    const mudanca = await store.alterarStatus(props.id, props.tarefaId, status.value)
    if (!mudanca.ok) {
      enviando.value = false
      tratarFalha(mudanca.falha)
      return
    }
  }

  enviando.value = false
  notificacao.sucesso(edicao.value ? TEXTOS_TAREFAS.toastSalva : TEXTOS_TAREFAS.toastCriada)
  await roteador.replace({ name: 'casamento-tarefas', params: { id: props.id } })
}

function cancelar() {
  void roteador.push({ name: 'casamento-tarefas', params: { id: props.id } })
}
</script>

<template>
  <LayoutPainelUsuario>
    <CabecalhoPagina
      :titulo="titulo"
      :descricao="nomes || undefined"
    >
      <template #trilha>
        <RouterLink :to="{ name: 'casamentos' }">
          {{ TEXTOS_CASAMENTOS.listaTitulo }}
        </RouterLink>
        <span aria-hidden="true"> / </span>
        <RouterLink :to="{ name: 'casamento-tarefas', params: { id } }">
          {{ TEXTOS_TAREFAS.titulo }}
        </RouterLink>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">{{ titulo }}</span>
      </template>
    </CabecalhoPagina>

    <div class="formulario-tarefa__area">
      <EstadoCarregando
        v-if="carregandoTarefa"
        variante="formulario"
        :linhas="4"
      />

      <EstadoErro
        v-else-if="falhaTarefa?.tipo === 'naoEncontrado'"
        :titulo="TEXTOS_TAREFAS.tarefaNaoEncontradaTitulo"
        :mensagem="TEXTOS_TAREFAS.tarefaNaoEncontradaTexto"
        :pode-tentar-novamente="false"
      />

      <EstadoErro
        v-else-if="falhaTarefa"
        :titulo="TEXTOS_TAREFAS.erroTitulo"
        :mensagem="falhaTarefa.tipo === 'semPermissao' ? TEXTOS_TAREFAS.semAcesso : TEXTOS_TAREFAS.erroTexto"
        :pode-tentar-novamente="falhaTarefa.tipo !== 'semPermissao'"
        :variante="falhaTarefa.tipo === 'semPermissao' ? 'semPermissao' : 'erro'"
        @tentar-novamente="carregarTarefa"
      />

      <template v-else>
        <MensagemFormulario
          v-if="arquivado"
          variante="alerta"
          :mensagem="TEXTOS_TAREFAS.arquivado"
          data-teste="aviso-arquivado"
        />
        <MensagemFormulario
          v-if="mensagemErro"
          :mensagem="mensagemErro"
          data-teste="erro-formulario"
        />

        <form
          class="formulario-tarefa"
          novalidate
          data-teste="formulario-tarefa"
          @submit.prevent="enviar"
        >
          <CampoFormulario
            v-slot="{ id: idEntrada, invalido, descritoPor }"
            :rotulo="TEXTOS_TAREFAS.campoTitulo"
            :id-campo="idCampo('titulo')"
            obrigatorio
            :erro="formulario.erros.titulo"
          >
            <InputText
              :id="idEntrada"
              v-model="formulario.valores.titulo"
              autocomplete="off"
              :maxlength="LIMITES_TAREFA.tituloMaximo"
              :placeholder="TEXTOS_TAREFAS.campoTituloPlaceholder"
              aria-required="true"
              :invalid="invalido"
              :aria-invalid="invalido"
              :aria-describedby="descritoPor"
              :readonly="enviando"
              data-teste="campo-titulo"
              @blur="formulario.validarCampo('titulo')"
            />
          </CampoFormulario>

          <CampoFormulario
            v-slot="{ id: idEntrada, descritoPor }"
            :rotulo="TEXTOS_TAREFAS.campoResponsavel"
            :id-campo="idCampo('responsavel')"
            :dica="TEXTOS_TAREFAS.campoResponsavelDica"
            :erro="formulario.erros.responsavel"
          >
            <SelectButton
              :id="idEntrada"
              v-model="formulario.valores.responsavel"
              :options="opcoesResponsavel"
              option-label="rotulo"
              option-value="valor"
              :allow-empty="false"
              :aria-label="TEXTOS_TAREFAS.campoResponsavel"
              :aria-describedby="descritoPor"
              :disabled="enviando"
              data-teste="campo-responsavel"
            />
          </CampoFormulario>

          <div class="formulario-tarefa__linha">
            <CampoFormulario
              v-slot="{ id: idEntrada, invalido, descritoPor }"
              :rotulo="TEXTOS_TAREFAS.campoPrazo"
              :id-campo="idCampo('prazo')"
              :dica="TEXTOS_TAREFAS.campoPrazoDica"
              :erro="formulario.erros.prazo"
            >
              <InputText
                :id="idEntrada"
                v-model="formulario.valores.prazo"
                type="date"
                :min="LIMITES_TAREFA.prazoMinimo"
                :max="LIMITES_TAREFA.prazoMaximo"
                :invalid="invalido"
                :aria-invalid="invalido"
                :aria-describedby="descritoPor"
                :readonly="enviando"
                data-teste="campo-prazo"
                @blur="formulario.validarCampo('prazo')"
              />
            </CampoFormulario>

            <CampoFormulario
              v-slot="{ id: idEntrada, descritoPor }"
              :rotulo="TEXTOS_TAREFAS.campoCategoria"
              :id-campo="idCampo('categoria')"
              :erro="formulario.erros.categoria"
            >
              <Select
                v-model="formulario.valores.categoria"
                :input-id="idEntrada"
                :options="opcoesCategoria"
                option-label="rotulo"
                option-value="valor"
                :aria-describedby="descritoPor"
                :disabled="enviando"
                data-teste="campo-categoria"
              />
            </CampoFormulario>
          </div>

          <CampoFormulario
            v-slot="{ id: idEntrada, invalido, descritoPor }"
            :rotulo="TEXTOS_TAREFAS.campoDescricao"
            :id-campo="idCampo('descricao')"
            :dica="TEXTOS_TAREFAS.campoDescricaoDica(formulario.valores.descricao.length, LIMITES_TAREFA.descricaoMaximo)"
            :erro="formulario.erros.descricao"
          >
            <Textarea
              :id="idEntrada"
              v-model="formulario.valores.descricao"
              rows="4"
              auto-resize
              :maxlength="LIMITES_TAREFA.descricaoMaximo"
              :invalid="invalido"
              :aria-invalid="invalido"
              :aria-describedby="descritoPor"
              :readonly="enviando"
              data-teste="campo-descricao"
              @blur="formulario.validarCampo('descricao')"
            />
          </CampoFormulario>

          <CampoFormulario
            v-if="edicao"
            v-slot="{ id: idEntrada }"
            :rotulo="TEXTOS_TAREFAS.campoSituacao"
            :id-campo="idCampo('status')"
          >
            <div class="formulario-tarefa__trilho">
              <SelectButton
                :id="idEntrada"
                v-model="status"
                :options="opcoesStatus"
                option-label="rotulo"
                option-value="valor"
                :allow-empty="false"
                :aria-label="TEXTOS_TAREFAS.campoSituacao"
                :disabled="enviando"
                data-teste="campo-status"
              />
            </div>
          </CampoFormulario>

          <div class="formulario-tarefa__acoes">
            <Button
              type="submit"
              :label="rotuloSalvar"
              :loading="enviando"
              :aria-busy="enviando"
              :disabled="arquivado"
              data-teste="salvar-tarefa"
            />
            <Button
              type="button"
              :label="TEXTOS_TAREFAS.cancelar"
              severity="secondary"
              text
              :disabled="enviando"
              data-teste="cancelar"
              @click="cancelar"
            />
          </div>
        </form>
      </template>
    </div>
  </LayoutPainelUsuario>
</template>

<style scoped>
.formulario-tarefa__area {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-4);
  max-width: var(--p-dimensao-largura-leitura);
}

.formulario-tarefa {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-6);
}

.formulario-tarefa__linha {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-espaco-6);
}

.formulario-tarefa__trilho {
  max-width: 100%;
  overflow-x: auto;
}

.formulario-tarefa__acoes {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
}

.formulario-tarefa__acoes :deep(.p-button) {
  min-height: var(--p-dimensao-alvo-toque);
}

@media (min-width: 640px) {
  .formulario-tarefa__linha {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }

  .formulario-tarefa__acoes {
    flex-direction: row;
  }
}
</style>
