<script setup lang="ts">
import { computed, onMounted, ref, useId } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'

import LayoutPainelUsuario from '@/layouts/LayoutPainelUsuario.vue'
import CabecalhoPagina from '@/componentes/base/CabecalhoPagina.vue'
import CampoFormulario from '@/componentes/base/CampoFormulario.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import OrientacaoAcesso from '@/componentes/base/OrientacaoAcesso.vue'
import AtuacaoFornecedor from '@/componentes/fornecedores/AtuacaoFornecedor.vue'
import { useAlteracoesNaoSalvas } from '@/composables/useAlteracoesNaoSalvas'
import { useFormulario } from '@/composables/useFormulario'
import { useNotificacao } from '@/composables/useNotificacao'
import { useEventosStore, type FalhaEvento } from '@/stores/eventos'
import { useFornecedoresStore } from '@/stores/fornecedores'
import { TEXTOS_FORMULARIO_FORNECEDOR, TEXTOS_FORNECEDORES, descreverSituacaoCategoria } from '@/textos/fornecedores'
import type { CategoriaFornecedor, SalvarFornecedorRequest } from '@/tipos/fornecedores'
import { resumirAtuacaoFornecedor } from '@/utilitarios/atuacaoFornecedor'
import { situacaoCategoriaNaBase } from '@/utilitarios/coberturaFornecedores'
import { hojeEmSaoPaulo } from '@/utilitarios/dataCalendario'
import { focarElemento } from '@/utilitarios/foco'
import {
  LIMITES_FORNECEDOR,
  opcoesCategorias,
  regraCategoria,
  regraInstagram,
  regraNomeEmpresa,
  regraSite,
  regraTamanho,
  regraTelefone,
} from '@/utilitarios/fornecedores'
import { LIMITES_TELEFONE } from '@/utilitarios/telefone'
import { email } from '@/utilitarios/validacao'

const CAMPOS = ['categoria', 'nomeEmpresa', 'site', 'instagram', 'responsavel', 'telefone', 'email', 'observacoes'] as const
type Campo = (typeof CAMPOS)[number]

const props = defineProps<{ fornecedorId?: string }>()

const store = useFornecedoresStore()
const eventos = useEventosStore()
const roteador = useRouter()
const notificacao = useNotificacao()

const edicao = computed(() => Boolean(props.fornecedorId))
const carregando = ref(false)
const falhaCarga = ref<FalhaEvento | null>(null)
const nomeCarregado = ref('')
const enviando = ref(false)
const mensagemErro = ref<string | null>(null)
const categorias = opcoesCategorias()
const idOrientacao = useId()
const orientacao = TEXTOS_FORMULARIO_FORNECEDOR.orientacao()

const regraEmail = (valor: unknown) => (email(valor) ? TEXTOS_FORNECEDORES.erroEmail : null)

const formulario = useFormulario(
  {
    categoria: '' as CategoriaFornecedor | '',
    nomeEmpresa: '',
    site: '',
    instagram: '',
    responsavel: '',
    telefone: '',
    email: '',
    observacoes: '',
  },
  {
    categoria: [regraCategoria],
    nomeEmpresa: [regraNomeEmpresa],
    site: [regraSite],
    instagram: [regraInstagram],
    responsavel: [regraTamanho(LIMITES_FORNECEDOR.responsavelMaximo, TEXTOS_FORNECEDORES.erroResponsavel)],
    telefone: [regraTelefone],
    email: [regraEmail, regraTamanho(LIMITES_FORNECEDOR.emailMaximo, TEXTOS_FORNECEDORES.erroEmail)],
    observacoes: [regraTamanho(LIMITES_FORNECEDOR.observacoesMaximo, TEXTOS_FORNECEDORES.erroObservacoes)],
  },
)
const { liberarSaida } = useAlteracoesNaoSalvas(formulario.temAlteracoes)

const carteira = computed(() => (eventos.ativosCarregados ? eventos.ativos : null))
const situacaoCategoria = computed(() => {
  const categoria = formulario.valores.categoria
  if (!categoria) {
    return null
  }
  return descreverSituacaoCategoria(situacaoCategoriaNaBase(categoria, store.lista, carteira.value, props.fornecedorId ?? null))
})
const atuacao = computed(() => {
  if (!props.fornecedorId || store.participacoesDe !== props.fornecedorId || !store.participacoes) {
    return null
  }
  const resumo = resumirAtuacaoFornecedor(store.participacoes, carteira.value, hojeEmSaoPaulo())
  return resumo.total > 0 ? resumo : null
})
const comLateral = computed(() => !carregando.value && !falhaCarga.value && (!edicao.value || nomeCarregado.value !== ''))

