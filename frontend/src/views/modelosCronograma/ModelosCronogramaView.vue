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
import type { ItemMenuAcoes } from '@/componentes/base/tipos'
import { useConfirmarExclusao } from '@/composables/useConfirmarExclusao'
import { useNotificacao } from '@/composables/useNotificacao'
import { useModelosCronogramaStore } from '@/stores/modelosCronograma'
import { ABAS_MODELOS } from '@/layouts/abasModelos'
import { TEXTOS_ABAS_MODELOS, TEXTOS_MODELOS_CRONOGRAMA } from '@/textos/modelosCronograma'
import type { ModeloCronogramaResumoDto } from '@/tipos/modelosCronograma'

const store = useModelosCronogramaStore()
const roteador = useRouter()
const notificacao = useNotificacao()
const { confirmarExclusao } = useConfirmarExclusao()

const acoes: ItemMenuAcoes[] = [
  { chave: 'editar', rotulo: TEXTOS_MODELOS_CRONOGRAMA.acaoEditar, icone: 'ie ie-editar' },
  { chave: 'excluir', rotulo: TEXTOS_MODELOS_CRONOGRAMA.acaoExcluir, icone: 'ie ie-excluir', perigoso: true },
]

const resumo = computed(() => (store.lista && store.lista.length > 0 ? TEXTOS_MODELOS_CRONOGRAMA.resumo(store.lista.length) : null))

onMounted(() => {
  document.title = TEXTOS_MODELOS_CRONOGRAMA.tituloDocumento
  void store.listar()
})

function novoModelo() {
  void roteador.push({ name: 'modelo-cronograma-novo' })
}

function executarAcao(modelo: ModeloCronogramaResumoDto, chave: string) {
  if (chave === 'editar') {
    void roteador.push({ name: 'modelo-cronograma-editar', params: { modeloId: modelo.id } })
    return
  }
  confirmarExclusao({
    nomeItem: modelo.nome,
    mensagem: TEXTOS_MODELOS_CRONOGRAMA.confirmarExclusaoTexto(modelo.quantidadeItens),
    mensagemSucesso: TEXTOS_MODELOS_CRONOGRAMA.toastExcluido,
    aoConfirmar: async () => {
      const resultado = await store.remover(modelo.id)
      if (!resultado.ok) {
        notificacao.erro(TEXTOS_MODELOS_CRONOGRAMA.erroExcluir)
        throw new Error(resultado.falha.tipo)
      }
    },
  })
}
</script>

<template>
  <LayoutPainelUsuario>
    <CabecalhoPagina
      :titulo="TEXTOS_MODELOS_CRONOGRAMA.titulo"
      :descricao="TEXTOS_MODELOS_CRONOGRAMA.subtitulo"
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
          :label="TEXTOS_MODELOS_CRONOGRAMA.novo"
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
        ativa="cronograma"
      />

      <EstadoCarregando
        v-if="store.carregandoLista && !store.lista"
        variante="lista"
        :linhas="3"
      />

      <EstadoErro
        v-else-if="store.falhaLista?.tipo === 'semPermissao'"
        :titulo="TEXTOS_MODELOS_CRONOGRAMA.erroTitulo"
        :mensagem="TEXTOS_MODELOS_CRONOGRAMA.semAcesso"
        :pode-tentar-novamente="false"
        variante="semPermissao"
      />

      <EstadoErro
        v-else-if="store.falhaLista"
        :titulo="TEXTOS_MODELOS_CRONOGRAMA.erroTitulo"
        :mensagem="TEXTOS_MODELOS_CRONOGRAMA.erroTexto"
        @tentar-novamente="store.listar()"
      />

      <EstadoVazio
        v-else-if="store.lista && store.lista.length === 0"
        icone="cronograma"
        :titulo="TEXTOS_MODELOS_CRONOGRAMA.vazioTitulo"
        :descricao="TEXTOS_MODELOS_CRONOGRAMA.vazioTexto"
      >
        <template #acao>
          <Button
            :label="TEXTOS_MODELOS_CRONOGRAMA.novo"
            icon="ie ie-mais"
            severity="secondary"
            outlined
            data-teste="novo-modelo-vazio"
            @click="novoModelo"
          />
        </template>
      </EstadoVazio>

      <ul
        v-else-if="store.lista"
        class="grade grade--larga modelos__grade"
        :aria-label="TEXTOS_MODELOS_CRONOGRAMA.listaRotulo"
        data-teste="lista-modelos"
      >
        <li
          v-for="modelo in store.lista"
          :key="modelo.id"
          data-teste="modelo-cronograma"
        >
          <CartaoModelo
            :nome="modelo.nome"
            :descricao="modelo.descricao"
            :rota="{ name: 'modelo-cronograma', params: { modeloId: modelo.id } }"
            :contagem="TEXTOS_MODELOS_CRONOGRAMA.itens(modelo.quantidadeItens)"
            :sugerido="modelo.sugerido"
            :rotulo-sugerido="TEXTOS_MODELOS_CRONOGRAMA.sugerido"
            :acoes="acoes"
            :rotulo-acoes="TEXTOS_MODELOS_CRONOGRAMA.maisAcoes"
            :rotulo-acessivel-acoes="TEXTOS_MODELOS_CRONOGRAMA.maisAcoesAria(modelo.nome)"
            @selecionar="executarAcao(modelo, $event)"
          >
            <template #detalhes>
              <span
                class="texto-legenda numeros-tabulares"
                data-teste="referencia-modelo"
              >{{ TEXTOS_MODELOS_CRONOGRAMA.referencia(modelo.horarioReferencia) }}</span>
            </template>
          </CartaoModelo>
        </li>
      </ul>
    </div>
  </LayoutPainelUsuario>
</template>

<style scoped>
.modelos {
  container: modelos / inline-size;
}

.modelos__grade {
  margin: 0;
  padding: 0;
  list-style: none;
}

@container modelos (max-width: 39.99rem) {
  .modelos__grade {
    --grade-espaco: var(--p-ritmo-grupo);
  }
}
</style>
