using Celebri.Dominio.Tarefas;

namespace Celebri.Dominio.Eventos;

public sealed record TarefaParaDuplicar(TarefaEvento Tarefa, int? DiasAntesDoEvento);
