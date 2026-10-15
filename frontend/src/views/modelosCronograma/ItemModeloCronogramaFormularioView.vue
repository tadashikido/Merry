<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
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
import { useConfirmarExclusao } from '@/composables/useConfirmarExclusao'
import { useFormulario } from '@/composables/useFormulario'
import { useNotificacao } from '@/composables/useNotificacao'
import type { FalhaCasamento } from '@/stores/casamentos'
import { useModelosCronogramaStore } from '@/stores/modelosCronograma'
import { ROTULOS_DIA_CRONOGRAMA, TEXTOS_CRONOGRAMA } from '@/textos/cronograma'
import { ROTULOS_CATEGORIA_FORNECEDOR } from '@/textos/fornecedores'
import {
  ROTULOS_LOCAL_MODELO,
  TEXTOS_ITEM_MODELO_CRONOGRAMA,
  TEXTOS_MODELOS_CRONOGRAMA,
} from '@/textos/modelosCronograma'
import { DIAS_CRONOGRAMA, type DiaCronograma } from '@/tipos/cronograma'
import { CATEGORIAS_FORNECEDOR, type CategoriaFornecedor } from '@/tipos/fornecedores'
import type { OpcaoLocalModelo, SalvarItemModeloCronogramaRequest } from '@/tipos/modelosCronograma'
import {
  descreverRelativoCerimonia,
  duracaoEntre,
  formatarDuracao,
  LIMITES_CRONOGRAMA,
  proximoInicioSugerido,
  regraAtividade,
  regraInicio,
  regraTermino,
  terminaNoDiaSeguinte,
  terminoDe,
} from '@/utilitarios/cronograma'
import { focarElemento } from '@/utilitarios/foco'
import { HORARIO_REFERENCIA_PADRAO, minutosDesdeCerimonia, opcaoLocalDoItem } from '@/utilitarios/modelosCronograma'
import { tamanhoMaximo } from '@/utilitarios/validacao'

const CAMPOS = ['inicio', 'termino', 'atividade', 'local', 'responsavel', 'categoriaFornecedor', 'instrucoes'] as const
type Campo = (typeof CAMPOS)[number]

const CAMPOS_SERVIDOR: Record<string, Campo> = {
  minutosDesdeCerimonia: 'inicio',
  duracaoMinutos: 'termino',
  atividade: 'atividade',
  referenciaLocal: 'local',
  local: 'local',
  responsavel: 'responsavel',
  categoriaFornecedor: 'categoriaFornecedor',
  instrucoes: 'instrucoes',
}

const props = defineProps<{ modeloId: string; itemId?: string }>()

const store = useModelosCronogramaStore()
const roteador = useRouter()
const notificacao = useNotificacao()
const { confirmarExclusao } = useConfirmarExclusao()

const edicao = computed(() => Boolean(props.itemId))
const carregando = ref(false)
const falhaCarga = ref<FalhaCasamento | null>(null)
const itemInexistente = ref(false)
const nomeModelo = ref('')
const referencia = ref(HORARIO_REFERENCIA_PADRAO)
const enviando = ref(false)
const mensagemErro = ref<string | null>(null)
const opcaoLocal = ref<OpcaoLocalModelo>('Outro')

let lerInicio: () => string = () => ''

const formulario = useFormulario(
  {
    dia: 'DiaDoCasamento' as DiaCronograma,
    inicio: '',
    termino: '',
    atividade: '',
    local: '',
    responsavel: '',
    categoriaFornecedor: null as CategoriaFornecedor | null,
    instrucoes: '',
  },
  {
    inicio: [regraInicio],
    termino: [regraTermino(() => lerInicio())],
    atividade: [regraAtividade],
    local: [tamanhoMaximo(LIMITES_CRONOGRAMA.local)],
    responsavel: [tamanhoMaximo(LIMITES_CRONOGRAMA.responsavel)],
    instrucoes: [tamanhoMaximo(LIMITES_CRONOGRAMA.texto)],
  },
)

lerInicio = () => formulario.valores.inicio

