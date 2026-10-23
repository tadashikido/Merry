<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'

import LayoutPainelUsuario from '@/layouts/LayoutPainelUsuario.vue'
import AbasSecao from '@/componentes/base/AbasSecao.vue'
import CabecalhoPagina from '@/componentes/base/CabecalhoPagina.vue'
import CartaoModelo from '@/componentes/base/CartaoModelo.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import EstadoVazio from '@/componentes/base/EstadoVazio.vue'
import CoberturaModelosPorTipo from '@/componentes/modelos/CoberturaModelosPorTipo.vue'
import GruposModelosPorTipo from '@/componentes/modelos/GruposModelosPorTipo.vue'
import type { ItemMenuAcoes } from '@/componentes/base/tipos'
import { useConfirmarExclusao } from '@/composables/useConfirmarExclusao'
import { useNotificacao } from '@/composables/useNotificacao'
import { useModelosChecklistStore } from '@/stores/modelosChecklist'
import { ABAS_MODELOS } from '@/layouts/abasModelos'
import { TEXTOS_MODELOS_CHECKLIST } from '@/textos/checklist'
import { TEXTOS_MODELOS_POR_TIPO } from '@/textos/modelos'
import { TEXTOS_ABAS_MODELOS } from '@/textos/modelosCronograma'
import { VOCABULARIO_TIPO_EVENTO, ehTipoEvento } from '@/textos/tiposEvento'
import type { ModeloChecklistResumoDto } from '@/tipos/checklist'

const store = useModelosChecklistStore()
const roteador = useRouter()
const notificacao = useNotificacao()
const { confirmarExclusao } = useConfirmarExclusao()

const acoes: ItemMenuAcoes[] = [
  { chave: 'editar', rotulo: TEXTOS_MODELOS_CHECKLIST.acaoEditar, icone: 'ie ie-editar' },
  { chave: 'excluir', rotulo: TEXTOS_MODELOS_CHECKLIST.acaoExcluir, icone: 'ie ie-excluir', perigoso: true },
]

const resumo = computed(() => (store.lista && store.lista.length > 0 ? TEXTOS_MODELOS_CHECKLIST.resumo(store.lista.length) : null))

onMounted(() => {
  document.title = TEXTOS_MODELOS_CHECKLIST.tituloDocumento
  void store.listar()
})

function rotuloSugerido(modelo: ModeloChecklistResumoDto): string {
  return ehTipoEvento(modelo.tipoEvento)
    ? TEXTOS_MODELOS_POR_TIPO.sugeridoPara(VOCABULARIO_TIPO_EVENTO[modelo.tipoEvento].contagem.singular)
    : TEXTOS_MODELOS_CHECKLIST.sugerido
}

function novoModelo() {
  void roteador.push({ name: 'modelo-checklist-novo' })
}

function executarAcao(modelo: ModeloChecklistResumoDto, chave: string) {
  if (chave === 'editar') {
    void roteador.push({ name: 'modelo-checklist-editar', params: { modeloId: modelo.id } })
    return
  }
  confirmarExclusao({
    nomeItem: modelo.nome,
    mensagem: TEXTOS_MODELOS_CHECKLIST.confirmarExclusaoTexto(modelo.quantidadeItens),
    mensagemSucesso: TEXTOS_MODELOS_CHECKLIST.toastExcluido,
    aoConfirmar: async () => {
      const resultado = await store.remover(modelo.id)
      if (!resultado.ok) {
        notificacao.erro(TEXTOS_MODELOS_CHECKLIST.erroExcluir)
        throw new Error(resultado.falha.tipo)
      }
    },
  })
}
</script>

