using Celebri.Dominio.Convidados;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Isolamento;

namespace Celebri.Dominio.Checklists;

public class ModeloChecklist : IPertenceOrganizacao
{
    public const int TamanhoMinimoNome = 2;
    public const int TamanhoMaximoNome = 80;
    public const int TamanhoMaximoDescricao = 500;
    public const int LimitePorOrganizacao = 50;
    public const int LimiteItens = 200;

    private readonly List<ItemModeloChecklist> _itens = [];

    private ModeloChecklist()
    {
        Nome = string.Empty;
    }

    public Guid Id { get; private set; }

    public Guid OrganizacaoId { get; private set; }

    public string Nome { get; private set; }

    public string? Descricao { get; private set; }

    public bool Sugerido { get; private set; }

    public DateTimeOffset CriadoEm { get; private set; }

    public DateTimeOffset AtualizadoEm { get; private set; }

    public IReadOnlyList<ItemModeloChecklist> Itens => _itens;

    public static ModeloChecklist Criar(string? nome, string? descricao, DateTimeOffset agora, bool sugerido = false)
    {
        var modelo = new ModeloChecklist
        {
            Id = Guid.NewGuid(),
            Sugerido = sugerido,
            CriadoEm = agora,
        };

        modelo.Aplicar(nome, descricao, agora);
        return modelo;
    }

    public static string NormalizarNome(string? nome)
    {
        var normalizado = NormalizadorTexto.Normalizar(nome)
            ?? throw new RegraNegocioException(MensagensChecklist.NomeObrigatorio);

        if (normalizado.Length is < TamanhoMinimoNome or > TamanhoMaximoNome)
        {
            throw new RegraNegocioException(MensagensChecklist.TamanhoNome);
        }

        return normalizado;
    }

    public void Atualizar(string? nome, string? descricao, DateTimeOffset agora)
    {
        Aplicar(nome, descricao, agora);
    }

    public IReadOnlyList<ItemModeloChecklist> ItensOrdenados()
    {
        return _itens
            .OrderByDescending(item => item.DiasAntesDoCasamento)
            .ThenBy(item => item.Titulo, StringComparer.CurrentCultureIgnoreCase)
            .ThenBy(item => item.CriadoEm)
            .ToList();
    }

    public ItemModeloChecklist AdicionarItem(DadosItemModeloChecklist dados, DateTimeOffset agora)
    {
        if (_itens.Count >= LimiteItens)
        {
            throw new RegraNegocioException(MensagensChecklist.LimiteItens);
        }

        var item = ItemModeloChecklist.Criar(Id, dados, agora);
        _itens.Add(item);
        AtualizadoEm = agora;
        return item;
    }

    public ItemModeloChecklist? BuscarItem(Guid itemId)
    {
        return _itens.FirstOrDefault(item => item.Id == itemId);
    }

    public void AtualizarItem(ItemModeloChecklist item, DadosItemModeloChecklist dados, DateTimeOffset agora)
    {
        GarantirItemDoModelo(item);
        item.Atualizar(dados, agora);
        AtualizadoEm = agora;
    }

    public void RemoverItem(ItemModeloChecklist item, DateTimeOffset agora)
    {
        GarantirItemDoModelo(item);
        _itens.Remove(item);
        AtualizadoEm = agora;
    }

    private void GarantirItemDoModelo(ItemModeloChecklist item)
    {
        ArgumentNullException.ThrowIfNull(item);

        if (!_itens.Contains(item))
        {
            throw new InvalidOperationException("O item não pertence a este modelo.");
        }
    }

    private void Aplicar(string? nome, string? descricao, DateTimeOffset agora)
    {
        var nomeNormalizado = NormalizarNome(nome);
        var descricaoNormalizada = string.IsNullOrWhiteSpace(descricao) ? null : descricao.Trim();

        if (descricaoNormalizada is { Length: > TamanhoMaximoDescricao })
        {
            throw new RegraNegocioException(MensagensChecklist.TamanhoDescricaoModelo);
        }

        Nome = nomeNormalizado;
        Descricao = descricaoNormalizada;
        AtualizadoEm = agora;
    }
}
