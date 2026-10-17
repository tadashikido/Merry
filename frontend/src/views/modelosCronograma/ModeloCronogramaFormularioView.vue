<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
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
import { useModelosCronogramaStore } from '@/stores/modelosCronograma'
import { TEXTOS_MODELOS_CRONOGRAMA } from '@/textos/modelosCronograma'
import type { SalvarModeloCronogramaRequest } from '@/tipos/modelosCronograma'
import {
  HORARIO_REFERENCIA_PADRAO,
  LIMITES_MODELO_CRONOGRAMA,
  regraDescricaoModeloCronograma,
  regraHorarioReferencia,
  regraNomeModeloCronograma,
} from '@/utilitarios/modelosCronograma'
import { focarElemento } from '@/utilitarios/foco'
import { obrigatorio } from '@/utilitarios/validacao'

const CAMPOS = ['nome', 'descricao', 'horarioReferencia'] as const
type Campo = (typeof CAMPOS)[number]

const props = defineProps<{ modeloId?: string }>()

const store = useModelosCronogramaStore()
const roteador = useRouter()
const notificacao = useNotificacao()

const edicao = computed(() => Boolean(props.modeloId))
const carregando = ref(false)
const falhaCarga = ref<FalhaCasamento | null>(null)
const enviando = ref(false)
const mensagemErro = ref<string | null>(null)
const nomeCarregado = ref('')

const formulario = useFormulario(
  { nome: '', descricao: '', horarioReferencia: HORARIO_REFERENCIA_PADRAO },
  {
    nome: [obrigatorio, regraNomeModeloCronograma],
    descricao: [regraDescricaoModeloCronograma],
    horarioReferencia: [regraHorarioReferencia],
  },
)
const { liberarSaida } = useAlteracoesNaoSalvas(formulario.temAlteracoes)

const idCampo = (campo: Campo) => `modelo-cronograma-${campo}`
const titulo = computed(() => (edicao.value ? TEXTOS_MODELOS_CRONOGRAMA.formEditar : TEXTOS_MODELOS_CRONOGRAMA.formNovo))
const descricaoCabecalho = computed(() => {
  if (!edicao.value) {
    return TEXTOS_MODELOS_CRONOGRAMA.formNovoDescricao
  }
  return nomeCarregado.value || undefined
})

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
  nomeCarregado.value = resultado.valor.nome
  formulario.valores.nome = resultado.valor.nome
  formulario.valores.descricao = resultado.valor.descricao ?? ''
  formulario.valores.horarioReferencia = resultado.valor.horarioReferencia
  formulario.fixarEstadoInicial()
}

onMounted(async () => {
  document.title = titulo.value
  await carregar()
  if (!falhaCarga.value) {
    await focarElemento(idCampo('nome'))
  }
})

function montarRequest(): SalvarModeloCronogramaRequest {
  const descricao = formulario.valores.descricao.trim()
  return {
    nome: formulario.valores.nome.trim(),
    descricao: descricao === '' ? null : descricao,
    horarioReferencia: formulario.valores.horarioReferencia.trim(),
  }
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
  mensagemErro.value = falha.tipo === 'semPermissao' ? TEXTOS_MODELOS_CRONOGRAMA.semAcesso : TEXTOS_MODELOS_CRONOGRAMA.erroSalvar
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
  notificacao.sucesso(edicao.value ? TEXTOS_MODELOS_CRONOGRAMA.toastSalvo : TEXTOS_MODELOS_CRONOGRAMA.toastCriado)
  await roteador.replace({ name: 'modelo-cronograma', params: { modeloId: resultado.valor.id } })
}

function cancelar() {
  liberarSaida()
  if (props.modeloId) {
    void roteador.push({ name: 'modelo-cronograma', params: { modeloId: props.modeloId } })
    return
  }
  void roteador.push({ name: 'modelos-cronograma' })
}
</script>

