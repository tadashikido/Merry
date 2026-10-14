<script setup lang="ts">
import { computed } from 'vue'

import type { NomeIcone } from '@/design/icones'
import { TEXTOS_CANAIS_CONTATO } from '@/textos/fornecedores'
import { formatarTelefone } from '@/utilitarios/telefone'
import {
  exibirInstagram,
  exibirSite,
  urlEmail,
  urlInstagram,
  urlSite,
  urlTelefone,
  urlWhatsapp,
} from '@/utilitarios/fornecedores'

const props = withDefaults(
  defineProps<{
    nome: string
    telefone?: string | null
    email?: string | null
    site?: string | null
    instagram?: string | null
    variante?: 'compacta' | 'completa'
  }>(),
  { telefone: null, email: null, site: null, instagram: null, variante: 'compacta' },
)

interface Canal {
  chave: string
  icone: NomeIcone
  url: string
  texto: string
  rotulo: string
  externo: boolean
}

const canais = computed<Canal[]>(() => {
  const lista: Canal[] = []
  const telefone = urlTelefone(props.telefone)
  if (telefone) {
    lista.push({
      chave: 'telefone',
      icone: 'telefone',
      url: telefone,
      texto: formatarTelefone(props.telefone),
      rotulo: TEXTOS_CANAIS_CONTATO.ligar(props.nome),
      externo: false,
    })
  }
  const whatsapp = urlWhatsapp(props.telefone)
  if (whatsapp) {
    lista.push({
      chave: 'whatsapp',
      icone: 'whatsapp',
      url: whatsapp,
      texto: TEXTOS_CANAIS_CONTATO.rotuloWhatsapp,
      rotulo: TEXTOS_CANAIS_CONTATO.whatsapp(props.nome),
      externo: true,
    })
  }
  const email = urlEmail(props.email)
  if (email && props.email) {
    lista.push({
      chave: 'email',
      icone: 'email',
      url: email,
      texto: props.email,
      rotulo: TEXTOS_CANAIS_CONTATO.email(props.nome),
      externo: false,
    })
  }
  const site = urlSite(props.site)
  if (site) {
    lista.push({
      chave: 'site',
      icone: 'link',
      url: site,
      texto: exibirSite(props.site),
      rotulo: TEXTOS_CANAIS_CONTATO.site(props.nome),
      externo: true,
    })
  }
  const instagram = urlInstagram(props.instagram)
  if (instagram) {
    lista.push({
      chave: 'instagram',
      icone: 'link',
      url: instagram,
      texto: exibirInstagram(props.instagram),
      rotulo: TEXTOS_CANAIS_CONTATO.instagram(props.nome),
      externo: true,
    })
  }
  return lista
})
</script>

<template>
  <ul
    v-if="canais.length > 0"
    class="canais-contato"
    :class="`canais-contato--${variante}`"
    :aria-label="TEXTOS_CANAIS_CONTATO.rotulo(nome)"
    data-teste="canais-contato"
  >
    <li
      v-for="canal in canais"
      :key="canal.chave"
    >
      <a
        class="canais-contato__link"
        :href="canal.url"
        :aria-label="variante === 'compacta' ? canal.rotulo : undefined"
        :title="variante === 'compacta' ? canal.texto : undefined"
        :target="canal.externo ? '_blank' : undefined"
        :rel="canal.externo ? 'noopener noreferrer' : undefined"
        :data-canal="canal.chave"
        data-teste="canal-contato"
      >
        <span
          :class="['ie', `ie-${canal.icone}`, 'canais-contato__icone']"
          aria-hidden="true"
        />
        <span
          v-if="variante === 'completa'"
          class="canais-contato__texto"
        >{{ canal.texto }}</span>
        <span
          v-if="variante === 'completa' && canal.externo"
          class="somente-leitor-tela"
        >{{ canal.rotulo }}</span>
      </a>
    </li>
  </ul>
</template>

<style scoped>
.canais-contato {
  display: flex;
  margin: 0;
  padding: 0;
  list-style: none;
}

.canais-contato--compacta {
  flex-wrap: wrap;
  gap: var(--p-espaco-1);
}

.canais-contato--completa {
  flex-direction: column;
  gap: var(--p-espaco-1);
}

.canais-contato__link {
  display: inline-flex;
  align-items: center;
  gap: var(--p-espaco-2);
  min-width: var(--p-dimensao-alvo-toque);
  min-height: var(--p-dimensao-alvo-toque);
  color: var(--p-cor-texto-secundario);
  text-decoration: none;
  border-radius: var(--p-raio-controle);
}

.canais-contato--compacta .canais-contato__link {
  justify-content: center;
}

.canais-contato--completa .canais-contato__link {
  padding: 0 var(--p-espaco-2);
  margin-left: calc(-1 * var(--p-espaco-2));
}

.canais-contato__link:hover {
  color: var(--p-cor-primaria);
  background: var(--p-cor-superficie-sutil);
}

.canais-contato__icone {
  font-size: var(--p-fonte-tamanho-titulo);
}

.canais-contato__texto {
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.canais-contato__link:hover .canais-contato__texto {
  color: var(--p-cor-primaria);
  text-decoration: underline;
}

@media (pointer: coarse) {
  .canais-contato__link {
    min-width: var(--p-dimensao-alvo-toque-movel);
    min-height: var(--p-dimensao-alvo-toque-movel);
  }
}
</style>
