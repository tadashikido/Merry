<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Button from 'primevue/button'

import LayoutPainelUsuario from '@/layouts/LayoutPainelUsuario.vue'
import CabecalhoPagina from '@/componentes/base/CabecalhoPagina.vue'
import DialogoConfirmacao from '@/componentes/base/DialogoConfirmacao.vue'
import EnvioArquivo from '@/componentes/base/EnvioArquivo.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import IndicadorEtapas from '@/componentes/base/IndicadorEtapas.vue'
import LacreIcone from '@/componentes/base/LacreIcone.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import type { TextosEnvioArquivo } from '@/componentes/base/tipos'
import PreviaImportacao from '@/componentes/convidados/PreviaImportacao.vue'
import { useNotificacao } from '@/composables/useNotificacao'
import { useCasamentosStore } from '@/stores/casamentos'
import { useImportacaoConvidadosStore } from '@/stores/importacaoConvidados'
import { TEXTOS_CONVIDADOS } from '@/textos/convidados'
import { EXPLICACAO_COLUNAS, ROTULOS_COLUNA_IMPORTACAO, TEXTOS_IMPORTACAO } from '@/textos/importacaoConvidados'
import type { FalhaConvidados } from '@/stores/convidados'
import type { EtapaImportacao } from '@/tipos/importacaoConvidados'
import { ACEITE_PLANILHA, baixarTexto, verificarArquivoPlanilha, type ProblemaArquivo } from '@/utilitarios/arquivo'
import { focarElemento } from '@/utilitarios/foco'
import { formatarNomesCasal } from '@/utilitarios/formatacao'
import {
  csvLinhasComProblema,
  linhasBloqueantes,
  modeloImportacaoConvidados,
  ultrapassaLimite,
} from '@/utilitarios/importacaoConvidados'

const ID_TITULO_ETAPA = 'importacao-titulo-etapa'
const ID_ARQUIVO = 'importacao-arquivo'

const props = defineProps<{ id: string }>()

const casamentos = useCasamentosStore()
const store = useImportacaoConvidadosStore()
const roteador = useRouter()
const notificacao = useNotificacao()

const envio = ref<InstanceType<typeof EnvioArquivo> | null>(null)
const erroArquivo = ref<string | null>(null)
const nomeArquivo = ref('')
const confirmandoValidos = ref(false)
const anuncio = ref('')

const MENSAGENS_ARQUIVO: Record<ProblemaArquivo, string> = {
  vazio: TEXTOS_IMPORTACAO.erroVazio,
  tamanho: TEXTOS_IMPORTACAO.erroTamanho,
  formato: TEXTOS_IMPORTACAO.erroFormato,
}

const textosEnvio: TextosEnvioArquivo = {
  rotulo: TEXTOS_IMPORTACAO.rotuloArquivo,
  instrucao: TEXTOS_IMPORTACAO.envioInstrucao,
  botao: TEXTOS_IMPORTACAO.envioBotao,
  trocar: TEXTOS_IMPORTACAO.envioTrocar,
  limites: TEXTOS_IMPORTACAO.envioLimites,
  carregando: TEXTOS_IMPORTACAO.envioLendo,
}

const casamento = computed(() => (casamentos.atual?.id === props.id ? casamentos.atual : null))
const falhaCasamento = computed(() => casamentos.falhaAtual)
const nomes = computed(() =>
  casamento.value ? formatarNomesCasal(casamento.value.nomePrimeiraPessoa, casamento.value.nomeSegundaPessoa) : '',
)
const arquivado = computed(() => casamento.value?.arquivado === true)
const previa = computed(() => (store.casamentoId === props.id ? store.previa : null))
const resultado = computed(() => (store.casamentoId === props.id ? store.resultado : null))

