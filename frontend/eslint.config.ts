import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import pluginVitest from '@vitest/eslint-plugin'

const MENSAGEM_HTTP_EM_STORES = 'Chamadas HTTP só podem ser feitas dentro de stores Pinia (src/stores).'

export default defineConfigWithVueTs(
  {
    name: 'app/arquivos-verificados',
    files: ['**/*.{vue,ts,mts,tsx}'],
  },

  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**']),

  ...pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,

  {
    name: 'app/regras-gerais',
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'vue/block-lang': ['error', { script: { lang: 'ts' } }],
      'vue/component-api-style': ['error', ['script-setup']],
      'no-warning-comments': 'error',
    },
  },

  {
    name: 'app/http-somente-em-stores',
    files: ['src/**/*.{ts,vue}'],
    ignores: ['src/stores/**', 'src/servicos/**', 'src/**/__tests__/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/servicos/*', '**/servicos/*'],
              message: MENSAGEM_HTTP_EM_STORES,
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: MENSAGEM_HTTP_EM_STORES },
        { name: 'XMLHttpRequest', message: MENSAGEM_HTTP_EM_STORES },
      ],
    },
  },

  {
    ...pluginVitest.configs.recommended,
    files: ['src/**/__tests__/*'],
    rules: {
      ...pluginVitest.configs.recommended.rules,
      'vitest/expect-expect': ['error', { assertFunctionNames: ['expect', 'aguardarRota', 'aguardarAte'] }],
    },
  },
)
