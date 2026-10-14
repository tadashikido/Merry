<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Button from 'primevue/button'

import LayoutPainelUsuario from '@/layouts/LayoutPainelUsuario.vue'
import BadgeStatus from '@/componentes/base/BadgeStatus.vue'
import CabecalhoPagina from '@/componentes/base/CabecalhoPagina.vue'
import CanaisContato from '@/componentes/base/CanaisContato.vue'
import DialogoConfirmacao from '@/componentes/base/DialogoConfirmacao.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import EstadoVazio from '@/componentes/base/EstadoVazio.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import MenuAcoes from '@/componentes/base/MenuAcoes.vue'
import type { ItemMenuAcoes } from '@/componentes/base/tipos'
import { useConfirmarExclusao } from '@/composables/useConfirmarExclusao'
import { useNotificacao } from '@/composables/useNotificacao'
import { useFornecedoresStore } from '@/stores/fornecedores'
import { ROTULOS_CATEGORIA_FORNECEDOR, TEXTOS_FORNECEDORES } from '@/textos/fornecedores'
import { ROTULOS_STATUS_FORNECEDOR_CASAMENTO, TEXTOS_HISTORICO_FORNECEDOR } from '@/textos/fornecedoresCasamento'
import type { FornecedorDto } from '@/tipos/fornecedores'
import { formatarData, formatarDataCalendarioCurta, formatarNomesCasal } from '@/utilitarios/formatacao'
import { possuiContato } from '@/utilitarios/fornecedores'
import { VARIANTES_STATUS_FORNECEDOR_CASAMENTO } from '@/utilitarios/fornecedoresCasamento'

const props = defineProps<{ fornecedorId: string }>()

const store = useFornecedoresStore()
const roteador = useRouter()
const notificacao = useNotificacao()
const { confirmarExclusao } = useConfirmarExclusao()

const fornecedor = computed(() => (store.atual?.id === props.fornecedorId ? store.atual : null))
const falha = computed(() => (fornecedor.value ? null : store.falhaAtual))
const temContato = computed(() => (fornecedor.value ? possuiContato(fornecedor.value) : false))
const participacoes = computed(() => (store.participacoesDe === props.fornecedorId ? store.participacoes : null))
const falhaParticipacoes = computed(() => (store.participacoesDe === props.fornecedorId ? store.falhaParticipacoes : null))
const exclusaoBloqueada = ref(false)

const acoes = computed<ItemMenuAcoes[]>(() => [
  fornecedor.value?.arquivado
    ? { chave: 'restaurar', rotulo: TEXTOS_FORNECEDORES.restaurar, icone: 'ie ie-restaurar' }
    : { chave: 'arquivar', rotulo: TEXTOS_FORNECEDORES.arquivar, icone: 'ie ie-arquivar' },
  { chave: 'excluir', rotulo: TEXTOS_FORNECEDORES.excluir, icone: 'ie ie-excluir', perigoso: true },
])

onMounted(() => {
  document.title = TEXTOS_FORNECEDORES.tituloDetalhe
})

watch(
  () => props.fornecedorId,
  (id) => {
    void store.carregarAtual(id)
    void store.carregarParticipacoes(id)
  },
  { immediate: true },
)

function editar() {
  void roteador.push({ name: 'fornecedor-editar', params: { fornecedorId: props.fornecedorId } })
}

async function arquivar(atual: FornecedorDto) {
  const resultado = await store.arquivar(atual.id)
  if (!resultado.ok) {
    notificacao.erro(TEXTOS_FORNECEDORES.erroArquivar)
    return
  }
  notificacao.sucesso(TEXTOS_FORNECEDORES.toastArquivado(atual.nomeEmpresa), {
    desfazer: () => restaurar(atual),
  })
}

async function restaurar(atual: FornecedorDto) {
  const resultado = await store.restaurar(atual.id)
  if (!resultado.ok) {
    notificacao.erro(TEXTOS_FORNECEDORES.erroRestaurar)
    return
  }
  notificacao.sucesso(TEXTOS_FORNECEDORES.toastRestaurado(atual.nomeEmpresa))
}