const idCampo = (campo: Campo) => `item-modelo-cronograma-${campo}`
const titulo = computed(() => (edicao.value ? TEXTOS_ITEM_MODELO_CRONOGRAMA.editar : TEXTOS_ITEM_MODELO_CRONOGRAMA.novo))
const opcoesDia = DIAS_CRONOGRAMA.map((valor) => ({ valor, rotulo: ROTULOS_DIA_CRONOGRAMA[valor] }))
const opcoesLocal = (['Cerimonia', 'Recepcao', 'Outro'] as const).map((valor) => ({ valor, rotulo: ROTULOS_LOCAL_MODELO[valor] }))
const opcoesCategoria = [
  { valor: null as CategoriaFornecedor | null, rotulo: TEXTOS_ITEM_MODELO_CRONOGRAMA.nenhumaCategoria },
  ...CATEGORIAS_FORNECEDOR.map((valor) => ({ valor: valor as CategoriaFornecedor | null, rotulo: ROTULOS_CATEGORIA_FORNECEDOR[valor] })),
]

const minutos = computed(() => minutosDesdeCerimonia(formulario.valores.dia, formulario.valores.inicio.trim(), referencia.value))
const dicaInicio = computed(() => descreverRelativoCerimonia(minutos.value) ?? undefined)
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
  referencia.value = resultado.valor.horarioReferencia
  if (!props.itemId) {
    return
  }
  const item = resultado.valor.itens.find((atual) => atual.id === props.itemId)
  if (!item) {
    itemInexistente.value = true
    return
  }
  opcaoLocal.value = opcaoLocalDoItem(item)
  Object.assign(formulario.valores, {
    dia: item.dia,
    inicio: item.inicio,
    termino: terminoDe(item.inicio, item.duracaoMinutos),
    atividade: item.atividade,
    local: item.local ?? '',
    responsavel: item.responsavel ?? '',
    categoriaFornecedor: item.categoriaFornecedor,
    instrucoes: item.instrucoes ?? '',
  })
}

onMounted(async () => {
  document.title = titulo.value
  await carregar()
  if (!falhaCarga.value && !itemInexistente.value) {
    await focarElemento(idCampo('inicio'))
  }
})

function texto(valor: string): string | null {
  const limpo = valor.trim()
  return limpo === '' ? null : limpo
}

function montarRequest(): SalvarItemModeloCronogramaRequest {
  const valores = formulario.valores
  return {
    minutosDesdeCerimonia: minutos.value ?? 0,
    duracaoMinutos: duracao.value,
    atividade: valores.atividade.trim(),
    referenciaLocal: opcaoLocal.value === 'Outro' ? null : opcaoLocal.value,
    local: opcaoLocal.value === 'Outro' ? texto(valores.local) : null,
    responsavel: texto(valores.responsavel),
    categoriaFornecedor: valores.categoriaFornecedor,
    instrucoes: texto(valores.instrucoes),
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
    mensagemErro.value = TEXTOS_ITEM_MODELO_CRONOGRAMA.naoEncontradoTexto
    return
  }
  mensagemErro.value =
    falha.tipo === 'semPermissao' ? TEXTOS_MODELOS_CRONOGRAMA.semAcesso : TEXTOS_ITEM_MODELO_CRONOGRAMA.erroSalvar
}

async function salvar(continuar: boolean) {
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

  notificacao.sucesso(edicao.value ? TEXTOS_ITEM_MODELO_CRONOGRAMA.toastAtualizado : TEXTOS_ITEM_MODELO_CRONOGRAMA.toastAdicionado)

  if (continuar && !props.itemId) {
    const dia = formulario.valores.dia
    const proximo = proximoInicioSugerido(formulario.valores.inicio.trim(), formulario.valores.termino.trim())
    formulario.redefinir()
    opcaoLocal.value = 'Outro'
    formulario.valores.dia = dia
    formulario.valores.inicio = proximo
    await focarElemento(idCampo('inicio'))
    return
  }

  await roteador.replace({ name: 'modelo-cronograma', params: { modeloId: props.modeloId }, query: { item: resultado.valor.id } })
}

function cancelar() {
  void roteador.push({ name: 'modelo-cronograma', params: { modeloId: props.modeloId } })
}

function excluir() {
  const itemId = props.itemId
  if (!itemId || enviando.value) {
    return
  }
  confirmarExclusao({
    nomeItem: formulario.valores.atividade.trim(),
    mensagem: TEXTOS_ITEM_MODELO_CRONOGRAMA.confirmarExclusao,
    mensagemSucesso: TEXTOS_ITEM_MODELO_CRONOGRAMA.toastExcluido,
    aoConfirmar: async () => {
      const resultado = await store.removerItem(props.modeloId, itemId)
      if (!resultado.ok) {
        notificacao.erro(TEXTOS_MODELOS_CRONOGRAMA.erroExcluir)
        throw new Error(resultado.falha.tipo)
      }
      await roteador.replace({ name: 'modelo-cronograma', params: { modeloId: props.modeloId } })
    },
  })
}
</script>

