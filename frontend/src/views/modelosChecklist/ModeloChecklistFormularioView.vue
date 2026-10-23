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
import ComoAplicarModelo from '@/componentes/modelos/ComoAplicarModelo.vue'
import OrientacaoFormularioModelo from '@/componentes/modelos/OrientacaoFormularioModelo.vue'
import { useAlteracoesNaoSalvas } from '@/composables/useAlteracoesNaoSalvas'
import { useFormulario } from '@/composables/useFormulario'
import { useNotificacao } from '@/composables/useNotificacao'
import type { FalhaEvento } from '@/stores/eventos'
import { useModelosChecklistStore } from '@/stores/modelosChecklist'
import { TEXTOS_MODELOS_CHECKLIST } from '@/textos/checklist'
import { TEXTOS_MODELOS_POR_TIPO, abrirEventoDoModelo, referenciaDoModelo } from '@/textos/modelos'
import type { ModeloChecklistDto, SalvarModeloChecklistRequest } from '@/tipos/checklist'
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
const falhaCarga = ref<FalhaEvento | null>(null)
const enviando = ref(false)
const mensagemErro = ref<string | null>(null)
const nomeCarregado = ref('')
const modeloCarregado = ref<ModeloChecklistDto | null>(null)

const formulario = useFormulario(
  { nome: '', descricao: '' },
  { nome: [obrigatorio, nomeModelo], descricao: [descricaoModelo] },
)
const { liberarSaida } = useAlteracoesNaoSalvas(formulario.temAlteracoes)

const idCampo = (campo: Campo) => `modelo-${campo}`
const titulo = computed(() => (edicao.value ? TEXTOS_MODELOS_CHECKLIST.formEditar : TEXTOS_MODELOS_CHECKLIST.formNovo))
const descricaoCabecalho = computed(() => {
  if (!edicao.value) {
    return TEXTOS_MODELOS_CHECKLIST.formNovoDescricao
  }
  return nomeCarregado.value || undefined
})

const mostrarLateral = computed(() => !carregando.value && !falhaCarga.value && (!edicao.value || modeloCarregado.value !== null))
const tipoModelo = computed(() => modeloCarregado.value?.tipoEvento ?? null)
const contracaoModelo = computed(() => referenciaDoModelo(tipoModelo.value).contracaoDe)
const dicasModelo = computed(() => TEXTOS_MODELOS_CHECKLIST.dicasModelo(contracaoModelo.value))
const contagemItens = computed(() => (modeloCarregado.value ? TEXTOS_MODELOS_CHECKLIST.resumoItens(modeloCarregado.value.itens.length) : null))
const passosDepoisDeCriar = computed(() => [
  TEXTOS_MODELOS_CHECKLIST.depoisDeCriarItens,
  abrirEventoDoModelo(null),
  TEXTOS_MODELOS_CHECKLIST.depoisDeCriarAplicar(contracaoModelo.value),
])

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
  modeloCarregado.value = resultado.valor
  nomeCarregado.value = resultado.valor.nome
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

function tratarFalha(falha: FalhaEvento) {
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
    <div class="formulario-modelo-tela">
      <div
        class="pagina-formulario formulario-modelo-tela__pagina"
        :class="{ 'formulario-modelo-tela__pagina--com-lateral': mostrarLateral }"
      >
        <CabecalhoPagina
          :titulo="titulo"
          :descricao="descricaoCabecalho"
        />

        <div class="formulario-modelo-tela__corpo">
          <div class="formulario-modelo pilha pilha--cartao">
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
                    {{ TEXTOS_MODELOS_CHECKLIST.grupoModelo }}
                  </legend>
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
                      @update:model-value="formulario.revalidarAoDigitar('nome')"
                      @blur="formulario.validarAoSair('nome')"
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
                      rows="4"
                      auto-resize
                      :maxlength="LIMITES_CHECKLIST.descricaoModeloMaximo"
                      :invalid="invalido"
                      :aria-invalid="invalido"
                      :aria-describedby="descritoPor"
                      :readonly="enviando"
                      data-teste="campo-descricao"
                      @update:model-value="formulario.revalidarAoDigitar('descricao')"
                      @blur="formulario.validarAoSair('descricao')"
                    />
                  </CampoFormulario>
                </fieldset>

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

          <div
            v-if="mostrarLateral"
            class="formulario-modelo-tela__lateral pilha pilha--bloco"
            data-teste="lateral-formulario-modelo"
          >
            <OrientacaoFormularioModelo
              :recurso="TEXTOS_MODELOS_CHECKLIST.recurso"
              :rotulo-sugerido="TEXTOS_MODELOS_CHECKLIST.sugerido"
              :dicas="dicasModelo"
              :edicao="edicao"
              :tipo="tipoModelo"
              :sugerido="modeloCarregado?.sugerido ?? false"
              :contagem="contagemItens"
            />
            <ComoAplicarModelo
              v-if="!edicao"
              :titulo="TEXTOS_MODELOS_POR_TIPO.depoisDeCriarTitulo"
              :passos="passosDepoisDeCriar"
              :nota="TEXTOS_MODELOS_CHECKLIST.notaAplicar"
            />
          </div>
        </div>
      </div>
    </div>
  </LayoutPainelUsuario>
</template>

<style scoped>
.formulario-modelo-tela {
  container: formulario-modelo-tela / inline-size;
}

.formulario-modelo-tela__corpo {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas:
    'principal'
    'lateral';
  gap: var(--p-ritmo-bloco);
}

.formulario-modelo {
  container: formulario-modelo / inline-size;
  grid-area: principal;
  min-width: 0;
}

.formulario-modelo-tela__lateral {
  grid-area: lateral;
  min-width: 0;
  padding-top: var(--p-ritmo-bloco);
  border-top: 1px solid var(--p-cor-borda);
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

.formulario-modelo__acoes {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
}

.formulario-modelo__acoes :deep(.p-button) {
  min-height: var(--p-dimensao-alvo-toque);
}

@container formulario-modelo (min-width: 40rem) {
  .formulario-modelo__acoes {
    flex-direction: row;
    gap: var(--p-ritmo-grupo);
  }
}

@container formulario-modelo-tela (min-width: 64rem) {
  .formulario-modelo-tela__pagina--com-lateral {
    max-width: calc(var(--p-dimensao-largura-formulario) + var(--p-dimensao-largura-autenticacao) + var(--p-ritmo-bloco));
  }

  .formulario-modelo-tela__pagina--com-lateral .formulario-modelo-tela__corpo {
    grid-template-columns: minmax(0, var(--p-dimensao-largura-formulario)) minmax(var(--p-dimensao-largura-gaveta), 1fr);
    grid-template-areas: 'principal lateral';
    align-items: start;
  }

  .formulario-modelo-tela__lateral {
    padding-top: 0;
    padding-inline-start: var(--p-ritmo-bloco);
    border-top: 0;
    border-inline-start: 1px solid var(--p-cor-borda);
  }
}
</style>