function excluir(atual: FornecedorDto) {
  confirmarExclusao({
    nomeItem: atual.nomeEmpresa,
    mensagem: TEXTOS_FORNECEDORES.confirmarExclusaoTexto,
    mensagemSucesso: TEXTOS_FORNECEDORES.toastExcluido(atual.nomeEmpresa),
    aoConfirmar: async () => {
      const resultado = await store.remover(atual.id)
      if (!resultado.ok) {
        notificacao.erro(
          resultado.falha.tipo === 'regra' && resultado.falha.mensagem ? resultado.falha.mensagem : TEXTOS_FORNECEDORES.erroExcluir,
        )
        throw new Error(resultado.falha.tipo)
      }
      await roteador.replace({ name: 'fornecedores' })
    },
  })
}

function executarAcao(chave: string) {
  const atual = fornecedor.value
  if (!atual) {
    return
  }
  if (chave === 'arquivar') {
    void arquivar(atual)
    return
  }
  if (chave === 'restaurar') {
    void restaurar(atual)
    return
  }
  if ((participacoes.value?.length ?? 0) > 0) {
    exclusaoBloqueada.value = true
    return
  }
  excluir(atual)
}

function arquivarEmVezDeExcluir() {
  exclusaoBloqueada.value = false
  if (fornecedor.value && !fornecedor.value.arquivado) {
    void arquivar(fornecedor.value)
  }
}
</script>