<template>
  <LayoutPainelUsuario>
    <div class="pagina-formulario">
      <CabecalhoPagina
        :titulo="titulo"
        :descricao="descricaoCabecalho"
      />

      <div class="formulario-modelo pilha pilha--cartao">
        <EstadoCarregando
          v-if="carregando"
          variante="formulario"
          :linhas="2"
        />

        <EstadoErro
          v-else-if="falhaCarga?.tipo === 'naoEncontrado'"
          :titulo="TEXTOS_MODELOS_CRONOGRAMA.naoEncontradoTitulo"
          :mensagem="TEXTOS_MODELOS_CRONOGRAMA.naoEncontradoTexto"
          :pode-tentar-novamente="false"
        />

        <EstadoErro
          v-else-if="falhaCarga"
          :titulo="TEXTOS_MODELOS_CRONOGRAMA.erroTitulo"
          :mensagem="falhaCarga.tipo === 'semPermissao' ? TEXTOS_MODELOS_CRONOGRAMA.semAcesso : TEXTOS_MODELOS_CRONOGRAMA.erroTexto"
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
            class="pilha pilha--bloco"
            novalidate
            data-teste="formulario-modelo"
            @submit.prevent="enviar"
          >
            <fieldset
              class="formulario-modelo__grupo pilha pilha--grupo"
              data-teste="grupo-modelo"
            >
              <legend class="formulario-modelo__legenda texto-rotulo">
                {{ TEXTOS_MODELOS_CRONOGRAMA.grupoModelo }}
              </legend>
              <CampoFormulario
                v-slot="{ id: idEntrada, invalido, descritoPor }"
                :rotulo="TEXTOS_MODELOS_CRONOGRAMA.campoNome"
                :id-campo="idCampo('nome')"
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
                  :readonly="enviando"
                  data-teste="campo-nome"
                  @update:model-value="formulario.revalidarAoDigitar('nome')"
                  @blur="formulario.validarAoSair('nome')"
                />
              </CampoFormulario>

              <CampoFormulario
                v-slot="{ id: idEntrada, invalido, descritoPor }"
                :rotulo="TEXTOS_MODELOS_CRONOGRAMA.campoDescricao"
                :id-campo="idCampo('descricao')"
                :dica="TEXTOS_MODELOS_CRONOGRAMA.campoDescricaoDica(formulario.valores.descricao.length, LIMITES_MODELO_CRONOGRAMA.descricaoMaximo)"
                :erro="formulario.erros.descricao"
              >
                <Textarea
                  :id="idEntrada"
                  v-model="formulario.valores.descricao"
                  rows="4"
                  auto-resize
                  :maxlength="LIMITES_MODELO_CRONOGRAMA.descricaoMaximo"
                  :invalid="invalido"
                  :aria-invalid="invalido"
                  :aria-describedby="descritoPor"
                  :readonly="enviando"
                  data-teste="campo-descricao"
                  @update:model-value="formulario.revalidarAoDigitar('descricao')"
                  @blur="formulario.validarAoSair('descricao')"
                />
              </CampoFormulario>

              <div class="formulario-modelo__colunas">
                <CampoFormulario
                  v-slot="{ id: idEntrada, invalido, descritoPor }"
                  :rotulo="TEXTOS_MODELOS_CRONOGRAMA.campoReferencia"
                  :id-campo="idCampo('horarioReferencia')"
                  obrigatorio
                  :dica="TEXTOS_MODELOS_CRONOGRAMA.dicaReferencia"
                  :erro="formulario.erros.horarioReferencia"
                >
                  <InputText
                    :id="idEntrada"
                    v-model="formulario.valores.horarioReferencia"
                    type="time"
                    aria-required="true"
                    :invalid="invalido"
                    :aria-invalid="invalido"
                    :aria-describedby="descritoPor"
                    :readonly="enviando"
                    data-teste="campo-horario-referencia"
                    @update:model-value="formulario.revalidarAoDigitar('horarioReferencia')"
                    @blur="formulario.validarAoSair('horarioReferencia')"
                  />
                </CampoFormulario>
              </div>
            </fieldset>

            <div class="formulario-modelo__acoes">
              <Button
                type="submit"
                :label="edicao ? TEXTOS_MODELOS_CRONOGRAMA.salvarAlteracoes : TEXTOS_MODELOS_CRONOGRAMA.criarModelo"
                :loading="enviando"
                :aria-busy="enviando"
                data-teste="salvar-modelo"
              />
              <Button
                type="button"
                :label="TEXTOS_MODELOS_CRONOGRAMA.cancelar"
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
    </div>
  </LayoutPainelUsuario>
</template>

<style scoped>
.formulario-modelo {
  container: formulario-modelo / inline-size;
}

.formulario-modelo__grupo {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.formulario-modelo__legenda {
  padding: 0;
  margin-bottom: var(--p-ritmo-grupo);
}

.formulario-modelo__colunas {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-grupo);
}

.formulario-modelo__acoes {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
}

.formulario-modelo__acoes :deep(.p-button) {
  min-height: var(--p-dimensao-alvo-toque);
}

@container formulario-modelo (min-width: 40rem) {
  .formulario-modelo__colunas {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .formulario-modelo__acoes {
    flex-direction: row;
    gap: var(--p-ritmo-grupo);
  }
}
</style>