const idCampo = (campo: Campo) => `fornecedor-${campo}`
const titulo = computed(() => (edicao.value ? TEXTOS_FORNECEDORES.editarTitulo : TEXTOS_FORNECEDORES.novoTitulo))
const descricaoCabecalho = computed(() => {
  if (!edicao.value) {
    return TEXTOS_FORNECEDORES.formNovoDescricao
  }
  return nomeCarregado.value || undefined
})

async function carregar() {
  if (!props.fornecedorId) {
    return
  }
  carregando.value = true
  falhaCarga.value = null
  const resultado = await store.obter(props.fornecedorId)
  carregando.value = false
  if (!resultado.ok) {
    falhaCarga.value = resultado.falha
    return
  }
  const fornecedor = resultado.valor
  nomeCarregado.value = fornecedor.nomeEmpresa
  if (fornecedor.arquivado) {
    mensagemErro.value = TEXTOS_FORNECEDORES.arquivadoFaixa
  }
  Object.assign(formulario.valores, {
    categoria: fornecedor.categoria,
    nomeEmpresa: fornecedor.nomeEmpresa,
    responsavel: fornecedor.responsavel ?? '',
    telefone: fornecedor.telefone ?? '',
    email: fornecedor.email ?? '',
    site: fornecedor.site ?? '',
    instagram: fornecedor.instagram ? `@${fornecedor.instagram}` : '',
    observacoes: fornecedor.observacoes ?? '',
  })
  formulario.fixarEstadoInicial()
}

onMounted(async () => {
  document.title = titulo.value
  void eventos.garantirAtivos()
  if (store.lista === null && !store.carregandoLista) {
    void store.carregar()
  }
  if (props.fornecedorId) {
    void store.carregarParticipacoes(props.fornecedorId)
  }
  await carregar()
  if (!falhaCarga.value) {
    await focarElemento(idCampo('categoria'))
  }
})

function opcional(valor: string): string | null {
  const texto = valor.trim()
  return texto === '' ? null : texto
}

function montarRequest(): SalvarFornecedorRequest {
  const valores = formulario.valores
  return {
    categoria: valores.categoria as CategoriaFornecedor,
    nomeEmpresa: valores.nomeEmpresa.trim(),
    responsavel: opcional(valores.responsavel),
    telefone: opcional(valores.telefone),
    email: opcional(valores.email),
    site: opcional(valores.site),
    instagram: opcional(valores.instagram),
    observacoes: opcional(valores.observacoes),
  }
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
  if (falha.tipo === 'conflito') {
    notificacao.erro(TEXTOS_FORNECEDORES.erroConcorrencia)
    return
  }
  if (falha.tipo === 'conexao') {
    notificacao.erro(TEXTOS_FORNECEDORES.erroConexao)
    return
  }
  if (falha.tipo === 'regra' && falha.mensagem) {
    mensagemErro.value = falha.mensagem
    return
  }
  mensagemErro.value = falha.tipo === 'semPermissao' ? TEXTOS_FORNECEDORES.semAcesso : TEXTOS_FORNECEDORES.erroSalvar
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
  const resultado = props.fornecedorId ? await store.atualizar(props.fornecedorId, request) : await store.criar(request)
  enviando.value = false

  if (!resultado.ok) {
    tratarFalha(resultado.falha)
    return
  }

  liberarSaida()
  notificacao.sucesso(edicao.value ? TEXTOS_FORNECEDORES.toastSalvo : TEXTOS_FORNECEDORES.toastAdicionado(resultado.valor.nomeEmpresa))
  await roteador.replace({ name: 'fornecedor', params: { fornecedorId: resultado.valor.id } })
}

function cancelar() {
  liberarSaida()
  if (props.fornecedorId) {
    void roteador.push({ name: 'fornecedor', params: { fornecedorId: props.fornecedorId } })
    return
  }
  void roteador.push({ name: 'fornecedores' })
}
</script>

