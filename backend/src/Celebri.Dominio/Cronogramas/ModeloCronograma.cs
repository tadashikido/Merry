using Celebri.Dominio.Eventos;
using Celebri.Dominio.Convidados;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Fornecedores;
using Celebri.Dominio.Isolamento;

namespace Celebri.Dominio.Cronogramas;

public class ModeloCronograma : IPertenceOrganizacao
{
    public const int TamanhoMinimoNome = 2;
    public const int TamanhoMaximoNome = 80;
    public const int TamanhoMaximoDescricao = 500;
    public const int LimitePorOrganizacao = 50;
    public const int LimiteItens = 200;
    public const string CampoNome = "nome";
    public const string CampoHorarioReferencia = "horarioReferencia";
    public static readonly TimeOnly HorarioReferenciaPadrao = new(16, 0);

    private readonly List<ItemModeloCronograma> _itens = [];

    private ModeloCronograma()
    {
        Nome = string.Empty;
    }

    public Guid Id { get; private set; }

    public Guid OrganizacaoId { get; private set; }

    public string Nome { get; private set; }

    public string? Descricao { get; private set; }

    public TimeOnly HorarioReferencia { get; private set; }

    public bool Sugerido { get; private set; }

    public TipoEvento? TipoEvento { get; private set; }

    public DateTimeOffset CriadoEm { get; private set; }

    public DateTimeOffset AtualizadoEm { get; private set; }

    public IReadOnlyList<ItemModeloCronograma> Itens => _itens;

    public static ModeloCronograma Criar(
        string? nome,
        string? descricao,
        TimeOnly? horarioReferencia,
        DateTimeOffset agora,
        bool sugerido = false,
        TipoEvento? tipoEvento = null)
    {
        var modelo = new ModeloCronograma
        {
            Id = Guid.NewGuid(),
            Sugerido = sugerido,
            TipoEvento = tipoEvento,
            CriadoEm = agora,
        };

        modelo.Aplicar(nome, descricao, horarioReferencia ?? HorarioReferenciaPadrao, agora);
        return modelo;
    }

    public static ModeloCronograma CriarDeCronograma(
        string? nome,
        string? descricao,
        Evento evento,
        IReadOnlyList<ItemCronograma> itens,
        IReadOnlyDictionary<Guid, CategoriaFornecedor> categoriasPorVinculo,
        DateTimeOffset agora)
    {
        ArgumentNullException.ThrowIfNull(evento);
        ArgumentNullException.ThrowIfNull(itens);
        ArgumentNullException.ThrowIfNull(categoriasPorVinculo);

        var cerimonia = evento.Horario
            ?? throw new RegraNegocioException(MensagensModeloCronograma.HorarioCerimoniaObrigatorio, "horario");

        if (itens.Count == 0)
        {
            throw new RegraNegocioException(MensagensModeloCronograma.CronogramaVazio);
        }

        var modelo = Criar(nome, descricao, cerimonia, agora);

        foreach (var item in OrdenacaoCronograma.Ordenar(itens))
        {
            var (referencia, local) = MapearLocal(item.Local, evento);
            CategoriaFornecedor? categoria = item.FornecedorEventoId is { } vinculoId
                && categoriasPorVinculo.TryGetValue(vinculoId, out var encontrada)
                    ? encontrada
                    : null;

            modelo.AdicionarItem(
                new DadosItemModeloCronograma(
                    item.MinutoInicial - ItemCronograma.MinutoDoDia(cerimonia),
                    item.DuracaoMinutos,
                    item.Atividade,
                    referencia,
                    local,
                    item.Responsavel,
                    categoria,
                    item.Instrucoes),
                agora);
        }

        return modelo;
    }

    public static (ReferenciaLocalCronograma? Referencia, string? Local) MapearLocal(string? local, Evento evento)
    {
        ArgumentNullException.ThrowIfNull(evento);

        var chave = NormalizadorTexto.ChaveComparacao(local);

        if (chave is null)
        {
            return (null, null);
        }

        if (chave == NormalizadorTexto.ChaveComparacao(evento.LocalCerimonia))
        {
            return (ReferenciaLocalCronograma.Cerimonia, null);
        }

        if (chave == NormalizadorTexto.ChaveComparacao(evento.LocalRecepcao))
        {
            return (ReferenciaLocalCronograma.Recepcao, null);
        }

        return (null, local);
    }

