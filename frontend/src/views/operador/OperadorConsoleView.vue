<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'

import BadgeStatus from '@/componentes/base/BadgeStatus.vue'
import DialogoConfirmacao from '@/componentes/base/DialogoConfirmacao.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import EstadoVazio from '@/componentes/base/EstadoVazio.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import { useImpersonacaoStore } from '@/stores/impersonacao'
import { useOperacaoAssessoriasStore, type AssessoriaResumo, type SituacaoFiltro } from '@/stores/operacaoAssessorias'
import { TEXTOS_IMPERSONACAO } from '@/textos/impersonacao'
import { TEXTOS_OPERACAO } from '@/textos/operacao'

interface Mensagem {
  variante: 'erro' | 'sucesso'
  texto: string
}

const store = useOperacaoAssessoriasStore()
const impersonacao = useImpersonacaoStore()
const roteador = useRouter()

const busca = ref('')
const situacao = ref<SituacaoFiltro | null>(null)
const alvo = ref<AssessoriaResumo | null>(null)
const executando = ref(false)
const mensagem = ref<Mensagem | null>(null)
const verComoAlvo = ref<AssessoriaResumo | null>(null)
const motivo = ref('')
const iniciandoImpersonacao = ref(false)

const opcoesSituacao = [
  { rotulo: TEXTOS_OPERACAO.situacaoAtivas, valor: 'ativa' as SituacaoFiltro },
  { rotulo: TEXTOS_OPERACAO.situacaoSuspensas, valor: 'suspensa' as SituacaoFiltro },
]

const confirmacaoTitulo = computed(() =>
  alvo.value?.suspensa ? TEXTOS_OPERACAO.confirmarReativarTitulo : TEXTOS_OPERACAO.confirmarSuspenderTitulo,
)
const confirmacaoTexto = computed(() =>
  alvo.value?.suspensa ? TEXTOS_OPERACAO.confirmarReativarTexto : TEXTOS_OPERACAO.confirmarSuspenderTexto,
)
const confirmacaoRotulo = computed(() =>
  alvo.value?.suspensa ? TEXTOS_OPERACAO.acaoReativar : TEXTOS_OPERACAO.acaoSuspender,
)

function aplicar() {
  void store.listar(busca.value.trim() || undefined, situacao.value ?? undefined)
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR')
}

function formatarUltimoLogin(iso: string | null): string {
  return iso ? formatarData(iso) : TEXTOS_OPERACAO.ultimoLoginNunca
}

async function confirmar() {
  const assessoria = alvo.value
  if (!assessoria) {
    return
  }
  executando.value = true
  const resultado = assessoria.suspensa ? await store.reativar(assessoria.id) : await store.suspender(assessoria.id)
  executando.value = false
  alvo.value = null

  if (resultado.ok) {
    mensagem.value = {
      variante: 'sucesso',
      texto: assessoria.suspensa ? TEXTOS_OPERACAO.sucessoReativada : TEXTOS_OPERACAO.sucessoSuspensa,
    }
    aplicar()
    return
  }

  mensagem.value = { variante: 'erro', texto: TEXTOS_OPERACAO.erroAcao }
}

function abrirVerComo(assessoria: AssessoriaResumo) {
  verComoAlvo.value = assessoria
  motivo.value = ''
}

function fecharVerComo() {
  if (!iniciandoImpersonacao.value) {
    verComoAlvo.value = null
  }
}

async function confirmarVerComo() {
  const assessoria = verComoAlvo.value
  if (!assessoria || motivo.value.trim().length === 0) {
    return
  }
  iniciandoImpersonacao.value = true
  const resultado = await impersonacao.iniciar(assessoria.id, motivo.value.trim())
  iniciandoImpersonacao.value = false

  if (resultado.ok) {
    verComoAlvo.value = null
    await roteador.push({ name: 'inicio' })
    return
  }

  verComoAlvo.value = null
  mensagem.value = { variante: 'erro', texto: TEXTOS_IMPERSONACAO.erroIniciar }
}

watch(situacao, aplicar)

onMounted(aplicar)
</script>

