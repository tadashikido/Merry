using Celebri.Dominio.Checklists;
using Celebri.Dominio.Convidados;
using Celebri.Dominio.Cronogramas;
using Celebri.Dominio.Fornecedores;
using Celebri.Dominio.Tarefas;

namespace Celebri.Dominio.Eventos;

public sealed class PlanoDuplicacaoEvento
{
    private readonly DateOnly _dataOrigem;
    private readonly DateOnly? _novaData;

    private PlanoDuplicacaoEvento(
        DateOnly dataOrigem,
        DateOnly? novaData,
        IReadOnlyList<TarefaParaDuplicar> tarefas,
        int tarefasCanceladasIgnoradas,
        IReadOnlyList<VinculoParaDuplicar> vinculos,
        int fornecedoresIgnorados,
        int nascemAtrasadas,
        IReadOnlyList<ItemCronograma> itensCronograma)
    {
        _dataOrigem = dataOrigem;
        _novaData = novaData;
        Tarefas = tarefas;
        TarefasCanceladasIgnoradas = tarefasCanceladasIgnoradas;
        Vinculos = vinculos;
        FornecedoresIgnorados = fornecedoresIgnorados;
        NascemAtrasadas = nascemAtrasadas;
        ItensCronograma = itensCronograma;
    }

    public IReadOnlyList<TarefaParaDuplicar> Tarefas { get; }

    public IReadOnlyList<VinculoParaDuplicar> Vinculos { get; }

    public int TarefasCanceladasIgnoradas { get; }

    public int FornecedoresIgnorados { get; }

    public IReadOnlyList<ItemCronograma> ItensCronograma { get; }

    public int NascemAtrasadas { get; }

    public int TarefasDoChecklist => Tarefas.Count(PreservaOrigem);

    public static PlanoDuplicacaoEvento Montar(
        DateOnly dataOrigem,
        DateOnly? novaData,
        DateOnly hoje,
        IEnumerable<TarefaParaDuplicar> tarefasDaOrigem,
        IEnumerable<VinculoParaDuplicar> vinculosDaOrigem,
        IEnumerable<ItemCronograma>? itensCronogramaDaOrigem = null)
    {
        ArgumentNullException.ThrowIfNull(tarefasDaOrigem);
        ArgumentNullException.ThrowIfNull(vinculosDaOrigem);

        var todasTarefas = tarefasDaOrigem.ToList();
        var tarefas = todasTarefas
            .Where(item => item.Tarefa.Status != StatusTarefa.Cancelada)
            .OrderBy(item => item.Tarefa.CriadoEm)
            .ThenBy(item => item.Tarefa.Id)
            .Take(TarefaEvento.LimitePorEvento)
            .ToList();

        var todosVinculos = vinculosDaOrigem.ToList();
        var vinculos = todosVinculos
            .Where(item => item.Vinculo.ElegivelParaCopia(item.FornecedorArquivado))
            .OrderBy(item => item.Vinculo.CriadoEm)
            .ThenBy(item => item.Vinculo.Id)
            .Take(FornecedorEvento.LimitePorEvento)
            .ToList();

        var nascemAtrasadas = novaData is { } data
            ? tarefas.Count(item => CalcularPrazo(item, dataOrigem, data) is { } prazo && prazo < hoje)
            : 0;

        return new PlanoDuplicacaoEvento(
            dataOrigem,
            novaData,
            tarefas,
            todasTarefas.Count(item => item.Tarefa.Status == StatusTarefa.Cancelada),
            vinculos,
            todosVinculos.Count - vinculos.Count,
            nascemAtrasadas,
            OrdenacaoCronograma.Ordenar(itensCronogramaDaOrigem ?? []).Take(ItemCronograma.LimitePorEvento).ToList());
    }

    public static int CalcularDeslocamentoCronograma(TimeOnly? cerimoniaOrigem, TimeOnly? cerimoniaDestino)
    {
        if (cerimoniaOrigem is not { } origem || cerimoniaDestino is not { } destino)
        {
            return 0;
        }

        return ((destino.Hour * 60) + destino.Minute) - ((origem.Hour * 60) + origem.Minute);
    }