<template>
  <LayoutPainelUsuario>
    <template v-if="falha?.tipo === 'naoEncontrado'">
      <EstadoErro
        :titulo="TEXTOS_FORNECEDORES.naoEncontradoTitulo"
        :mensagem="TEXTOS_FORNECEDORES.naoEncontradoTexto"
        :pode-tentar-novamente="false"
      />
      <RouterLink
        class="fornecedor__voltar"
        :to="{ name: 'fornecedores' }"
        data-teste="voltar"
      >
        {{ TEXTOS_FORNECEDORES.voltar }}
      </RouterLink>
    </template>

    <template v-else>
      <CabecalhoPagina :titulo="fornecedor?.nomeEmpresa ?? TEXTOS_FORNECEDORES.tituloDetalhe">
        <template #trilha>
          <RouterLink :to="{ name: 'fornecedores' }">
            {{ TEXTOS_FORNECEDORES.titulo }}
          </RouterLink>
          <span aria-hidden="true"> / </span>
          <span aria-current="page">{{ fornecedor?.nomeEmpresa }}</span>
        </template>
        <template
          v-if="fornecedor"
          #detalhes
        >
          <span
            class="fornecedor__detalhes"
            data-teste="resumo-fornecedor"
          >
            <span>{{ ROTULOS_CATEGORIA_FORNECEDOR[fornecedor.categoria] }}</span>
            <span v-if="fornecedor.responsavel">{{ fornecedor.responsavel }}</span>
            <BadgeStatus
              v-if="fornecedor.arquivado"
              :texto="TEXTOS_FORNECEDORES.badgeArquivado"
              variante="neutro"
              icone="arquivar"
            />
          </span>
        </template>
        <template
          v-if="fornecedor"
          #acoes
        >
          <Button
            v-if="!fornecedor.arquivado"
            :label="TEXTOS_FORNECEDORES.editar"
            icon="ie ie-editar"
            data-teste="editar-fornecedor"
            @click="editar"
          />
          <MenuAcoes
            :itens="acoes"
            :rotulo="TEXTOS_FORNECEDORES.maisAcoes"
            :rotulo-acessivel="TEXTOS_FORNECEDORES.maisAcoesAria(fornecedor.nomeEmpresa)"
            @selecionar="executarAcao"
          />
        </template>
      </CabecalhoPagina>

      <div class="fornecedor">
        <EstadoCarregando
          v-if="store.carregandoAtual && !fornecedor"
          variante="cartao"
          :linhas="3"
        />

        <EstadoErro
          v-else-if="falha?.tipo === 'semPermissao'"
          :titulo="TEXTOS_FORNECEDORES.erroDetalheTitulo"
          :mensagem="TEXTOS_FORNECEDORES.semAcesso"
          :pode-tentar-novamente="false"
          variante="semPermissao"
        />

        <EstadoErro
          v-else-if="falha"
          :titulo="TEXTOS_FORNECEDORES.erroDetalheTitulo"
          :mensagem="TEXTOS_FORNECEDORES.erroTexto"
          @tentar-novamente="store.carregarAtual(fornecedorId)"
        />

        <template v-else-if="fornecedor">
          <MensagemFormulario
            v-if="fornecedor.arquivado"
            variante="alerta"
            :mensagem="TEXTOS_FORNECEDORES.arquivadoFaixa"
            data-teste="faixa-arquivado"
          >
            <Button
              :label="TEXTOS_FORNECEDORES.restaurar"
              icon="ie ie-restaurar"
              severity="secondary"
              outlined
              size="small"
              data-teste="restaurar-fornecedor"
              @click="restaurar(fornecedor)"
            />
          </MensagemFormulario>

          <div class="fornecedor__blocos">
            <section
              class="fornecedor__bloco"
              aria-labelledby="fornecedor-contato"
            >
              <h2
                id="fornecedor-contato"
                class="fornecedor__titulo-bloco"
              >
                {{ TEXTOS_FORNECEDORES.contato }}
              </h2>
              <CanaisContato
                v-if="temContato"
                :nome="fornecedor.nomeEmpresa"
                :telefone="fornecedor.telefone"
                :email="fornecedor.email"
                :site="fornecedor.site"
                :instagram="fornecedor.instagram"
                variante="completa"
              />
              <p
                v-else
                class="fornecedor__apoio"
                data-teste="sem-contato"
              >
                {{ TEXTOS_FORNECEDORES.semContato }}
              </p>
            </section>

            <section
              class="fornecedor__bloco"
              aria-labelledby="fornecedor-observacoes"
            >
              <h2
                id="fornecedor-observacoes"
                class="fornecedor__titulo-bloco"
              >
                {{ TEXTOS_FORNECEDORES.observacoes }}
              </h2>
              <p class="fornecedor__apoio">
                {{ TEXTOS_FORNECEDORES.observacoesApoio }}
              </p>
              <p
                v-if="fornecedor.observacoes"
                class="fornecedor__observacoes"
                data-teste="observacoes"
              >
                {{ fornecedor.observacoes }}
              </p>
              <p
                v-else
                class="fornecedor__apoio"
              >
                {{ TEXTOS_FORNECEDORES.semObservacoes }}
              </p>
            </section>
          </div>

          <section
            class="fornecedor__bloco"
            aria-labelledby="fornecedor-historico"
            data-teste="historico-casamentos"
          >
            <h2
              id="fornecedor-historico"
              class="fornecedor__titulo-bloco"
            >
              {{ TEXTOS_FORNECEDORES.historicoTitulo }}
            </h2>
            <p
              v-if="store.carregandoParticipacoes && !participacoes"
              class="fornecedor__apoio"
            >
              {{ TEXTOS_HISTORICO_FORNECEDOR.carregando }}
            </p>
            <div
              v-else-if="falhaParticipacoes"
              class="fornecedor__historico-erro"
              data-teste="erro-historico"
            >
              <p class="fornecedor__apoio">
                {{ TEXTOS_HISTORICO_FORNECEDOR.erro }}
              </p>
              <Button
                :label="TEXTOS_HISTORICO_FORNECEDOR.tentarNovamente"
                severity="secondary"
                text
                size="small"
                @click="store.carregarParticipacoes(fornecedorId)"
              />
            </div>
            <ul
              v-else-if="participacoes && participacoes.length > 0"
              class="fornecedor__historico"
              :aria-label="TEXTOS_HISTORICO_FORNECEDOR.listaRotulo"
              data-teste="lista-historico"
            >
              <li
                v-for="participacao in participacoes"
                :key="participacao.casamentoId"
                class="fornecedor__participacao"
              >
                <RouterLink
                  :to="{ name: 'casamento-fornecedores', params: { id: participacao.casamentoId } }"
                  class="fornecedor__participacao-nomes"
                >
                  {{ formatarNomesCasal(participacao.nomePrimeiraPessoa, participacao.nomeSegundaPessoa) }}
                </RouterLink>
                <span class="fornecedor__apoio numeros-tabulares">{{ formatarDataCalendarioCurta(participacao.dataCasamento) }}</span>
                <span class="fornecedor__participacao-selos">
                  <BadgeStatus
                    :texto="ROTULOS_STATUS_FORNECEDOR_CASAMENTO[participacao.status]"
                    :variante="VARIANTES_STATUS_FORNECEDOR_CASAMENTO[participacao.status]"
                  />
                  <BadgeStatus
                    v-if="participacao.casamentoArquivado"
                    :texto="TEXTOS_HISTORICO_FORNECEDOR.casamentoArquivado"
                    variante="neutro"
                    icone="arquivar"
                  />
                </span>
              </li>
            </ul>
            <EstadoVazio
              v-else
              icone="casamento"
              :titulo="TEXTOS_FORNECEDORES.historicoVazioTitulo"
              :descricao="TEXTOS_FORNECEDORES.historicoVazioTexto"
            />
          </section>

          <p
            class="fornecedor__apoio numeros-tabulares"
            data-teste="datas-fornecedor"
          >
            {{ TEXTOS_FORNECEDORES.cadastro(formatarData(fornecedor.criadoEm), formatarData(fornecedor.atualizadoEm)) }}
          </p>
        </template>
      </div>

      <DialogoConfirmacao
        :visivel="exclusaoBloqueada"
        :titulo="fornecedor ? TEXTOS_FORNECEDORES.excluirTitulo(fornecedor.nomeEmpresa) : ''"
        :mensagem="TEXTOS_HISTORICO_FORNECEDOR.excluirBloqueado(participacoes?.length ?? 0)"
        :rotulo-confirmar="TEXTOS_FORNECEDORES.arquivar"
        :rotulo-cancelar="TEXTOS_FORNECEDORES.cancelar"
        @update:visivel="exclusaoBloqueada = $event"
        @confirmar="arquivarEmVezDeExcluir"
      />
    </template>
  </LayoutPainelUsuario>