const etapa = computed<EtapaImportacao>(() => {
  if (resultado.value) {
    return 'concluida'
  }
  return previa.value ? 'previa' : 'escolha'
})
const indiceEtapa = computed(() => ({ escolha: 0, previa: 1, concluida: 2 })[etapa.value])
const tituloEtapa = computed(() => TEXTOS_IMPORTACAO.etapas[indiceEtapa.value] ?? '')

const bloqueantes = computed(() => (previa.value ? linhasBloqueantes(previa.value) : 0))
const convitesValidos = computed(() => previa.value?.resumo.convitesValidos ?? 0)
const podeImportar = computed(() => previa.value !== null && convitesValidos.value > 0 && !ultrapassaLimite(previa.value))
const convitesFora = computed(() => (previa.value ? previa.value.convites.filter((convite) => !convite.valido) : []))
const pessoasFora = computed(() => convitesFora.value.reduce((total, convite) => total + convite.pessoas.length, 0))
const rotuloImportar = computed(() =>
  bloqueantes.value > 0 ? TEXTOS_IMPORTACAO.importarValidos(convitesValidos.value) : TEXTOS_IMPORTACAO.importarTudo(convitesValidos.value),
)

const falhaImportacao = computed(() =>
  etapa.value === 'previa' && store.falha && store.falha.tipo !== 'semPermissao' ? mensagemFalha(store.falha) : null,
)

function mensagemFalha(falha: FalhaConvidados): string {
  if (falha.tipo === 'regra' && falha.mensagem) {
    return falha.mensagem
  }
  if (falha.tipo === 'conexao' && falha.mensagem) {
    return falha.mensagem
  }
  if (falha.tipo === 'semPermissao') {
    return TEXTOS_IMPORTACAO.semPermissao
  }
  if (falha.tipo === 'validacao') {
    return TEXTOS_IMPORTACAO.erroFormato
  }
  return TEXTOS_IMPORTACAO.erroInesperado
}

watch(
  () => props.id,
  (id) => {
    if (store.casamentoId !== id || store.resultado) {
      store.limpar()
    }
    erroArquivo.value = null
    void casamentos.obter(id)
  },
  { immediate: true },
)

watch(
  nomes,
  (valor) => {
    if (valor) {
      document.title = TEXTOS_IMPORTACAO.tituloDocumento(valor)
    }
  },
  { immediate: true },
)

watch(etapa, (atual, anterior) => {
  if (atual !== anterior) {
    anuncio.value = TEXTOS_IMPORTACAO.etapaAnuncio(indiceEtapa.value + 1, TEXTOS_IMPORTACAO.etapas.length, tituloEtapa.value)
    if (atual === 'previa' && previa.value) {
      anuncio.value = `${anuncio.value}. ${TEXTOS_IMPORTACAO.anuncioPrevia(previa.value.resumo.convitesValidos, linhasBloqueantes(previa.value))}`
    }
    void focarElemento(ID_TITULO_ETAPA)
  }
})

async function selecionar(arquivo: File) {
  const problema = verificarArquivoPlanilha(arquivo)
  if (problema) {
    erroArquivo.value = MENSAGENS_ARQUIVO[problema]
    envio.value?.focar()
    return
  }
  erroArquivo.value = null
  nomeArquivo.value = arquivo.name
  const resposta = await store.preVisualizar(props.id, arquivo)
  if (!resposta.ok) {
    if (resposta.falha.tipo === 'semPermissao') {
      notificacao.erro(TEXTOS_IMPORTACAO.semPermissao)
    }
    erroArquivo.value = mensagemFalha(resposta.falha)
    envio.value?.focar()
  }
}

function baixarModelo() {
  baixarTexto(TEXTOS_IMPORTACAO.nomeArquivoModelo, modeloImportacaoConvidados())
}

function baixarCorrecao() {
  if (previa.value) {
    baixarTexto(TEXTOS_IMPORTACAO.nomeArquivoCorrecao, csvLinhasComProblema(previa.value))
  }
}

function recomecar() {
  store.limpar()
  erroArquivo.value = null
}