<template>
  <LayoutPainelUsuario>
    <div class="formulario-fornecedor-tela">
      <div
        class="pagina-formulario formulario-fornecedor-tela__pagina"
        :class="{ 'formulario-fornecedor-tela__pagina--com-lateral': comLateral }"
      >
        <CabecalhoPagina
          :titulo="titulo"
          :descricao="descricaoCabecalho"
        />

        <div class="formulario-fornecedor-tela__corpo">
          <div class="formulario-fornecedor pilha pilha--cartao">
            <EstadoCarregando
              v-if="carregando"
              variante="formulario"
              :linhas="6"
            />

            <EstadoErro
              v-else-if="falhaCarga?.tipo === 'naoEncontrado'"
              :titulo="TEXTOS_FORNECEDORES.naoEncontradoTitulo"
              :mensagem="TEXTOS_FORNECEDORES.naoEncontradoTexto"
              :pode-tentar-novamente="false"
            />

            <EstadoErro
              v-else-if="falhaCarga"
              :titulo="TEXTOS_FORNECEDORES.erroDetalheTitulo"
              :mensagem="falhaCarga.tipo === 'semPermissao' ? TEXTOS_FORNECEDORES.semAcesso : TEXTOS_FORNECEDORES.erroTexto"
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
                data-teste="formulario-fornecedor"
                @submit.prevent="enviar"
              >
                <fieldset
                  class="formulario-fornecedor__grupo pilha pilha--grupo"
                  data-teste="grupo-empresa"
                >
                  <legend class="formulario-fornecedor__legenda texto-rotulo">
                    {{ TEXTOS_FORNECEDORES.grupoEmpresa }}
                  </legend>

                  <div class="formulario-fornecedor__colunas">
                    <CampoFormulario
                      v-slot="{ id: idEntrada, invalido, descritoPor }"
                      :rotulo="TEXTOS_FORNECEDORES.campoCategoria"
                      :id-campo="idCampo('categoria')"
                      obrigatorio
                      :erro="formulario.erros.categoria"
                    >
                      <Select
                        v-model="formulario.valores.categoria"
                        :input-id="idEntrada"
                        :options="categorias"
                        option-label="rotulo"
                        option-value="valor"
                        :placeholder="TEXTOS_FORNECEDORES.categoriaPlaceholder"
                        aria-required="true"
                        :invalid="invalido"
                        :aria-invalid="invalido"
                        :aria-describedby="descritoPor"
                        :disabled="enviando"
                        data-teste="campo-categoria"
                        @update:model-value="formulario.revalidarAoDigitar('categoria')"
                      />
                      <p
                        class="formulario-fornecedor__situacao texto-legenda"
                        aria-live="polite"
                        data-teste="categoria-situacao"
                        v-text="situacaoCategoria ?? ''"
                      />
                    </CampoFormulario>

                    <CampoFormulario
                      v-slot="{ id: idEntrada, invalido, descritoPor }"
                      :rotulo="TEXTOS_FORNECEDORES.campoEmpresa"
                      :id-campo="idCampo('nomeEmpresa')"
                      obrigatorio
                      :erro="formulario.erros.nomeEmpresa"
                    >
                      <InputText
                        :id="idEntrada"
                        v-model="formulario.valores.nomeEmpresa"
                        autocomplete="organization"
                        :maxlength="LIMITES_FORNECEDOR.nomeEmpresaMaximo"
                        aria-required="true"
                        :invalid="invalido"
                        :aria-invalid="invalido"
                        :aria-describedby="descritoPor"
                        :readonly="enviando"
                        data-teste="campo-nome-empresa"
                        @update:model-value="formulario.revalidarAoDigitar('nomeEmpresa')"
                        @blur="formulario.validarAoSair('nomeEmpresa')"
                      />
                    </CampoFormulario>
                  </div>

                  <div class="formulario-fornecedor__colunas">
                    <CampoFormulario
                      v-slot="{ id: idEntrada, invalido, descritoPor }"
                      :rotulo="TEXTOS_FORNECEDORES.campoSite"
                      :id-campo="idCampo('site')"
                      :erro="formulario.erros.site"
                    >
                      <InputText
                        :id="idEntrada"
                        v-model="formulario.valores.site"
                        type="url"
                        inputmode="url"
                        autocomplete="off"
                        :maxlength="LIMITES_FORNECEDOR.siteMaximo"
                        :placeholder="TEXTOS_FORNECEDORES.campoSitePlaceholder"
                        :invalid="invalido"
                        :aria-invalid="invalido"
                        :aria-describedby="descritoPor"
                        :readonly="enviando"
                        data-teste="campo-site"
                        @update:model-value="formulario.revalidarAoDigitar('site')"
                        @blur="formulario.validarAoSair('site')"
                      />
                    </CampoFormulario>

                    <CampoFormulario
                      v-slot="{ id: idEntrada, invalido, descritoPor }"
                      :rotulo="TEXTOS_FORNECEDORES.campoInstagram"
                      :id-campo="idCampo('instagram')"
                      :erro="formulario.erros.instagram"
                    >
                      <InputText
                        :id="idEntrada"
                        v-model="formulario.valores.instagram"
                        autocomplete="off"
                        autocapitalize="none"
                        :maxlength="LIMITES_FORNECEDOR.instagramEntradaMaxima"
                        :placeholder="TEXTOS_FORNECEDORES.campoInstagramPlaceholder"
                        :invalid="invalido"
                        :aria-invalid="invalido"
                        :aria-describedby="descritoPor"
                        :readonly="enviando"
                        data-teste="campo-instagram"
                        @update:model-value="formulario.revalidarAoDigitar('instagram')"
                        @blur="formulario.validarAoSair('instagram')"
                      />
                    </CampoFormulario>
                  </div>
                </fieldset>

                <fieldset
                  class="formulario-fornecedor__grupo pilha pilha--grupo"
                  data-teste="grupo-contato"
                >
                  <legend class="formulario-fornecedor__legenda texto-rotulo">
                    {{ TEXTOS_FORNECEDORES.grupoContato }}
                  </legend>

                  <div class="formulario-fornecedor__colunas">
                    <CampoFormulario
                      v-slot="{ id: idEntrada, invalido, descritoPor }"
                      :rotulo="TEXTOS_FORNECEDORES.campoResponsavel"
                      :id-campo="idCampo('responsavel')"
                      :dica="TEXTOS_FORNECEDORES.campoResponsavelDica"
                      :erro="formulario.erros.responsavel"
                    >
                      <InputText
                        :id="idEntrada"
                        v-model="formulario.valores.responsavel"
                        autocomplete="off"
                        :maxlength="LIMITES_FORNECEDOR.responsavelMaximo"
                        :invalid="invalido"
                        :aria-invalid="invalido"
                        :aria-describedby="descritoPor"
                        :readonly="enviando"
                        data-teste="campo-responsavel"
                        @update:model-value="formulario.revalidarAoDigitar('responsavel')"
                        @blur="formulario.validarAoSair('responsavel')"
                      />
                    </CampoFormulario>

                    <CampoFormulario
                      v-slot="{ id: idEntrada, invalido, descritoPor }"
                      :rotulo="TEXTOS_FORNECEDORES.campoTelefone"
                      :id-campo="idCampo('telefone')"
                      :dica="TEXTOS_FORNECEDORES.campoTelefoneDica"
                      :erro="formulario.erros.telefone"
                    >
                      <InputText
                        :id="idEntrada"
                        v-model="formulario.valores.telefone"
                        type="tel"
                        inputmode="tel"
                        autocomplete="off"
                        :maxlength="LIMITES_TELEFONE.tamanhoMaximoEntrada"
                        :invalid="invalido"
                        :aria-invalid="invalido"
                        :aria-describedby="descritoPor"
                        :readonly="enviando"
                        data-teste="campo-telefone"
                        @update:model-value="formulario.revalidarAoDigitar('telefone')"
                        @blur="formulario.validarAoSair('telefone')"
                      />
                    </CampoFormulario>
                  </div>

                  <CampoFormulario
                    v-slot="{ id: idEntrada, invalido, descritoPor }"
                    :rotulo="TEXTOS_FORNECEDORES.campoEmail"
                    :id-campo="idCampo('email')"
                    :erro="formulario.erros.email"
                  >
                    <InputText
                      :id="idEntrada"
                      v-model="formulario.valores.email"
                      type="email"
                      inputmode="email"
                      autocomplete="off"
                      :maxlength="LIMITES_FORNECEDOR.emailMaximo"
                      :invalid="invalido"
                      :aria-invalid="invalido"
                      :aria-describedby="descritoPor"
                      :readonly="enviando"
                      data-teste="campo-email"
                      @update:model-value="formulario.revalidarAoDigitar('email')"
                      @blur="formulario.validarAoSair('email')"
                    />
                  </CampoFormulario>
                </fieldset>

                <fieldset
                  class="formulario-fornecedor__grupo pilha pilha--grupo"
                  data-teste="grupo-interno"
                >
                  <legend class="formulario-fornecedor__legenda texto-rotulo">
                    {{ TEXTOS_FORNECEDORES.grupoInterno }}
                  </legend>

                  <CampoFormulario
                    v-slot="{ id: idEntrada, invalido, descritoPor }"
                    :rotulo="TEXTOS_FORNECEDORES.campoObservacoes"
                    :id-campo="idCampo('observacoes')"
                    :dica="TEXTOS_FORNECEDORES.campoObservacoesDica(formulario.valores.observacoes.length, LIMITES_FORNECEDOR.observacoesMaximo)"
                    :erro="formulario.erros.observacoes"
                  >
                    <Textarea
                      :id="idEntrada"
                      v-model="formulario.valores.observacoes"
                      rows="4"
                      auto-resize
                      :maxlength="LIMITES_FORNECEDOR.observacoesMaximo"
                      :invalid="invalido"
                      :aria-invalid="invalido"
                      :aria-describedby="descritoPor"
                      :readonly="enviando"
                      data-teste="campo-observacoes"
                      @update:model-value="formulario.revalidarAoDigitar('observacoes')"
                      @blur="formulario.validarAoSair('observacoes')"
                    />
                  </CampoFormulario>
                </fieldset>

                <div class="formulario-fornecedor__acoes">
                  <Button
                    type="submit"
                    :label="edicao ? TEXTOS_FORNECEDORES.salvarEdicao : TEXTOS_FORNECEDORES.salvarNovo"
                    :loading="enviando"
                    :aria-busy="enviando"
                    data-teste="salvar-fornecedor"
                  />
                  <Button
                    type="button"
                    :label="TEXTOS_FORNECEDORES.cancelar"
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
            v-if="comLateral"
            class="formulario-fornecedor-tela__lateral pilha pilha--bloco"
            data-teste="lateral-fornecedor"
          >
            <AtuacaoFornecedor
              v-if="atuacao"
              :resumo="atuacao"
            />

            <OrientacaoAcesso
              :id-titulo="idOrientacao"
              :titulo="TEXTOS_FORMULARIO_FORNECEDOR.orientacaoTitulo"
              :itens="orientacao"
              data-teste="orientacao-fornecedor"
            />
          </div>
        </div>
      </div>
    </div>
  </LayoutPainelUsuario>
