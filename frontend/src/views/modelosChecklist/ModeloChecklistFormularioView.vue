<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'

import LayoutPainelUsuario from '@/layouts/LayoutPainelUsuario.vue'
import CabecalhoPagina from '@/componentes/base/CabecalhoPagina.vue'
import CampoFormulario from '@/componentes/base/CampoFormulario.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import { useAlteracoesNaoSalvas } from '@/composables/useAlteracoesNaoSalvas'
import { useFormulario } from '@/composables/useFormulario'
import { useNotificacao } from '@/composables/useNotificacao'
import type { FalhaCasamento } from '@/stores/casamentos'
import { useModelosChecklistStore } from '@/stores/modelosChecklist'
import { TEXTOS_MODELOS_CHECKLIST } from '@/textos/checklist'
import type { SalvarModeloChecklistRequest } from '@/tipos/checklist'
import { LIMITES_CHECKLIST, descricaoModelo, nomeModelo } from '@/utilitarios/checklist'
import { focarElemento } from '@/utilitarios/foco'
import { obrigatorio } from '@/utilitarios/validacao'

const CAMPOS = ['nome', 'descricao'] as const
type Campo = (typeof CAMPOS)[number]

const props = defineProps<{ modeloId?: string }>()

const store = useModelosChecklistStore()
const roteador = useRouter()
const notificacao = useNotificacao()

const edicao = computed(() => Boolean(props.modeloId))
const carregando = ref(false)
const falhaCarga = ref<FalhaCasamento | null>(null)
const enviando = ref(false)
const mensagemErro = ref<string | null>(null)

const formulario = useFormulario(
  { nome: '', descricao: '' },
  { nome: [obrigatorio, nomeModelo], descricao: [descricaoModelo] },
)
const { liberarSaida } = useAlteracoesNaoSalvas(formulario.temAlteracoes)

const idCampo = (campo: Campo) => `modelo-${campo}`
const titulo = computed(() => (edicao.value ? TEXTOS_MODELOS_CHECKLIST.formEditar : TEXTOS_MODELOS_CHECKLIST.formNovo))

async function carregar() {
  if (!props.modeloId) {
    return
  }
  carregando.value = true
  falhaCarga.value = null
  const resultado = await store.obter(props.modeloId)
  carregando.value = false
  if (!resultado.ok) {
    falhaCarga.value = resultado.falha
    return
  }
  formulario.valores.nome = resultado.valor.nome
  formulario.valores.descricao = resultado.valor.descricao ?? ''
  formulario.fixarEstadoInicial()
}

onMounted(async () => {
  document.title = titulo.value
  await carregar()
  if (!falhaCarga.value) {
    await focarElemento(idCampo('nome'))
  }
})

function montarRequest(): SalvarModeloChecklistRequest {
  const descricao = formulario.valores.descricao.trim()
  return { nome: formulario.valores.nome.trim(), descricao: descricao === '' ? null : descricao }
}

function tratarFalha(falha: FalhaCasamento) {
  const camposComErro = CAMPOS.filter((campo) => falha.errosCampos[campo])
  for (const campo of camposComErro) {
    formulario.erros[campo] = falha.errosCampos[campo]
  }
  const primeiro = camposComErro[0]
  if (primeiro) {
    void focarElemento(idCampo(primeiro))
    return
  }
  if (falha.tipo === 'regra' && falha.mensagem) {
    mensagemErro.value = falha.mensagem
    return
  }
  mensagemErro.value = falha.tipo === 'semPermissao' ? TEXTOS_MODELOS_CHECKLIST.semAcesso : TEXTOS_MODELOS_CHECKLIST.erroSalvar
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
  const resultado = props.modeloId ? await store.atualizar(props.modeloId, request) : await store.criar(request)
  enviando.value = false

  if (!resultado.ok) {
    tratarFalha(resultado.falha)
    return
  }

  liberarSaida()
  notificacao.sucesso(edicao.value ? TEXTOS_MODELOS_CHECKLIST.toastSalvo : TEXTOS_MODELOS_CHECKLIST.toastCriado)
  await roteador.replace({ name: 'modelo-checklist', params: { modeloId: resultado.valor.id } })
}

function cancelar() {
  liberarSaida()
  if (props.modeloId) {
    void roteador.push({ name: 'modelo-checklist', params: { modeloId: props.modeloId } })
    return
  }
  void roteador.push({ name: 'modelos-checklist' })
}
</script>

