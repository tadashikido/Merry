import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const RAIZ = resolve(__dirname, '../..')
const LAYOUT = readFileSync(resolve(__dirname, '../layout.css'), 'utf-8')

const TELAS_FORMULARIO = [
  'views/eventos/EventoFormularioView.vue',
  'views/eventos/DuplicarEventoView.vue',
  'views/tarefas/TarefaFormularioView.vue',
  'views/convidados/ConviteFormularioView.vue',
  'views/fornecedores/FornecedorFormularioView.vue',
  'views/fornecedoresEvento/FornecedorEventoFormularioView.vue',
  'views/modelosChecklist/ModeloChecklistFormularioView.vue',
  'views/modelosCronograma/ModeloCronogramaFormularioView.vue',
  'views/modelosChecklist/ItemModeloChecklistFormularioView.vue',
  'views/modelosCronograma/ItemModeloCronogramaFormularioView.vue',
]

const TELAS_TABELA = ['views/restricoes/RestricoesAlimentaresView.vue']

const TELAS_RESUMO = [
  'views/checklist/ChecklistView.vue',
  'views/cronograma/CronogramaView.vue',
  'views/tarefas/TarefasView.vue',
  'views/eventos/EventoView.vue',
  'views/financeiro/FinanceiroEventoView.vue',
  'views/fornecedoresEvento/FornecedoresEventoView.vue',
  'views/confirmacoes/PainelConfirmacoesView.vue',
  'views/modelosChecklist/ModelosChecklistView.vue',
  'views/modelosCronograma/ModelosCronogramaView.vue',
  'views/modelosChecklist/ModeloChecklistView.vue',
  'views/modelosCronograma/ModeloCronogramaView.vue',
  'views/fornecedores/FornecedoresView.vue',
  'views/fornecedores/FornecedorView.vue',
]

function listarEstilos(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome)
    if (statSync(caminho).isDirectory()) {
      return nome === '__tests__' ? [] : listarEstilos(caminho)
    }
    return /\.(vue|css)$/.test(nome) ? [caminho] : []
  })
}

function ler(caminho: string): string {
  return readFileSync(resolve(RAIZ, caminho), 'utf-8')
}

function estiloDe(fonte: string): string {
  const inicio = fonte.indexOf('<style')
  return inicio < 0 ? fonte : fonte.slice(inicio)
}

const ESTILOS = listarEstilos(RAIZ).map((caminho) => ({
  arquivo: relative(RAIZ, caminho).split('\\').join('/'),
  fonte: readFileSync(caminho, 'utf-8'),
}))

