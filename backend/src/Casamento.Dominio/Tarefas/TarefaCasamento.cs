using Casamento.Dominio.Convidados;
using Casamento.Dominio.Excecoes;
using Casamento.Dominio.Isolamento;

namespace Casamento.Dominio.Tarefas;

public class TarefaCasamento : IPertenceCasamento
{
    public const int TamanhoMinimoTitulo = 2;
    public const int TamanhoMaximoTitulo = 160;
    public const int TamanhoMaximoDescricao = 2000;
    public const int LimitePorCasamento = 500;
    public const int DiasJanelaSemana = 7;

    public static readonly DateOnly PrazoMinimo = new(2000, 1, 1);
    public static readonly DateOnly PrazoMaximo = new(2100, 12, 31);

    private TarefaCasamento()
    {
        Titulo = string.Empty;
    }

    public Guid Id { get; private set; }

    public Guid OrganizacaoId { get; private set; }

    public Guid CasamentoId { get; private set; }

    public string Titulo { get; private set; }

    public string? Descricao { get; private set; }

    public ResponsavelTarefa Responsavel { get; private set; }

    public CategoriaTarefa Categoria { get; private set; }

    public StatusTarefa Status { get; private set; }

    public DateOnly? Prazo { get; private set; }

    public DateTimeOffset? ConcluidaEm { get; private set; }

    public ResponsavelTarefa? ConcluidaPor { get; private set; }

    public Guid? ConcluidaPorUsuarioId { get; private set; }

    public Guid? OrigemModeloItemId { get; private set; }

    public Guid? CriadoPorUsuarioId { get; private set; }

    public DateTimeOffset CriadoEm { get; private set; }

    public DateTimeOffset AtualizadoEm { get; private set; }

    public bool EstaAberta => Status is StatusTarefa.AFazer or StatusTarefa.EmAndamento;

    public static TarefaCasamento Criar(
        Guid casamentoId,
        DadosTarefa dados,
        Guid? criadoPorUsuarioId,
        DateTimeOffset agora,
        Guid? origemModeloItemId = null)
    {
        if (casamentoId == Guid.Empty)
        {
            throw new ArgumentException("O casamento da tarefa é obrigatório.", nameof(casamentoId));
        }

        var tarefa = new TarefaCasamento
        {
            Id = Guid.NewGuid(),
            CasamentoId = casamentoId,
            Status = StatusTarefa.AFazer,
            CriadoPorUsuarioId = criadoPorUsuarioId,
            OrigemModeloItemId = origemModeloItemId,
            CriadoEm = agora,
        };

        tarefa.Aplicar(dados, agora);
        return tarefa;
    }

    public TarefaCasamento CopiarPara(
        Guid casamentoDestinoId,
        DateOnly? prazo,
        bool preservarOrigem,
        Guid? criadoPorUsuarioId,
        DateTimeOffset agora)
    {
        return Criar(
            casamentoDestinoId,
            new DadosTarefa(Titulo, Descricao, Responsavel, Categoria, prazo),
            criadoPorUsuarioId,
            agora,
            preservarOrigem ? OrigemModeloItemId : null);
    }

    public void Atualizar(DadosTarefa dados, DateTimeOffset agora)
    {
        Aplicar(dados, agora);
    }

    public void AlterarStatus(StatusTarefa novoStatus, ResponsavelTarefa autor, Guid? usuarioId, DateTimeOffset agora)
    {
        if (!Enum.IsDefined(novoStatus))
        {
            throw new RegraNegocioException(MensagensTarefas.StatusInvalido);
        }

        if (!Enum.IsDefined(autor))
        {
            throw new ArgumentOutOfRangeException(nameof(autor));
        }

        if (novoStatus == Status)
        {
            return;
        }

        if (novoStatus == StatusTarefa.Concluida)
        {
            ConcluidaEm = agora;
            ConcluidaPor = autor;
            ConcluidaPorUsuarioId = usuarioId;
        }
        else
        {
            ConcluidaEm = null;
            ConcluidaPor = null;
            ConcluidaPorUsuarioId = null;
        }

        Status = novoStatus;
        AtualizadoEm = agora;
    }

    public void RedefinirPrazo(DateOnly prazo, DateTimeOffset agora)
    {
        if (prazo < PrazoMinimo || prazo > PrazoMaximo)
        {
            throw new RegraNegocioException(MensagensTarefas.PrazoForaDaFaixa);
        }

        if (Prazo == prazo)
        {
            return;
        }

        Prazo = prazo;
        AtualizadoEm = agora;
    }

    public bool EstaAtrasada(DateOnly hoje)
    {
        return EstaAberta && Prazo is { } prazo && prazo < hoje;
    }

    public bool VenceNaSemana(DateOnly hoje)
    {
        return EstaAberta && Prazo is { } prazo && prazo >= hoje && prazo <= FimJanelaSemana(hoje);
    }

    public int? DiasParaPrazo(DateOnly hoje)
    {
        return Prazo is { } prazo ? prazo.DayNumber - hoje.DayNumber : null;
    }

    public static DateOnly FimJanelaSemana(DateOnly hoje)
    {
        return hoje.AddDays(DiasJanelaSemana - 1);
    }

    private void Aplicar(DadosTarefa dados, DateTimeOffset agora)
    {
        ArgumentNullException.ThrowIfNull(dados);

        var titulo = NormalizadorTexto.Normalizar(dados.Titulo)
            ?? throw new RegraNegocioException(MensagensTarefas.TituloObrigatorio);

        if (titulo.Length is < TamanhoMinimoTitulo or > TamanhoMaximoTitulo)
        {
            throw new RegraNegocioException(MensagensTarefas.TamanhoTitulo);
        }

        var descricao = string.IsNullOrWhiteSpace(dados.Descricao) ? null : dados.Descricao.Trim();

        if (descricao is { Length: > TamanhoMaximoDescricao })
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

        if (dados.Prazo is { } prazo && (prazo < PrazoMinimo || prazo > PrazoMaximo))
        {
            throw new RegraNegocioException(MensagensTarefas.PrazoForaDaFaixa);
        }

        Titulo = titulo;
        Descricao = descricao;
        Responsavel = dados.Responsavel;
        Categoria = dados.Categoria;
        Prazo = dados.Prazo;
        AtualizadoEm = agora;
    }
}