function pedirImportacao() {
  if (!podeImportar.value) {
    return
  }
  if (bloqueantes.value > 0) {
    confirmandoValidos.value = true
    return
  }
  void importar(false)
}

async function importar(somenteValidos: boolean) {
  const resposta = await store.importar(somenteValidos)
  confirmandoValidos.value = false
  if (resposta.ok) {
    notificacao.sucesso(TEXTOS_IMPORTACAO.toastSucesso(resposta.valor.convitesCriados, resposta.valor.pessoasCriadas))
    return
  }
  if (resposta.falha.tipo === 'semPermissao') {
    notificacao.erro(TEXTOS_IMPORTACAO.semPermissao)
    return
  }
  void focarElemento('importacao-falha')
}

async function conferirDeNovo() {
  const arquivo = store.arquivo
  if (arquivo) {
    await store.preVisualizar(props.id, arquivo)
  }
}

function verConvidados() {
  void roteador.push({ name: 'casamento-convidados', params: { id: props.id } })
}

function importarOutra() {
  recomecar()
}
</script>

<template>
  <LayoutPainelUsuario>
    <div
      v-if="falhaCasamento?.tipo === 'naoEncontrado'"
      class="pilha pilha--grupo"
    >
      <EstadoErro
        :titulo="TEXTOS_CONVIDADOS.casamentoNaoEncontradoTitulo"
        :mensagem="TEXTOS_CONVIDADOS.casamentoNaoEncontradoTexto"
        :pode-tentar-novamente="false"
      />
      <RouterLink
        class="importacao__voltar"
        :to="{ name: 'casamentos' }"
        data-teste="voltar-casamentos"
      >
        {{ TEXTOS_CONVIDADOS.voltarCasamentos }}
      </RouterLink>
    </div>

    <template v-else>
      <CabecalhoPagina
        :titulo="TEXTOS_IMPORTACAO.titulo"
        :descricao="TEXTOS_IMPORTACAO.subtitulo"
      />

      <EstadoCarregando
        v-if="casamentos.carregandoAtual && !casamento"
        variante="cartao"
        :linhas="2"
      />

      <EstadoErro
        v-else-if="falhaCasamento && !casamento"
        :mensagem="falhaCasamento.tipo === 'semPermissao' ? TEXTOS_IMPORTACAO.semPermissao : TEXTOS_IMPORTACAO.erroInesperado"
        @tentar-novamente="casamentos.obter(id)"
      />

      <div
        v-else-if="arquivado"
        class="importacao pilha pilha--grupo"
      >
        <MensagemFormulario
          variante="informacao"
          :mensagem="TEXTOS_IMPORTACAO.arquivado"
          data-teste="aviso-arquivado"
        />
        <RouterLink
          class="importacao__voltar"
          :to="{ name: 'casamento-convidados', params: { id } }"
        >
          {{ TEXTOS_IMPORTACAO.voltarConvidados }}
        </RouterLink>
      </div>

      <div
        v-else-if="casamento"
        class="importacao pilha pilha--bloco"
        :data-etapa="etapa"
      >
        <IndicadorEtapas
          :etapas="TEXTOS_IMPORTACAO.etapas"
          :atual="indiceEtapa"
          :rotulo="TEXTOS_IMPORTACAO.rotuloEtapas"
        />
        <p
          class="somente-leitor-tela"
          aria-live="polite"
          data-teste="anuncio-importacao"
        >
          {{ anuncio }}
        </p>
        <h2
          :id="ID_TITULO_ETAPA"
          class="somente-leitor-tela"
          tabindex="-1"
        >
          {{ tituloEtapa }}
        </h2>

        <div
          v-if="etapa === 'escolha'"
          class="importacao__escolha"
        >
          <EnvioArquivo
            :id="ID_ARQUIVO"
            ref="envio"
            class="importacao__envio"
            :textos="textosEnvio"
            :aceite="ACEITE_PLANILHA"
            :arquivo="store.arquivo"
            :carregando="store.enviando"
            :erro="erroArquivo"
            @selecionar="selecionar"
          />

          <section
            class="importacao__instrucoes cartao pilha pilha--grupo"
            aria-labelledby="importacao-como-montar"
            data-teste="como-montar"
          >
            <h3 id="importacao-como-montar">
              {{ TEXTOS_IMPORTACAO.comoMontarTitulo }}
            </h3>
            <p class="importacao__texto texto-corrido">
              {{ TEXTOS_IMPORTACAO.comoMontarTexto }}
            </p>
            <dl class="importacao__colunas">
              <div
                v-for="item in EXPLICACAO_COLUNAS"
                :key="item.coluna"
                class="importacao__coluna"
              >
                <dt>{{ ROTULOS_COLUNA_IMPORTACAO[item.coluna] }}</dt>
                <dd>{{ item.texto }}</dd>
              </div>
            </dl>
            <p class="importacao__dica texto-legenda">
              {{ TEXTOS_IMPORTACAO.dicaExcel }}
            </p>
            <Button
              class="importacao__modelo"
              :label="TEXTOS_IMPORTACAO.baixarModelo"
              icon="ie ie-exportar"
              severity="secondary"
              outlined
              data-teste="baixar-modelo"
              @click="baixarModelo"
            />
          </section>

          <div class="importacao__acoes importacao__acoes--inicio">
            <Button
              :label="TEXTOS_IMPORTACAO.voltarConvidados"
              severity="secondary"
              text
              data-teste="voltar-convidados"
              @click="verConvidados"
            />
          </div>
        </div>

        <div
          v-else-if="etapa === 'previa' && previa"
          class="importacao__previa pilha pilha--cartao"
        >
          <MensagemFormulario
            v-if="falhaImportacao"
            id="importacao-falha"
            :mensagem="falhaImportacao"
            data-teste="falha-importacao"
          >
            <Button
              :label="TEXTOS_IMPORTACAO.conferirDeNovo"
              severity="secondary"
              outlined
              size="small"
              :loading="store.enviando"
              data-teste="conferir-de-novo"
              @click="conferirDeNovo"
            />
          </MensagemFormulario>

          <PreviaImportacao
            :previa="previa"
            :nome-arquivo="nomeArquivo"
          >
            <template #acoes-problemas>
              <Button
                v-if="previa.linhasComProblema.length > 0"
                :label="TEXTOS_IMPORTACAO.baixarCorrecao"
                icon="ie ie-exportar"
                severity="secondary"
                outlined
                data-teste="baixar-correcao"
                @click="baixarCorrecao"
              />
              <Button
                v-if="bloqueantes > 0"
                :label="TEXTOS_IMPORTACAO.enviarCorrigida"
                icon="ie ie-importar"
                severity="secondary"
                outlined
                data-teste="enviar-corrigida"
                @click="recomecar"
              />
            </template>
          </PreviaImportacao>

          <p
            v-if="convitesValidos === 0"
            class="importacao__orientacao texto-legenda"
            data-teste="orientacao-nenhum"
          >
            {{ TEXTOS_IMPORTACAO.orientacaoNenhumPronto }}
          </p>

          <div class="importacao__acoes importacao__acoes--fixas">
            <Button
              :label="TEXTOS_IMPORTACAO.cancelar"
              severity="secondary"
              text
              :disabled="store.importando"
              data-teste="cancelar-importacao"
              @click="recomecar"
            />
            <Button
              :label="store.importando ? TEXTOS_IMPORTACAO.importando : rotuloImportar"
              icon="ie ie-concluir"
              :loading="store.importando"
              :disabled="!podeImportar"
              :aria-busy="store.importando"
              data-teste="importar"
              @click="pedirImportacao"
            />
          </div>
        </div>

        <section
          v-else-if="etapa === 'concluida' && resultado"
          class="importacao__concluida cartao"
          data-teste="importacao-concluida"
        >
          <LacreIcone
            icone="ie-concluir"
            data-teste="lacre-concluida"
          />
          <div class="importacao__mensagem-concluida pilha pilha--campo">
            <p class="importacao__titulo-concluida">
              {{ TEXTOS_IMPORTACAO.sucessoTitulo }}
            </p>
            <p class="importacao__texto texto-corrido">
              {{ TEXTOS_IMPORTACAO.sucessoTexto(resultado.convitesCriados, resultado.pessoasCriadas, nomes) }}
            </p>
          </div>
          <div class="importacao__acoes importacao__acoes--inicio">
            <Button
              :label="TEXTOS_IMPORTACAO.importarOutra"
              severity="secondary"
              outlined
              data-teste="importar-outra"
              @click="importarOutra"
            />
            <Button
              :label="TEXTOS_IMPORTACAO.verConvidados"
              data-teste="ver-convidados"
              @click="verConvidados"
            />
          </div>
        </section>
      </div>

      <DialogoConfirmacao
        v-model:visivel="confirmandoValidos"
        :titulo="TEXTOS_IMPORTACAO.confirmarTitulo"
        :mensagem="TEXTOS_IMPORTACAO.confirmarTexto(convitesFora.length, pessoasFora)"
        :rotulo-confirmar="TEXTOS_IMPORTACAO.confirmarAcao(convitesValidos)"
        :rotulo-cancelar="TEXTOS_IMPORTACAO.confirmarVoltar"
        :executando="store.importando"
        @confirmar="importar(true)"
      />
    </template>
  </LayoutPainelUsuario>