</template>

<style scoped>
.fornecedor {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-4);
}

.fornecedor__detalhes {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-espaco-2) var(--p-espaco-4);
}

.fornecedor__blocos {
  display: grid;
  gap: var(--p-espaco-4);
}

.fornecedor__bloco {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-3);
  min-width: 0;
  padding: var(--p-espaco-5) var(--p-espaco-4);
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.fornecedor .fornecedor__titulo-bloco {
  margin: 0;
  font-size: var(--p-fonte-tamanho-titulo);
}

.fornecedor__apoio {
  margin: 0;
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.fornecedor__observacoes {
  margin: 0;
  font-size: var(--p-fonte-tamanho-corpo);
  line-height: var(--p-fonte-entrelinha-corpo);
  color: var(--p-cor-texto);
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.fornecedor__historico {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.fornecedor__participacao {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-espaco-1) var(--p-espaco-3);
  padding: var(--p-espaco-3) 0;
}

.fornecedor__participacao + .fornecedor__participacao {
  border-top: 1px solid var(--p-cor-divisoria);
}

.fornecedor__participacao-nomes {
  font-weight: var(--p-fonte-peso-seminegrito);
}

.fornecedor__participacao-selos {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-2);
  margin-inline-start: auto;
}

.fornecedor__historico-erro {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-espaco-2);
}

.fornecedor__voltar {
  display: inline-block;
  margin-top: var(--p-espaco-4);
}

@media (min-width: 640px) {
  .fornecedor__blocos {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .fornecedor__bloco {
    padding: var(--p-espaco-6);
  }
}
</style>