<template>
  <section class="operacao-console">
    <h1 class="operacao-console__titulo">
      {{ TEXTOS_OPERACAO.consoleTitulo }}
    </h1>

    <form
      class="operacao-console__filtros"
      @submit.prevent="aplicar"
    >
      <InputText
        v-model="busca"
        type="search"
        :placeholder="TEXTOS_OPERACAO.buscaPlaceholder"
        data-teste="operacao-busca"
      />
      <Select
        v-model="situacao"
        :options="opcoesSituacao"
        option-label="rotulo"
        option-value="valor"
        :placeholder="TEXTOS_OPERACAO.situacaoTodas"
        show-clear
        data-teste="operacao-situacao"
      />
      <Button
        type="submit"
        :label="TEXTOS_OPERACAO.buscar"
        data-teste="operacao-buscar"
      />
    </form>

    <MensagemFormulario
      v-if="mensagem"
      :variante="mensagem.variante"
      :mensagem="mensagem.texto"
    />

    <EstadoCarregando
      v-if="store.carregando"
      variante="lista"
    />
    <EstadoErro
      v-else-if="store.erro"
      @tentar-novamente="aplicar"
    />
    <EstadoVazio
      v-else-if="store.assessorias.length === 0"
      :titulo="busca || situacao ? TEXTOS_OPERACAO.vazioSemResultado : TEXTOS_OPERACAO.vazioSemOrgs"
    />
    <div
      v-else
      class="operacao-console__tabela-wrapper"
    >
      <table class="operacao-console__tabela">
        <thead>
          <tr>
            <th scope="col">
              {{ TEXTOS_OPERACAO.colunaNome }}
            </th>
            <th scope="col">
              {{ TEXTOS_OPERACAO.colunaCriada }}
            </th>
            <th scope="col">
              {{ TEXTOS_OPERACAO.colunaEventos }}
            </th>
            <th scope="col">
              {{ TEXTOS_OPERACAO.colunaUltimoLogin }}
            </th>
            <th scope="col">
              {{ TEXTOS_OPERACAO.colunaSituacao }}
            </th>
            <th scope="col">
              {{ TEXTOS_OPERACAO.colunaAcoes }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="assessoria in store.assessorias"
            :key="assessoria.id"
            data-teste="operacao-linha"
          >
            <td>{{ assessoria.nome }}</td>
            <td>{{ formatarData(assessoria.criadaEm) }}</td>
            <td>{{ assessoria.totalEventos }}</td>
            <td>{{ formatarUltimoLogin(assessoria.ultimoLoginEm) }}</td>
            <td>
              <BadgeStatus
                :texto="assessoria.suspensa ? TEXTOS_OPERACAO.badgeSuspensa : TEXTOS_OPERACAO.badgeAtiva"
                :variante="assessoria.suspensa ? 'erro' : 'sucesso'"
              />
            </td>
            <td>
              <div class="operacao-console__acoes">
                <Button
                  :label="TEXTOS_IMPERSONACAO.verComo"
                  size="small"
                  data-teste="operacao-ver-como"
                  @click="abrirVerComo(assessoria)"
                />
                <Button
                  :label="assessoria.suspensa ? TEXTOS_OPERACAO.acaoReativar : TEXTOS_OPERACAO.acaoSuspender"
                  severity="secondary"
                  size="small"
                  data-teste="operacao-acao"
                  @click="alvo = assessoria"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <DialogoConfirmacao
      :visivel="alvo !== null"
      :titulo="confirmacaoTitulo"
      :mensagem="confirmacaoTexto"
      :rotulo-confirmar="confirmacaoRotulo"
      :rotulo-cancelar="TEXTOS_OPERACAO.cancelar"
      :executando="executando"
      :perigoso="alvo?.suspensa === false"
      @update:visivel="alvo = null"
      @confirmar="confirmar"
      @cancelar="alvo = null"
    />

    <Dialog
      :visible="verComoAlvo !== null"
      modal
      :header="verComoAlvo ? TEXTOS_IMPERSONACAO.dialogoTitulo(verComoAlvo.nome) : ''"
      :closable="!iniciandoImpersonacao"
      :close-on-escape="!iniciandoImpersonacao"
      :draggable="false"
      :style="{ width: '30rem' }"
      data-teste="dialogo-ver-como"
      @update:visible="fecharVerComo"
    >
      <label
        class="operacao-console__motivo-rotulo"
        for="impersonacao-motivo"
      >
        {{ TEXTOS_IMPERSONACAO.motivoLabel }}
      </label>
      <Textarea
        id="impersonacao-motivo"
        v-model="motivo"
        class="operacao-console__motivo"
        rows="3"
        :placeholder="TEXTOS_IMPERSONACAO.motivoPlaceholder"
        :disabled="iniciandoImpersonacao"
        data-teste="impersonacao-motivo"
      />
      <template #footer>
        <Button
          :label="TEXTOS_IMPERSONACAO.cancelar"
          severity="secondary"
          outlined
          :disabled="iniciandoImpersonacao"
          @click="fecharVerComo"
        />
        <Button
          :label="TEXTOS_IMPERSONACAO.iniciar"
          :loading="iniciandoImpersonacao"
          :disabled="motivo.trim().length === 0"
          data-teste="impersonacao-iniciar"
          @click="confirmarVerComo"
        />
      </template>
    </Dialog>
  </section>
</template>

<style scoped>
.operacao-console {
  max-width: 72rem;
  margin-inline: auto;
  padding: 1.5rem;
}

.operacao-console__titulo {
  margin: 0 0 1rem;
}

.operacao-console__filtros {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.operacao-console__tabela-wrapper {
  overflow-x: auto;
}

.operacao-console__tabela {
  width: 100%;
  border-collapse: collapse;
}

.operacao-console__tabela th,
.operacao-console__tabela td {
  padding: 0.625rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--p-cor-borda, #e2e8f0);
  white-space: nowrap;
}

.operacao-console__tabela th {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color, #64748b);
}

.operacao-console__acoes {
  display: flex;
  gap: 0.375rem;
}

.operacao-console__motivo-rotulo {
  display: block;
  margin-bottom: 0.375rem;
  font-size: 0.875rem;
}

.operacao-console__motivo {
  width: 100%;
}
</style>