<template>
  <LayoutPainelUsuario>
    <CabecalhoPagina
      :titulo="TEXTOS_MODELOS_CHECKLIST.titulo"
      :descricao="TEXTOS_MODELOS_CHECKLIST.subtitulo"
    >
      <template
        v-if="resumo"
        #detalhes
      >
        <p
          class="texto-legenda"
          aria-live="polite"
          data-teste="resumo-modelos"
        >
          {{ resumo }}
        </p>
      </template>
      <template
        v-if="!store.falhaLista"
        #acoes
      >
        <Button
          :label="TEXTOS_MODELOS_CHECKLIST.novo"
          icon="ie ie-mais"
          data-teste="novo-modelo"
          @click="novoModelo"
        />
      </template>
    </CabecalhoPagina>

    <div class="modelos pilha pilha--cartao">
      <AbasSecao
        :rotulo="TEXTOS_ABAS_MODELOS.rotulo"
        :abas="ABAS_MODELOS"
        ativa="checklist"
      />

      <EstadoCarregando
        v-if="store.carregandoLista && !store.lista"
        variante="lista"
        :linhas="3"
      />

      <EstadoErro
        v-else-if="store.falhaLista?.tipo === 'semPermissao'"
        :titulo="TEXTOS_MODELOS_CHECKLIST.erroTitulo"
        :mensagem="TEXTOS_MODELOS_CHECKLIST.semAcesso"
        :pode-tentar-novamente="false"
        variante="semPermissao"
      />

      <EstadoErro
        v-else-if="store.falhaLista"
        :titulo="TEXTOS_MODELOS_CHECKLIST.erroTitulo"
        :mensagem="TEXTOS_MODELOS_CHECKLIST.erroTexto"
        @tentar-novamente="store.listar()"
      />

      <EstadoVazio
        v-else-if="store.lista && store.lista.length === 0"
        icone="lista"
        :titulo="TEXTOS_MODELOS_CHECKLIST.vazioTitulo"
        :descricao="TEXTOS_MODELOS_CHECKLIST.vazioTexto"
      >
        <template #acao>
          <Button
            :label="TEXTOS_MODELOS_CHECKLIST.novo"
            icon="ie ie-mais"
            severity="secondary"
            outlined
            data-teste="novo-modelo-vazio"
            @click="novoModelo"
          />
        </template>
      </EstadoVazio>

      <div
        v-else-if="store.lista"
        class="modelos__corpo"
        data-teste="lista-modelos"
      >
        <GruposModelosPorTipo
          class="modelos__principal"
          :modelos="store.lista"
          :recurso="TEXTOS_MODELOS_CHECKLIST.recurso"
          teste-item="modelo-checklist"
        >
          <template #modelo="{ modelo }">
            <CartaoModelo
              :nome="modelo.nome"
              :descricao="modelo.descricao"
              :rota="{ name: 'modelo-checklist', params: { modeloId: modelo.id } }"
              :contagem="TEXTOS_MODELOS_CHECKLIST.itens(modelo.quantidadeItens)"
              :sugerido="modelo.sugerido"
              :rotulo-sugerido="rotuloSugerido(modelo)"
              :acoes="acoes"
              :rotulo-acoes="TEXTOS_MODELOS_CHECKLIST.maisAcoes"
              :rotulo-acessivel-acoes="TEXTOS_MODELOS_CHECKLIST.maisAcoesAria(modelo.nome)"
              :nivel-titulo="3"
              @selecionar="executarAcao(modelo, $event)"
            >
              <template
                v-if="!modelo.sugerido"
                #detalhes
              >
                <span
                  class="modelos__origem"
                  data-teste="origem-modelo"
                >{{ TEXTOS_MODELOS_POR_TIPO.origemAssessoria }}</span>
              </template>
            </CartaoModelo>
          </template>
        </GruposModelosPorTipo>

        <CoberturaModelosPorTipo
          class="modelos__lateral"
          :modelos="store.lista"
          :recurso="TEXTOS_MODELOS_CHECKLIST.recurso"
          :reaproveitamento="TEXTOS_MODELOS_CHECKLIST.reaproveitamento"
        />
      </div>
    </div>
  </LayoutPainelUsuario>
</template>

<style scoped>
.modelos {
  container: modelos / inline-size;
}

.modelos__corpo {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-bloco);
  align-items: start;
}

.modelos__principal,
.modelos__lateral {
  min-width: 0;
}

.modelos__origem {
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-controle);
  font-style: italic;
  color: var(--p-cor-texto-secundario);
}

@container modelos (min-width: 64rem) {
  .modelos__corpo {
    grid-template-columns: minmax(0, 1fr) 20rem;
  }
}
</style>