    public static string NormalizarNome(string? nome)
    {
        var normalizado = NormalizadorTexto.Normalizar(nome)
            ?? throw new RegraNegocioException(MensagensModeloCronograma.NomeObrigatorio, CampoNome);

        if (normalizado.Length is < TamanhoMinimoNome or > TamanhoMaximoNome)
        {
            throw new RegraNegocioException(MensagensModeloCronograma.TamanhoNome, CampoNome);
        }

        return normalizado;
    }

    public void Atualizar(string? nome, string? descricao, TimeOnly? horarioReferencia, DateTimeOffset agora)
    {
        var referencia = horarioReferencia ?? HorarioReferencia;

        if (_itens.Any(item => item.ForaDaJanela(referencia)))
        {
            throw new RegraNegocioException(MensagensModeloCronograma.ReferenciaForaDaJanela, CampoHorarioReferencia);
        }

        Aplicar(nome, descricao, referencia, agora);
    }

    public IReadOnlyList<ItemModeloCronograma> ItensOrdenados()
    {
        return _itens
            .OrderBy(item => item.MinutosDesdeCerimonia)
            .ThenBy(item => item.DuracaoMinutos ?? 0)
            .ThenBy(item => item.Atividade, StringComparer.CurrentCultureIgnoreCase)
            .ThenBy(item => item.CriadoEm)
            .ThenBy(item => item.Id)
            .ToList();
    }

    public ItemModeloCronograma AdicionarItem(DadosItemModeloCronograma dados, DateTimeOffset agora)
    {
        ArgumentNullException.ThrowIfNull(dados);

        if (_itens.Count >= LimiteItens)
        {
            throw new RegraNegocioException(MensagensModeloCronograma.LimiteItens);
        }

        GarantirNaJanela(dados);

        var item = ItemModeloCronograma.Criar(Id, dados, agora);
        _itens.Add(item);
        AtualizadoEm = agora;
        return item;
    }

    public ItemModeloCronograma? BuscarItem(Guid itemId)
    {
        return _itens.FirstOrDefault(item => item.Id == itemId);
    }

    public void AtualizarItem(ItemModeloCronograma item, DadosItemModeloCronograma dados, DateTimeOffset agora)
    {
        GarantirItemDoModelo(item);
        ArgumentNullException.ThrowIfNull(dados);
        GarantirNaJanela(dados);
        item.Atualizar(dados, agora);
        AtualizadoEm = agora;
    }

    public void RemoverItem(ItemModeloCronograma item, DateTimeOffset agora)
    {
        GarantirItemDoModelo(item);
        _itens.Remove(item);
        AtualizadoEm = agora;
    }

    private void GarantirNaJanela(DadosItemModeloCronograma dados)
    {
        if (!ItemModeloCronograma.MinutosValidos(dados.MinutosDesdeCerimonia)
            || ItemCronograma.ForaDaJanela(HorarioReferencia, dados.MinutosDesdeCerimonia))
        {
            throw new RegraNegocioException(MensagensModeloCronograma.ForaDaJanela, ItemModeloCronograma.CampoMinutos);
        }
    }

    private void GarantirItemDoModelo(ItemModeloCronograma item)
    {
        ArgumentNullException.ThrowIfNull(item);

        if (!_itens.Contains(item))
        {
            throw new InvalidOperationException("O item não pertence a este modelo.");
        }
    }

    private void Aplicar(string? nome, string? descricao, TimeOnly horarioReferencia, DateTimeOffset agora)
    {
        var nomeNormalizado = NormalizarNome(nome);
        var descricaoNormalizada = string.IsNullOrWhiteSpace(descricao) ? null : descricao.Trim();

        if (descricaoNormalizada is { Length: > TamanhoMaximoDescricao })
        {
            throw new RegraNegocioException(MensagensModeloCronograma.TamanhoDescricao, "descricao");
        }

        Nome = nomeNormalizado;
        Descricao = descricaoNormalizada;
        HorarioReferencia = new TimeOnly(horarioReferencia.Hour, horarioReferencia.Minute);
        AtualizadoEm = agora;
    }
}
