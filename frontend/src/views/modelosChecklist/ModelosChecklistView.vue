<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Button from 'primevue/button'

import LayoutPainelUsuario from '@/layouts/LayoutPainelUsuario.vue'
import AbasSecao from '@/componentes/base/AbasSecao.vue'
import BadgeStatus from '@/componentes/base/BadgeStatus.vue'
import CabecalhoPagina from '@/componentes/base/CabecalhoPagina.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import EstadoVazio from '@/componentes/base/EstadoVazio.vue'
import MenuAcoes from '@/componentes/base/MenuAcoes.vue'
import type { ItemMenuAcoes } from '@/componentes/base/tipos'
import { useConfirmarExclusao } from '@/composables/useConfirmarExclusao'
import { useNotificacao } from '@/composables/useNotificacao'
import { useModelosChecklistStore } from '@/stores/modelosChecklist'
import { ABAS_MODELOS } from '@/layouts/abasModelos'
import { TEXTOS_MODELOS_CHECKLIST } from '@/textos/checklist'
import { TEXTOS_ABAS_MODELOS } from '@/textos/modelosCronograma'
import type { ModeloChecklistResumoDto } from '@/tipos/checklist'

const store = useModelosChecklistStore()
const roteador = useRouter()
const notificacao = useNotificacao()
const { confirmarExclusao } = useConfirmarExclusao()

const acoes: ItemMenuAcoes[] = [
  { chave: 'editar', rotulo: TEXTOS_MODELOS_CHECKLIST.acaoEditar, icone: 'ie ie-editar' },
  { chave: 'excluir', rotulo: TEXTOS_MODELOS_CHECKLIST.acaoExcluir, icone: 'ie ie-excluir', perigoso: true },
]

onMounted(() => {
  document.title = TEXTOS_MODELOS_CHECKLIST.tituloDocumento
  void store.listar()
})

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

    <div class="modelos">
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

      <ul
        v-else-if="store.lista"
        class="modelos__lista"
        :aria-label="TEXTOS_MODELOS_CHECKLIST.listaRotulo"
        data-teste="lista-modelos"
      >
        <li
          v-for="modelo in store.lista"
          :key="modelo.id"
          class="modelos__item"
          data-teste="modelo-checklist"
        >
          <div class="modelos__textos">
            <div class="modelos__linha">
              <RouterLink
                :to="{ name: 'modelo-checklist', params: { modeloId: modelo.id } }"
                class="modelos__nome"
                data-teste="link-modelo"
              >
                {{ modelo.nome }}
              </RouterLink>
              <BadgeStatus
                v-if="modelo.sugerido"
                :texto="TEXTOS_MODELOS_CHECKLIST.sugerido"
                variante="informacao"
                icone="informacao"
              />
            </div>
            <p
              v-if="modelo.descricao"
              class="modelos__descricao"
            >
              {{ modelo.descricao }}
            </p>
          </div>
          <span class="modelos__contagem numeros-tabulares">{{ TEXTOS_MODELOS_CHECKLIST.itens(modelo.quantidadeItens) }}</span>
          <MenuAcoes
            :itens="acoes"
            :rotulo="TEXTOS_MODELOS_CHECKLIST.maisAcoes"
            :rotulo-acessivel="TEXTOS_MODELOS_CHECKLIST.maisAcoesAria(modelo.nome)"
            somente-icone
            @selecionar="executarAcao(modelo, $event)"
          />
        </li>
      </ul>
    </div>
  </LayoutPainelUsuario>
</template>

<style scoped>
.modelos {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-5);
  max-width: var(--p-dimensao-largura-leitura);
}

.modelos__lista {
  margin: 0;
  padding: 0;
  list-style: none;
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.modelos__item {
  display: flex;
  align-items: center;
  gap: var(--p-espaco-3);
  padding: var(--p-espaco-4);
}

.modelos__item + .modelos__item {
  border-top: 1px solid var(--p-cor-divisoria);
}

.modelos__textos {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--p-espaco-1);
  min-width: 0;
}

.modelos__linha {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-espaco-2);
}

.modelos__nome {
  font-size: var(--p-fonte-tamanho-titulo);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto);
  text-decoration: none;
  overflow-wrap: anywhere;
}

.modelos__nome:hover {
  color: var(--p-cor-primaria);
  text-decoration: underline;
}

.modelos__descricao {
  margin: 0;
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
  overflow-wrap: anywhere;
}

.modelos__contagem {
  flex: none;
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}
</style>
