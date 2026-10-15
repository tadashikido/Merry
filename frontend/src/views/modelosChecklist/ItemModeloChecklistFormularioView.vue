<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
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
import type { FalhaCasamento } from '@/stores/casamentos'
import { useModelosChecklistStore } from '@/stores/modelosChecklist'
import { ROTULOS_SENTIDO_PRAZO, TEXTOS_ITEM_MODELO, TEXTOS_MODELOS_CHECKLIST } from '@/textos/checklist'
import { ROTULOS_CATEGORIA_TAREFA, ROTULOS_RESPONSAVEL_TAREFA, TEXTOS_TAREFAS } from '@/textos/tarefas'
import { SENTIDOS_PRAZO, type SalvarItemModeloChecklistRequest, type SentidoPrazo } from '@/tipos/checklist'
import { CATEGORIAS_TAREFA, RESPONSAVEIS_TAREFA, type CategoriaTarefa, type ResponsavelTarefa } from '@/tipos/tarefas'
import { LIMITES_CHECKLIST, diasComSentido, diasValidos, sentidoDosDias } from '@/utilitarios/checklist'
import { focarElemento } from '@/utilitarios/foco'
import { LIMITES_TAREFA, descricaoTarefa, tituloTarefa } from '@/utilitarios/tarefas'
import { obrigatorio } from '@/utilitarios/validacao'

const CAMPOS = ['titulo', 'dias', 'responsavel', 'categoria', 'descricao'] as const
type Campo = (typeof CAMPOS)[number]

const CAMPOS_SERVIDOR: Record<string, Campo> = {
  titulo: 'titulo',
  diasAntesDoCasamento: 'dias',
  responsavel: 'responsavel',
  categoria: 'categoria',
  descricao: 'descricao',
}

const props = defineProps<{ modeloId: string; itemId?: string }>()

const store = useModelosChecklistStore()
const roteador = useRouter()
const notificacao = useNotificacao()

const edicao = computed(() => Boolean(props.itemId))
const carregando = ref(false)
const falhaCarga = ref<FalhaCasamento | null>(null)
const itemInexistente = ref(false)
const nomeModelo = ref('')
const enviando = ref(false)
const mensagemErro = ref<string | null>(null)

const sentido = ref<SentidoPrazo>('antes')

const formulario = useFormulario(
  {
    titulo: '',
    dias: 180 as number | null,
    responsavel: 'Assessoria' as ResponsavelTarefa,
    categoria: 'Geral' as CategoriaTarefa,
    descricao: '',
  },
  {
    titulo: [obrigatorio, tituloTarefa],
    dias: [(valor: unknown): string | null => diasValidos(typeof valor === 'number' ? valor : null, sentido.value)],
    descricao: [descricaoTarefa],
  },
)

const idCampo = (campo: Campo | 'sentido') => `item-modelo-${campo}`
const titulo = computed(() => (edicao.value ? TEXTOS_ITEM_MODELO.formEditar : TEXTOS_ITEM_MODELO.formNovo))

const opcoesSentido = SENTIDOS_PRAZO.map((valor) => ({ valor, rotulo: ROTULOS_SENTIDO_PRAZO[valor] }))
const opcoesResponsavel = RESPONSAVEIS_TAREFA.map((valor) => ({ valor, rotulo: ROTULOS_RESPONSAVEL_TAREFA[valor] }))
const opcoesCategoria = CATEGORIAS_TAREFA.map((valor) => ({ valor, rotulo: ROTULOS_CATEGORIA_TAREFA[valor] }))

async function carregar() {
  carregando.value = true
  falhaCarga.value = null
  itemInexistente.value = false
  const resultado = await store.obter(props.modeloId)
  carregando.value = false
  if (!resultado.ok) {
    falhaCarga.value = resultado.falha
    return
  }
  nomeModelo.value = resultado.valor.nome
  if (!props.itemId) {
    return
  }
  const item = resultado.valor.itens.find((atual) => atual.id === props.itemId)
  if (!item) {
    itemInexistente.value = true
    return
  }
  sentido.value = sentidoDosDias(item.diasAntesDoCasamento)
  Object.assign(formulario.valores, {
    titulo: item.titulo,
    dias: Math.abs(item.diasAntesDoCasamento),
    responsavel: item.responsavel,
    categoria: item.categoria,
    descricao: item.descricao ?? '',
  })
}

