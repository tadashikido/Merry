using Casamento.Dominio.Tarefas;

namespace Casamento.Aplicacao.Checklists;

public sealed record TarefaComPrazoRelativo(TarefaCasamento Tarefa, int DiasAntesDoCasamento);