    public static DateOnly? CalcularPrazo(TarefaParaDuplicar item, DateOnly dataOrigem, DateOnly novaData)
    {
        ArgumentNullException.ThrowIfNull(item);

        if (PreservaOrigem(item))
        {
            return ItemModeloChecklist.CalcularPrazo(novaData, item.DiasAntesDoEvento!.Value);
        }

        if (item.Tarefa.Prazo is not { } prazo)
        {
            return null;
        }

        var deslocado = prazo.DayNumber + (novaData.DayNumber - dataOrigem.DayNumber);
        return DateOnly.FromDayNumber(Math.Clamp(
            deslocado,
            TarefaEvento.PrazoMinimo.DayNumber,
            TarefaEvento.PrazoMaximo.DayNumber));
    }

    public IReadOnlyList<TarefaEvento> GerarTarefas(Guid eventoDestinoId, Guid? criadoPorUsuarioId, DateTimeOffset agora)
    {
        var novaData = _novaData ?? throw new InvalidOperationException("A nova data é obrigatória para gerar as tarefas.");

        return Tarefas
            .Select(item => item.Tarefa.CopiarPara(
                eventoDestinoId,
                CalcularPrazo(item, _dataOrigem, novaData),
                PreservaOrigem(item),
                criadoPorUsuarioId,
                agora))
            .ToList();
    }

    public IReadOnlyList<FornecedorEvento> GerarVinculos(Guid eventoDestinoId, Guid? criadoPorUsuarioId, DateTimeOffset agora)
    {
        return Vinculos
            .Select(item => item.Vinculo.CopiarPara(eventoDestinoId, criadoPorUsuarioId, agora))
            .ToList();
    }

    public IReadOnlyList<ItemCronograma> GerarItensCronograma(
        Evento origem,
        Evento destino,
        IReadOnlyList<FornecedorEvento> vinculosGerados,
        Guid? criadoPorUsuarioId,
        DateTimeOffset agora)
    {
        ArgumentNullException.ThrowIfNull(origem);
        ArgumentNullException.ThrowIfNull(destino);
        ArgumentNullException.ThrowIfNull(vinculosGerados);

        var mapaVinculos = new Dictionary<Guid, Guid>();

        for (var indice = 0; indice < Math.Min(Vinculos.Count, vinculosGerados.Count); indice++)
        {
            mapaVinculos[Vinculos[indice].Vinculo.Id] = vinculosGerados[indice].Id;
        }

        var deslocamento = CalcularDeslocamentoCronograma(origem.Horario, destino.Horario);

        return ItensCronograma
            .Select(item => item.CopiarPara(
                destino.Id,
                deslocamento,
                MapearLocal(item.Local, origem, destino),
                item.FornecedorEventoId is { } vinculoId && mapaVinculos.TryGetValue(vinculoId, out var novoVinculo)
                    ? novoVinculo
                    : null,
                criadoPorUsuarioId,
                agora))
            .ToList();
    }

    public static string? MapearLocal(string? local, Evento origem, Evento destino)
    {
        ArgumentNullException.ThrowIfNull(origem);
        ArgumentNullException.ThrowIfNull(destino);

        var chave = NormalizadorTexto.ChaveComparacao(local);

        if (chave is null)
        {
            return null;
        }

        if (chave == NormalizadorTexto.ChaveComparacao(origem.LocalCerimonia))
        {
            return destino.LocalCerimonia;
        }

        if (chave == NormalizadorTexto.ChaveComparacao(origem.LocalRecepcao))
        {
            return destino.LocalRecepcao;
        }

        return local;
    }

    private static bool PreservaOrigem(TarefaParaDuplicar item)
    {
        return item.Tarefa.OrigemModeloItemId is not null && item.DiasAntesDoEvento is not null;
    }
}