onMounted(async () => {
  document.title = titulo.value
  await carregar()
  if (!falhaCarga.value && !itemInexistente.value) {
    await focarElemento(idCampo('titulo'))
  }
})

function montarRequest(): SalvarItemModeloChecklistRequest {
  const valores = formulario.valores
  const descricao = valores.descricao.trim()
  return {
    titulo: valores.titulo.trim(),
    descricao: descricao === '' ? null : descricao,
    responsavel: valores.responsavel,
    categoria: valores.categoria,
    diasAntesDoCasamento: diasComSentido(valores.dias ?? 0, sentido.value),
  }
}

function tratarFalha(falha: FalhaCasamento) {
  const camposComErro: Campo[] = []
  for (const [chave, mensagem] of Object.entries(falha.errosCampos)) {
    const campo = CAMPOS_SERVIDOR[chave]
    if (campo) {
      formulario.erros[campo] = mensagem
      camposComErro.push(campo)
    }
  }
  const primeiro = CAMPOS.find((campo) => camposComErro.includes(campo))
  if (primeiro) {
    void focarElemento(idCampo(primeiro))
    return
  }
  if (falha.tipo === 'regra' && falha.mensagem) {
    mensagemErro.value = falha.mensagem
    return
  }
  if (falha.tipo === 'naoEncontrado') {
    mensagemErro.value = TEXTOS_ITEM_MODELO.naoEncontradoTexto
    return
  }
  mensagemErro.value = falha.tipo === 'semPermissao' ? TEXTOS_MODELOS_CHECKLIST.semAcesso : TEXTOS_ITEM_MODELO.erroSalvar
}

async function enviar() {
  mensagemErro.value = null
  if (!formulario.validar()) {
    const campo = formulario.primeiroCampoInvalido.value
    if (campo) {
      await focarElemento(idCampo(campo as Campo))
    }
    return
  }

  enviando.value = true
  const request = montarRequest()
  const resultado = props.itemId
    ? await store.atualizarItem(props.modeloId, props.itemId, request)
    : await store.criarItem(props.modeloId, request)
  enviando.value = false

  if (!resultado.ok) {
    tratarFalha(resultado.falha)
    return
  }

  notificacao.sucesso(edicao.value ? TEXTOS_ITEM_MODELO.toastSalvo : TEXTOS_ITEM_MODELO.toastCriado)
  await roteador.replace({ name: 'modelo-checklist', params: { modeloId: props.modeloId } })
}

function cancelar() {
  void roteador.push({ name: 'modelo-checklist', params: { modeloId: props.modeloId } })
}

function alterarSentido() {
  if (formulario.erros.dias) {
    formulario.validarCampo('dias')
  }
}
</script>

