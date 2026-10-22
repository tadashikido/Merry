using Celebri.Dominio.Convidados;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Isolamento;
using Celebri.Dominio.Tarefas;

namespace Celebri.Dominio.Checklists;

public class ItemModeloChecklist : IPertenceOrganizacao
{
    public const int DiasAntesMaximo = 1095;
    public const int DiasDepoisMaximo = 365;

    private ItemModeloChecklist()
    {
        Titulo = string.Empty;
    }

    public Guid Id { get; private set; }

    public Guid OrganizacaoId { get; private set; }

    public Guid ModeloId { get; private set; }

    public string Titulo { get; private set; }

    public string? Descricao { get; private set; }

    public ResponsavelTarefa Responsavel { get; private set; }

    public CategoriaTarefa Categoria { get; private set; }

    public int DiasAntesDoCasamento { get; private set; }

    public DateTimeOffset CriadoEm { get; private set; }

    public DateTimeOffset AtualizadoEm { get; private set; }

    public static bool DiasValidos(int dias)
    {
        return dias is >= -DiasDepoisMaximo and <= DiasAntesMaximo;
    }

    public static DateOnly CalcularPrazo(DateOnly dataCasamento, int diasAntesDoCasamento)
    {
        var dia = dataCasamento.DayNumber - diasAntesDoCasamento;
        return DateOnly.FromDayNumber(Math.Clamp(dia, TarefaCasamento.PrazoMinimo.DayNumber, TarefaCasamento.PrazoMaximo.DayNumber));
    }

    public DateOnly CalcularPrazo(DateOnly dataCasamento)
    {
        return CalcularPrazo(dataCasamento, DiasAntesDoCasamento);
    }

    public DadosTarefa ParaDadosTarefa(DateOnly dataCasamento)
    {
        return new DadosTarefa(Titulo, Descricao, Responsavel, Categoria, CalcularPrazo(dataCasamento));
    }

    internal static ItemModeloChecklist Criar(Guid modeloId, DadosItemModeloChecklist dados, DateTimeOffset agora)
    {
        var item = new ItemModeloChecklist
        {
            Id = Guid.NewGuid(),
            ModeloId = modeloId,
            CriadoEm = agora,
        };

        item.Aplicar(dados, agora);
        return item;
    }

    internal void Atualizar(DadosItemModeloChecklist dados, DateTimeOffset agora)
    {
        Aplicar(dados, agora);
    }

    private void Aplicar(DadosItemModeloChecklist dados, DateTimeOffset agora)
    {
        ArgumentNullException.ThrowIfNull(dados);

        var titulo = NormalizadorTexto.Normalizar(dados.Titulo)
            ?? throw new RegraNegocioException(MensagensTarefas.TituloObrigatorio);

        if (titulo.Length is < TarefaCasamento.TamanhoMinimoTitulo or > TarefaCasamento.TamanhoMaximoTitulo)
        {
            throw new RegraNegocioException(MensagensTarefas.TamanhoTitulo);
        }

        var descricao = string.IsNullOrWhiteSpace(dados.Descricao) ? null : dados.Descricao.Trim();

        if (descricao is { Length: > TarefaCasamento.TamanhoMaximoDescricao })
        {
            throw new RegraNegocioException(MensagensTarefas.TamanhoDescricao);
        }

        if (!Enum.IsDefined(dados.Responsavel))
        {
            throw new RegraNegocioException(MensagensTarefas.ResponsavelInvalido);
        }

        if (!Enum.IsDefined(dados.Categoria))
        {
            throw new RegraNegocioException(MensagensTarefas.CategoriaInvalida);
        }

        if (!DiasValidos(dados.DiasAntesDoCasamento))
        {
            throw new RegraNegocioException(MensagensChecklist.DiasForaDaFaixa);
        }

        Titulo = titulo;
        Descricao = descricao;
        Responsavel = dados.Responsavel;
        Categoria = dados.Categoria;
        DiasAntesDoCasamento = dados.DiasAntesDoCasamento;
        AtualizadoEm = agora;
    }
}