</template>

<style scoped>
.importacao {
  container: importacao / inline-size;
}

.importacao__escolha {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-cartao);
  align-items: stretch;
}

.importacao__envio {
  justify-content: center;
}

.importacao__instrucoes {
  min-width: 0;
}

.importacao__colunas {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  margin: 0;
}

.importacao__coluna {
  font-size: var(--p-fonte-tamanho-controle);
  line-height: var(--p-fonte-entrelinha-leitura);
}

.importacao__coluna dt,
.importacao__coluna dd {
  display: inline;
}

.importacao__coluna dt {
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto);
}

.importacao__coluna dt::after {
  content: ': ';
}

.importacao__coluna dd {
  margin: 0;
  color: var(--p-cor-texto-apoio);
}

.importacao__modelo {
  align-self: flex-start;
}

.importacao__acoes {
  display: flex;
  flex-direction: column-reverse;
  gap: var(--p-ritmo-campo);
}

.importacao__acoes :deep(.p-button) {
  min-height: var(--p-dimensao-alvo-toque);
}

.importacao__acoes--fixas {
  position: sticky;
  bottom: 0;
  z-index: 1;
  padding-block: var(--p-ritmo-grupo);
  background: var(--p-cor-fundo);
  border-top: 1px solid var(--p-cor-borda);
}

.importacao__concluida {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--p-ritmo-cartao);
}

.importacao__titulo-concluida {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-pagina-celular);
  font-weight: var(--p-fonte-peso-leve);
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-texto);
}

.importacao__concluida .importacao__acoes {
  align-self: stretch;
}

.importacao__voltar {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  min-height: var(--p-dimensao-alvo-toque);
}

@container importacao (min-width: 40rem) {
  .importacao__acoes {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .importacao__acoes--inicio {
    justify-content: flex-start;
  }

  .importacao__acoes--fixas {
    position: static;
    padding-block: var(--p-ritmo-grupo) 0;
    background: none;
  }

  .importacao__concluida {
    padding: var(--p-ritmo-bloco);
  }

  .importacao__titulo-concluida {
    font-size: var(--p-fonte-tamanho-pagina);
  }
}

@container importacao (min-width: 52rem) {
  .importacao__escolha {
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  }

  .importacao__acoes--inicio {
    grid-column: 1 / -1;
  }
}
</style>