<template>
  <LayoutPainelUsuario>
    <CabecalhoPagina :titulo="titulo">
      <template #trilha>
        <RouterLink :to="{ name: 'modelos-checklist' }">
          {{ TEXTOS_MODELOS_CHECKLIST.titulo }}
        </RouterLink>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">{{ titulo }}</span>
      </template>
    </CabecalhoPagina>

    <div class="formulario-modelo__area">
      <EstadoCarregando
        v-if="carregando"
        variante="formulario"
        :linhas="2"
      />

      <EstadoErro
        v-else-if="falhaCarga?.tipo === 'naoEncontrado'"
        :titulo="TEXTOS_MODELOS_CHECKLIST.naoEncontradoTitulo"
        :mensagem="TEXTOS_MODELOS_CHECKLIST.naoEncontradoTexto"
        :pode-tentar-novamente="false"
      />

      <EstadoErro
        v-else-if="falhaCarga"
        :titulo="TEXTOS_MODELOS_CHECKLIST.erroTitulo"
        :mensagem="falhaCarga.tipo === 'semPermissao' ? TEXTOS_MODELOS_CHECKLIST.semAcesso : TEXTOS_MODELOS_CHECKLIST.erroTexto"
        :pode-tentar-novamente="falhaCarga.tipo !== 'semPermissao'"
        :variante="falhaCarga.tipo === 'semPermissao' ? 'semPermissao' : 'erro'"
        @tentar-novamente="carregar"
      />

      <template v-else>
        <MensagemFormulario
          v-if="mensagemErro"
          :mensagem="mensagemErro"
          data-teste="erro-formulario"
        />

        <form
          class="formulario-modelo"
          novalidate
          data-teste="formulario-modelo"
          @submit.prevent="enviar"
        >
          <CampoFormulario
            v-slot="{ id: idEntrada, invalido, descritoPor }"
            :rotulo="TEXTOS_MODELOS_CHECKLIST.campoNome"
            :id-campo="idCampo('nome')"
            obrigatorio
            :erro="formulario.erros.nome"
          >
            <InputText
              :id="idEntrada"
              v-model="formulario.valores.nome"
              autocomplete="off"
              :maxlength="LIMITES_CHECKLIST.nomeMaximo"
              :placeholder="TEXTOS_MODELOS_CHECKLIST.campoNomePlaceholder"
              aria-required="true"
              :invalid="invalido"
              :aria-invalid="invalido"
              :aria-describedby="descritoPor"
              :readonly="enviando"
              data-teste="campo-nome"
              @blur="formulario.validarCampo('nome')"
            />
          </CampoFormulario>

          <CampoFormulario
            v-slot="{ id: idEntrada, invalido, descritoPor }"
            :rotulo="TEXTOS_MODELOS_CHECKLIST.campoDescricao"
            :id-campo="idCampo('descricao')"
            :dica="TEXTOS_MODELOS_CHECKLIST.campoDescricaoDica(formulario.valores.descricao.length, LIMITES_CHECKLIST.descricaoModeloMaximo)"
            :erro="formulario.erros.descricao"
          >
            <Textarea
              :id="idEntrada"
              v-model="formulario.valores.descricao"
              rows="3"
              auto-resize
              :maxlength="LIMITES_CHECKLIST.descricaoModeloMaximo"
              :invalid="invalido"
              :aria-invalid="invalido"
              :aria-describedby="descritoPor"
              :readonly="enviando"
              data-teste="campo-descricao"
              @blur="formulario.validarCampo('descricao')"
            />
          </CampoFormulario>

          <div class="formulario-modelo__acoes">
            <Button
              type="submit"
              :label="edicao ? TEXTOS_MODELOS_CHECKLIST.salvar : TEXTOS_MODELOS_CHECKLIST.criar"
              :loading="enviando"
              :aria-busy="enviando"
              data-teste="salvar-modelo"
            />
            <Button
              type="button"
              :label="TEXTOS_MODELOS_CHECKLIST.cancelar"
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
.formulario-modelo__area {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-4);
  max-width: var(--p-dimensao-largura-leitura);
}

.formulario-modelo {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-6);
}

.formulario-modelo__acoes {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
}

.formulario-modelo__acoes :deep(.p-button) {
  min-height: var(--p-dimensao-alvo-toque);
}

@media (min-width: 640px) {
  .formulario-modelo__acoes {
    flex-direction: row;
  }
}
</style>
