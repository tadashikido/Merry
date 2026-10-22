using Celebri.Dominio.Tarefas;

namespace Celebri.Aplicacao.Checklists;

public sealed record TarefaComPrazoRelativo(TarefaEvento Tarefa, int DiasAntesDoEvento);