<template>
  <LayoutPainelUsuario>
    <CabecalhoPagina
      :titulo="titulo"
      :descricao="nomeModelo || undefined"
      :rotulos-trilha="{ 'modelo-checklist': nomeModelo || TEXTOS_MODELOS_CHECKLIST.titulo }"
    />

    <div class="formulario-item__area">
      <EstadoCarregando
        v-if="carregando"
        variante="formulario"
        :linhas="4"
      />

      <EstadoErro
        v-else-if="itemInexistente"
        :titulo="TEXTOS_ITEM_MODELO.naoEncontradoTitulo"
        :mensagem="TEXTOS_ITEM_MODELO.naoEncontradoTexto"
        :pode-tentar-novamente="false"
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
          class="formulario-item"
          novalidate
          data-teste="formulario-item-modelo"
          @submit.prevent="enviar"
        >
          <CampoFormulario
            v-slot="{ id: idEntrada, invalido, descritoPor }"
            :rotulo="TEXTOS_ITEM_MODELO.campoTitulo"
            :id-campo="idCampo('titulo')"
            obrigatorio
            :erro="formulario.erros.titulo"
          >
            <InputText
              :id="idEntrada"
              v-model="formulario.valores.titulo"
              autocomplete="off"
              :maxlength="LIMITES_TAREFA.tituloMaximo"
              :placeholder="TEXTOS_ITEM_MODELO.campoTituloPlaceholder"
              aria-required="true"
              :invalid="invalido"
              :aria-invalid="invalido"
              :aria-describedby="descritoPor"
              :readonly="enviando"
              data-teste="campo-titulo"
              @blur="formulario.validarCampo('titulo')"
            />
          </CampoFormulario>

          <fieldset
            class="formulario-item__quando"
            data-teste="campo-quando"
          >
            <legend class="formulario-item__legenda">
              {{ TEXTOS_ITEM_MODELO.campoQuando }}
            </legend>
            <div class="formulario-item__quando-linha">
              <CampoFormulario
                v-slot="{ id: idEntrada, invalido, descritoPor }"
                :rotulo="TEXTOS_ITEM_MODELO.campoDias"
                :id-campo="idCampo('dias')"
                obrigatorio
                :dica="TEXTOS_ITEM_MODELO.campoQuandoDica"
                :erro="formulario.erros.dias"
              >
                <InputNumber
                  v-model="formulario.valores.dias"
                  :input-id="idEntrada"
                  :min="0"
                  :max="LIMITES_CHECKLIST.diasAntesMaximo"
                  :use-grouping="false"
                  :allow-empty="true"
                  aria-required="true"
                  :invalid="invalido"
                  :aria-invalid="invalido"
                  :aria-describedby="descritoPor"
                  :readonly="enviando"
                  data-teste="campo-dias"
                  @blur="formulario.validarCampo('dias')"
                />
              </CampoFormulario>
              <CampoFormulario
                v-slot="{ id: idEntrada }"
                :rotulo="TEXTOS_ITEM_MODELO.campoSentido"
                :id-campo="idCampo('sentido')"
              >
                <SelectButton
                  :id="idEntrada"
                  v-model="sentido"
                  :options="opcoesSentido"
                  option-label="rotulo"
                  option-value="valor"
                  :allow-empty="false"
                  :aria-label="TEXTOS_ITEM_MODELO.campoSentido"
                  :disabled="enviando"
                  data-teste="campo-sentido"
                  @change="alterarSentido"
                />
              </CampoFormulario>
            </div>
          </fieldset>

          <CampoFormulario
            v-slot="{ id: idEntrada, descritoPor }"
            :rotulo="TEXTOS_ITEM_MODELO.campoResponsavel"
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
              :aria-label="TEXTOS_ITEM_MODELO.campoResponsavel"
              :aria-describedby="descritoPor"
              :disabled="enviando"
              data-teste="campo-responsavel"
            />
          </CampoFormulario>

          <CampoFormulario
            v-slot="{ id: idEntrada, descritoPor }"
            :rotulo="TEXTOS_ITEM_MODELO.campoCategoria"
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

          <CampoFormulario
            v-slot="{ id: idEntrada, invalido, descritoPor }"
            :rotulo="TEXTOS_ITEM_MODELO.campoDescricao"
            :id-campo="idCampo('descricao')"
            :dica="TEXTOS_TAREFAS.campoDescricaoDica(formulario.valores.descricao.length, LIMITES_TAREFA.descricaoMaximo)"
            :erro="formulario.erros.descricao"
          >
            <Textarea
              :id="idEntrada"
              v-model="formulario.valores.descricao"
              rows="3"
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

          <div class="formulario-item__acoes">
            <Button
              type="submit"
              :label="edicao ? TEXTOS_ITEM_MODELO.salvar : TEXTOS_ITEM_MODELO.criar"
              :loading="enviando"
              :aria-busy="enviando"
              data-teste="salvar-item"
            />
            <Button
              type="button"
              :label="TEXTOS_ITEM_MODELO.cancelar"
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
.formulario-item__area {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-4);
  max-width: var(--p-dimensao-largura-leitura);
}

.formulario-item {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-6);
}

.formulario-item__quando {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-3);
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.formulario-item__legenda {
  padding: 0;
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto);
}

.formulario-item__quando-linha {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-espaco-4);
}

.formulario-item__acoes {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
}

.formulario-item__acoes :deep(.p-button) {
  min-height: var(--p-dimensao-alvo-toque);
}

@media (min-width: 640px) {
  .formulario-item__quando-linha {
    grid-template-columns: 10rem minmax(0, 1fr);
    align-items: start;
  }

  .formulario-item__acoes {
    flex-direction: row;
  }
}
</style>