<template>
  <LayoutPainelUsuario>
    <CabecalhoPagina
      :titulo="titulo"
      :descricao="nomeModelo ? TEXTOS_MODELOS_CRONOGRAMA.apoioReferencia(referencia) : undefined"
      :rotulos-trilha="{ 'modelo-cronograma': nomeModelo || TEXTOS_MODELOS_CRONOGRAMA.titulo }"
    />

    <div class="formulario-item-cronograma__area">
      <EstadoCarregando
        v-if="carregando"
        variante="formulario"
        :linhas="5"
      />

      <EstadoErro
        v-else-if="itemInexistente"
        :titulo="TEXTOS_ITEM_MODELO_CRONOGRAMA.naoEncontradoTitulo"
        :mensagem="TEXTOS_ITEM_MODELO_CRONOGRAMA.naoEncontradoTexto"
        :pode-tentar-novamente="false"
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
          class="formulario-item-cronograma"
          novalidate
          data-teste="formulario-item-modelo-cronograma"
          @submit.prevent="salvar(false)"
        >
          <div class="formulario-item-cronograma__campo">
            <span
              id="item-modelo-cronograma-dia-rotulo"
              class="formulario-item-cronograma__rotulo"
            >{{ TEXTOS_CRONOGRAMA.campoDia }}</span>
            <div class="formulario-item-cronograma__trilho">
              <SelectButton
                v-model="formulario.valores.dia"
                :options="opcoesDia"
                option-label="rotulo"
                option-value="valor"
                :allow-empty="false"
                aria-labelledby="item-modelo-cronograma-dia-rotulo"
                :disabled="enviando"
                data-teste="campo-dia"
              />
            </div>
          </div>

          <div class="formulario-item-cronograma__horarios">
            <CampoFormulario
              v-slot="{ id: idEntrada, invalido, descritoPor }"
              :rotulo="TEXTOS_CRONOGRAMA.campoInicio"
              :id-campo="idCampo('inicio')"
              obrigatorio
              :dica="dicaInicio"
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
                :readonly="enviando"
                data-teste="campo-inicio"
                @blur="formulario.validarCampo('inicio')"
              />
            </CampoFormulario>
            <CampoFormulario
              v-slot="{ id: idEntrada, invalido, descritoPor }"
              :rotulo="TEXTOS_CRONOGRAMA.campoTermino"
              :id-campo="idCampo('termino')"
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
                :readonly="enviando"
                data-teste="campo-termino"
                @blur="formulario.validarCampo('termino')"
              />
            </CampoFormulario>
          </div>

          <CampoFormulario
            v-slot="{ id: idEntrada, invalido, descritoPor }"
            :rotulo="TEXTOS_CRONOGRAMA.campoAtividade"
            :id-campo="idCampo('atividade')"
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
              :readonly="enviando"
              data-teste="campo-atividade"
              @blur="formulario.validarCampo('atividade')"
            />
          </CampoFormulario>

          <div class="formulario-item-cronograma__campo">
            <span
              id="item-modelo-cronograma-local-rotulo"
              class="formulario-item-cronograma__rotulo"
            >{{ TEXTOS_ITEM_MODELO_CRONOGRAMA.campoLocal }}</span>
            <div class="formulario-item-cronograma__trilho">
              <SelectButton
                v-model="opcaoLocal"
                :options="opcoesLocal"
                option-label="rotulo"
                option-value="valor"
                :allow-empty="false"
                aria-labelledby="item-modelo-cronograma-local-rotulo"
                :disabled="enviando"
                data-teste="campo-opcao-local"
              />
            </div>
          </div>

          <CampoFormulario
            v-if="opcaoLocal === 'Outro'"
            v-slot="{ id: idEntrada, invalido, descritoPor }"
            :rotulo="TEXTOS_ITEM_MODELO_CRONOGRAMA.campoLocalOutro"
            :id-campo="idCampo('local')"
            :erro="formulario.erros.local"
          >
            <InputText
              :id="idEntrada"
              v-model="formulario.valores.local"
              :maxlength="LIMITES_CRONOGRAMA.local"
              :invalid="invalido"
              :aria-invalid="invalido"
              :aria-describedby="descritoPor"
              :readonly="enviando"
              data-teste="campo-local"
            />
          </CampoFormulario>

          <CampoFormulario
            v-slot="{ id: idEntrada, invalido, descritoPor }"
            :rotulo="TEXTOS_CRONOGRAMA.campoResponsavel"
            :id-campo="idCampo('responsavel')"
            :dica="TEXTOS_CRONOGRAMA.dicaResponsavel"
            :erro="formulario.erros.responsavel"
          >
            <InputText
              :id="idEntrada"
              v-model="formulario.valores.responsavel"
              :maxlength="LIMITES_CRONOGRAMA.responsavel"
              :invalid="invalido"
              :aria-invalid="invalido"
              :aria-describedby="descritoPor"
              :readonly="enviando"
              data-teste="campo-responsavel"
            />
          </CampoFormulario>

          <CampoFormulario
            v-slot="{ id: idEntrada, invalido, descritoPor }"
            :rotulo="TEXTOS_ITEM_MODELO_CRONOGRAMA.campoCategoria"
            :id-campo="idCampo('categoriaFornecedor')"
            :dica="TEXTOS_ITEM_MODELO_CRONOGRAMA.dicaCategoria"
            :erro="formulario.erros.categoriaFornecedor"
          >
            <Select
              v-model="formulario.valores.categoriaFornecedor"
              :input-id="idEntrada"
              :options="opcoesCategoria"
              option-label="rotulo"
              option-value="valor"
              :invalid="invalido"
              :aria-describedby="descritoPor"
              :disabled="enviando"
              data-teste="campo-categoria"
            />
          </CampoFormulario>

          <CampoFormulario
            v-slot="{ id: idEntrada, invalido, descritoPor }"
            :rotulo="TEXTOS_CRONOGRAMA.campoInstrucoes"
            :id-campo="idCampo('instrucoes')"
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
              :readonly="enviando"
              data-teste="campo-instrucoes"
            />
          </CampoFormulario>

          <div class="formulario-item-cronograma__rodape">
            <Button
              v-if="edicao"
              type="button"
              :label="TEXTOS_ITEM_MODELO_CRONOGRAMA.excluir"
              icon="ie ie-excluir"
              severity="danger"
              text
              :disabled="enviando"
              data-teste="excluir-item"
              @click="excluir"
            />
            <div class="formulario-item-cronograma__acoes">
              <Button
                type="button"
                :label="TEXTOS_ITEM_MODELO_CRONOGRAMA.cancelar"
                severity="secondary"
                text
                :disabled="enviando"
                data-teste="cancelar"
                @click="cancelar"
              />
              <Button
                v-if="!edicao"
                type="button"
                :label="TEXTOS_ITEM_MODELO_CRONOGRAMA.salvarOutro"
                severity="secondary"
                outlined
                :disabled="enviando"
                data-teste="salvar-outro"
                @click="salvar(true)"
              />
              <Button
                type="submit"
                :label="TEXTOS_ITEM_MODELO_CRONOGRAMA.salvar"
                :loading="enviando"
                :aria-busy="enviando"
                data-teste="salvar-item"
              />
            </div>
          </div>
        </form>
      </template>
    </div>
  </LayoutPainelUsuario>
</template>

<style scoped>
.formulario-item-cronograma__area {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-4);
  max-width: var(--p-dimensao-largura-leitura);
}

.formulario-item-cronograma {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-5);
}

.formulario-item-cronograma__campo {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
}

.formulario-item-cronograma__rotulo {
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto);
}

.formulario-item-cronograma__trilho {
  max-width: 100%;
  overflow-x: auto;
}

.formulario-item-cronograma__horarios {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--p-espaco-3);
}

.formulario-item-cronograma__rodape {
  display: flex;
  flex-direction: column-reverse;
  gap: var(--p-espaco-3);
}

.formulario-item-cronograma__acoes {
  display: flex;
  flex-direction: column-reverse;
  gap: var(--p-espaco-2);
}

.formulario-item-cronograma__rodape :deep(.p-button) {
  min-height: var(--p-dimensao-alvo-toque);
}

@media (min-width: 640px) {
  .formulario-item-cronograma__rodape {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .formulario-item-cronograma__acoes {
    flex-direction: row;
    margin-left: auto;
  }
}
</style>
