namespace Celebri.Aplicacao.Eventos;

public sealed record DuplicacaoEventoDto(
    EventoDto Evento,
    int TarefasCopiadas,
    int FornecedoresCopiados,
    int ItensCronogramaCopiados = 0);