describe('lateral de resumo por contêiner', () => {
  it('[UNITÁRIO] layout.css declara o contêiner com-lateral, o limiar único e as larguras por token', () => {
    expect(LAYOUT).toMatch(/\.com-lateral \{\s*container: com-lateral \/ inline-size;/)
    expect(LAYOUT).toContain(
      '--com-lateral-largura: clamp(var(--p-dimensao-largura-lateral), 30%, var(--p-dimensao-largura-lateral-maxima));',
    )
    expect(LAYOUT).toMatch(/\.com-lateral__lateral \{\s*display: grid;\s*grid-template-columns: repeat\(auto-fit, minmax\(min\(var\(--p-dimensao-largura-lateral\), 100%\), 1fr\)\);/)
    expect(LAYOUT).toMatch(
      /@container com-lateral \(min-width: 52rem\) \{\s*\.com-lateral__pagina--ativa \{\s*max-width: calc\(var\(--p-dimensao-largura-formulario\) \+ var\(--p-dimensao-largura-lateral-maxima\) \+ var\(--p-ritmo-bloco\)\);/,
    )
    expect(LAYOUT).toMatch(/\.recolhivel__resumo \{[^}]*min-height: var\(--p-dimensao-alvo-toque\);/)
  })

  it('[UNITÁRIO] toda consulta com-lateral usa 52rem, e 64rem só nas telas cujo principal é tabela larga', () => {
    const consultas = ESTILOS.flatMap(({ arquivo, fonte }) =>
      [...fonte.matchAll(/@container com-lateral \(([^)]*)\)/g)].map((achado) => ({ arquivo, condicao: achado[1] })),
    )
    expect(consultas.length).toBeGreaterThan(14)
    const foraDoPadrao = consultas.filter(({ arquivo, condicao }) => {
      const esperado = TELAS_TABELA.includes(arquivo) ? 'min-width: 64rem' : 'min-width: 52rem'
      return condicao !== esperado
    })
    expect(foraDoPadrao).toEqual([])
  })

  it('[UNITÁRIO] nenhuma tela leva a lateral ao lado pelo limiar antigo de 64rem da própria tela', () => {
    const antigas = ESTILOS.flatMap(({ arquivo, fonte }) =>
      [...fonte.matchAll(/@container ([a-z-]+) \(min-width: 64rem\)/g)]
        .filter((achado) => !['aplicacao', 'listagem', 'com-lateral'].includes(achado[1] ?? ''))
        .map((achado) => `${arquivo}: ${achado[1]}`),
    )
    expect(antigas).toEqual([])
  })

  it.each(TELAS_FORMULARIO)('[UNITÁRIO] %s usa as primitivas de formulário com lateral, sem grade nem sticky próprios', (caminho) => {
    const fonte = ler(caminho)
    const estilo = estiloDe(fonte)
    expect(fonte).toMatch(/<div class="[a-z-]+ com-lateral">/)
    expect(fonte).toMatch(/class="pagina-formulario [a-z-]+__pagina com-lateral__pagina/)
    expect(fonte).toMatch(/class="[a-z-]+__corpo com-lateral__corpo"/)
    expect(fonte).toMatch(/com-lateral__principal/)
    expect(fonte).toMatch(/com-lateral__lateral(?: com-lateral__lateral--filete)?"/)
    expect(estilo).not.toMatch(/grid-template-areas:\s*'principal lateral'/)
    expect(estilo).not.toContain('sticky')
    expect(estilo).not.toContain('--p-dimensao-largura-gaveta')
  })

  it.each(TELAS_TABELA)('[UNITÁRIO] %s com tabela larga leva a lateral ao lado só a 64rem do contêiner com-lateral', (caminho) => {
    const estilo = estiloDe(ler(caminho))
    expect(estilo).toMatch(/container: [a-z-]+ com-lateral \/ inline-size;/)
    expect(estilo).toContain('@container com-lateral (min-width: 64rem)')
    expect(estilo).toContain('var(--com-lateral-largura)')
    expect(estilo).not.toContain('position: sticky')
  })

  it.each(TELAS_RESUMO)('[UNITÁRIO] %s abre a lateral pelo contêiner com-lateral, com largura fluida e sem sticky', (caminho) => {
    const fonte = ler(caminho)
    const estilo = estiloDe(fonte)
    expect(fonte).toMatch(/<div class="[a-z-]+ com-lateral pilha/)
    expect(estilo).toMatch(/container: [a-z-]+ com-lateral \/ inline-size;/)
    expect(estilo).toContain('@container com-lateral (min-width: 52rem)')
    expect(estilo).toContain('var(--com-lateral-largura)')
    expect(estilo).not.toContain('position: sticky')
  })

  it('[UNITÁRIO] laterais altas recolhem o secundário e não repetem a prévia do campo', () => {
    for (const caminho of ['views/modelosChecklist/ModeloChecklistFormularioView.vue', 'views/modelosCronograma/ModeloCronogramaFormularioView.vue']) {
      const fonte = ler(caminho)
      expect(fonte).toMatch(/<OrientacaoFormularioModelo[^>]*recolhivel/)
      expect(fonte).toMatch(/<ComoAplicarModelo[^>]*recolhivel/)
    }
    expect(ler('views/modelosChecklist/ItemModeloChecklistFormularioView.vue')).toMatch(/<PosicaoItemModelo[^>]*previa-no-campo[\s\S]*<ExemplosItemModelo[^>]*recolhivel/)
    expect(ler('views/modelosCronograma/ItemModeloCronogramaFormularioView.vue')).toMatch(/<PosicaoItemModeloCronograma[^>]*previa-no-campo[\s\S]*<ExemplosItemModelo[^>]*recolhivel/)
    expect(ler('views/fornecedores/FornecedoresView.vue')).toMatch(/<CoberturaCategoriasFornecedores[^>]*:limite="3"/)
    expect(estiloDe(ler('views/modelosChecklist/ModeloChecklistView.vue'))).toMatch(
      /@container com-lateral \(min-width: 52rem\) \{[\s\S]*\.modelo__bloco--por-marco \{\s*display: none;/,
    )
    expect(LAYOUT).toMatch(/@container com-lateral \(min-width: 52rem\) \{[\s\S]*\.com-lateral__so-leitor-ao-lado \{[^}]*clip: rect\(0, 0, 0, 0\);/)
  })
})
