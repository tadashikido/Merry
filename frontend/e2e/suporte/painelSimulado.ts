import type { Page, Route } from '@playwright/test'

export const EVENTO_ID = '11111111-1111-4111-8111-111111111111'
export const FORNECEDOR_ID = '22222222-2222-4222-8222-222222222222'

const DATA_EVENTO = '2026-12-20'

const sessao = {
  tokenAcesso: 'token-simulado',
  expiraEm: '2099-01-01T00:00:00Z',
  usuario: {
    id: '33333333-3333-4333-8333-333333333333',
    nome: 'Equipe Celebri',
    email: 'equipe@celebri.test',
    papel: 'Dono',
    organizacao: { id: '44444444-4444-4444-8444-444444444444', nome: 'Celebri' },
  },
}

const evento = {
  id: EVENTO_ID,
  tipo: 'Casamento',
  nomePrimeiraPessoa: 'Ana',
  nomeSegundaPessoa: 'Bruno',
  data: DATA_EVENTO,
  horario: '16:00',
  localCerimonia: 'Igreja Matriz do Centro Histórico',
  convidadosEstimados: 120,
  fase: 'Planejamento',
  diasRestantes: 120,
  arquivado: false,
  localRecepcao: 'Salão Jardim das Acácias',
  observacoes: null,
  arquivadoEm: null,
  criadoEm: '2025-01-01T00:00:00Z',
  atualizadoEm: '2025-01-01T00:00:00Z',
  dataLimiteRsvp: null,
  dataLimiteRsvpEfetiva: '2026-12-10',
  versao: 1,
  percentualChecklist: 40,
}

function tarefa(id: string, prazo: string, status: string, atrasada: boolean) {
  return {
    id,
    titulo: `Tarefa ${id}`,
    descricao: null,
    responsavel: 'Assessoria',
    categoria: 'Geral',
    status,
    prazo,
    atrasada,
    venceNaSemana: false,
    diasParaPrazo: 10,
    concluidaEm: status === 'Concluida' ? '2026-01-01T00:00:00Z' : null,
    concluidaPor: status === 'Concluida' ? 'Assessoria' : null,
    geradaDeModelo: true,
    criadoEm: '2025-01-01T00:00:00Z',
    atualizadoEm: '2025-01-01T00:00:00Z',
  }
}

const checklist = {
  progresso: { percentual: 40, concluidas: 4, consideradas: 10, canceladas: 0, total: 10 },
  dataEvento: DATA_EVENTO,
  eventoArquivado: false,
  prazosDesatualizados: 0,
  tarefas: [
    tarefa('a1', '2025-01-10', 'Concluida', false),
    tarefa('a2', '2025-01-20', 'AFazer', false),
    tarefa('b1', '2026-05-20', 'AFazer', true),
    tarefa('b2', '2026-05-25', 'Concluida', false),
    tarefa('c1', '2026-09-20', 'AFazer', true),
    tarefa('c2', '2026-09-22', 'AFazer', false),
    tarefa('d1', '2026-11-10', 'AFazer', false),
    tarefa('d2', '2026-11-12', 'Concluida', false),
  ],
}

function itemCronograma(indice: number) {
  const inicioHora = String(8 + (indice % 12)).padStart(2, '0')
  return {
    id: `item-${indice}`,
    dia: 'DiaDoEvento',
    data: DATA_EVENTO,
    inicio: `${inicioHora}:00`,
    duracaoMinutos: 30,
    termino: `${inicioHora}:30`,
    terminaEmOutroDia: false,
    atividade: `Atividade número ${indice} do roteiro do dia`,
    local: 'Salão principal',
    responsavel: 'Equipe de cerimonial',
    fornecedor: null,
    instrucoes: null,
    notasInternas: null,
    status: 'Previsto',
    concluidoEm: null,
    minutosDesdeCerimonia: indice * 30,
    conflitos: [],
    criadoEm: '2025-01-01T00:00:00Z',
    atualizadoEm: '2025-01-01T00:00:00Z',
  }
}

const cronograma = {
  eventoId: EVENTO_ID,
  dataEvento: DATA_EVENTO,
  horarioCerimonia: '16:00',
  localCerimonia: 'Igreja Matriz do Centro Histórico',
  localRecepcao: 'Salão Jardim das Acácias',
  arquivado: false,
  somenteLeitura: false,
  itens: Array.from({ length: 16 }, (_, indice) => itemCronograma(indice + 1)),
  itensComConflito: 0,
  fornecedoresDisponiveis: [],
  horariosDesatualizados: 0,
}

const fornecedor = {
  id: FORNECEDOR_ID,
  categoria: 'Fotografia',
  nomeEmpresa: 'Estúdio Fotográfico Momentos Eternos',
  responsavel: 'Marina Albuquerque',
  telefone: '11999998888',
  email: 'comercial.atendimento.eventos@estudiofotograficomomentoseternos.com.br',
  site: 'https://www.estudiofotograficomomentoseternos.com.br',
  instagram: '@estudiofotograficomomentoseternos',
  arquivado: false,
  atualizadoEm: '2025-01-01T00:00:00Z',
  observacoes: 'Fecha pacotes com álbum impresso e entrega digital em até 60 dias.',
  arquivadoEm: null,
  criadoEm: '2025-01-01T00:00:00Z',
}

function json(rota: Route, corpo: unknown, status = 200): Promise<void> {
  return rota.fulfill({ status, contentType: 'application/json', body: JSON.stringify(corpo) })
}

export async function simularPainel(page: Page): Promise<void> {
  await page.route('**/api/**', (rota) => {
    const url = new URL(rota.request().url())
    const caminho = url.pathname

    if (caminho.endsWith('/autenticacao/renovar') || caminho.endsWith('/autenticacao/entrar')) {
      return json(rota, sessao)
    }
    if (caminho.endsWith('/autenticacao/eu')) {
      return json(rota, sessao.usuario)
    }
    if (caminho.endsWith('/checklist')) {
      return json(rota, checklist)
    }
    if (caminho.endsWith('/cronograma')) {
      return json(rota, cronograma)
    }
    if (caminho.endsWith('/modelos-checklist')) {
      return json(rota, [])
    }
    if (caminho.includes('/fornecedores/') && caminho.endsWith('/eventos')) {
      return json(rota, [])
    }
    if (caminho.endsWith(`/fornecedores/${FORNECEDOR_ID}`)) {
      return json(rota, fornecedor)
    }
    if (caminho.endsWith('/eventos')) {
      return json(rota, [])
    }
    if (caminho.endsWith(`/eventos/${EVENTO_ID}`)) {
      return json(rota, evento)
    }
    return json(rota, { titulo: 'Não encontrado', status: 404 }, 404)
  })
}

export const ROTA_CHECKLIST = `/eventos/${EVENTO_ID}/checklist`
export const ROTA_CRONOGRAMA = `/eventos/${EVENTO_ID}/cronograma`
export const ROTA_FORNECEDOR = `/fornecedores/${FORNECEDOR_ID}`
