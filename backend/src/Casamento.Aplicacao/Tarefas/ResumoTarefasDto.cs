namespace Casamento.Aplicacao.Tarefas;

public sealed record ResumoTarefasDto(int Abertas, int Atrasadas, int EstaSemana, int Concluidas, int Canceladas, int Total);