</template>

<style scoped>
.formulario-fornecedor-tela {
  container: formulario-fornecedor-tela / inline-size;
}

.formulario-fornecedor-tela__corpo {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas:
    'principal'
    'lateral';
  gap: var(--p-ritmo-bloco);
}

.formulario-fornecedor {
  container: formulario-fornecedor / inline-size;
  grid-area: principal;
  min-width: 0;
}

.formulario-fornecedor-tela__lateral {
  grid-area: lateral;
  min-width: 0;
  padding-top: var(--p-ritmo-bloco);
  border-top: 1px solid var(--p-cor-borda);
}

.formulario-fornecedor__situacao {
  margin: 0;
  font-variant-numeric: lining-nums;
}

.formulario-fornecedor__situacao:empty {
  display: none;
}

.formulario-fornecedor__grupo {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.formulario-fornecedor__legenda {
  padding: 0;
  margin-bottom: var(--p-ritmo-grupo);
}

.formulario-fornecedor__colunas {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-grupo);
}

.formulario-fornecedor__acoes {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
}

.formulario-fornecedor__acoes :deep(.p-button) {
  min-height: var(--p-dimensao-alvo-toque);
}

@container formulario-fornecedor (min-width: 40rem) {
  .formulario-fornecedor__colunas {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }

  .formulario-fornecedor__acoes {
    flex-direction: row;
    flex-wrap: wrap;
    gap: var(--p-ritmo-grupo);
  }
}

@container formulario-fornecedor-tela (min-width: 64rem) {
  .formulario-fornecedor-tela__pagina--com-lateral {
    max-width: calc(var(--p-dimensao-largura-formulario) + var(--p-dimensao-largura-autenticacao) + var(--p-ritmo-bloco));
  }

  .formulario-fornecedor-tela__corpo {
    grid-template-columns: minmax(0, var(--p-dimensao-largura-formulario)) minmax(var(--p-dimensao-largura-gaveta), 1fr);
    grid-template-areas: 'principal lateral';
    align-items: start;
  }

  .formulario-fornecedor-tela__lateral {
    align-self: stretch;
    padding-top: 0;
    padding-inline-start: var(--p-ritmo-bloco);
    border-top: 0;
    border-inline-start: 1px solid var(--p-cor-borda);
  }
}
</style>
