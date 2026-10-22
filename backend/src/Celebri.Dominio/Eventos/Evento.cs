using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Isolamento;

namespace Celebri.Dominio.Eventos;

public class Evento : IRaizEvento
{
    public const int TamanhoMinimoNome = 2;
    public const int TamanhoMaximoNome = 80;
    public const int TamanhoMaximoLocal = 200;
    public const int TamanhoMaximoObservacoes = 2000;
    public const int ConvidadosMinimo = 1;
    public const int ConvidadosMaximo = 5000;
    public const int DiasAntecedenciaPadraoRsvp = 10;
    public const string CampoTipo = "tipo";
    public const string CampoNomeSegundaPessoa = "nomeSegundaPessoa";

    public static readonly DateOnly DataMinima = new(2000, 1, 1);
    public static readonly DateOnly DataMaxima = new(2100, 12, 31);

    private Evento()
    {
        NomePrimeiraPessoa = string.Empty;
    }

    public Guid Id { get; private set; }

    public Guid OrganizacaoId { get; private set; }

    public TipoEvento Tipo { get; private set; }

    public string NomePrimeiraPessoa { get; private set; }

    public string? NomeSegundaPessoa { get; private set; }

    public DateOnly Data { get; private set; }

    public TimeOnly? Horario { get; private set; }

    public string? LocalCerimonia { get; private set; }

    public string? LocalRecepcao { get; private set; }

    public int? ConvidadosEstimados { get; private set; }

    public string? Observacoes { get; private set; }

    public DateOnly? DataLimiteRsvp { get; private set; }

    public DateTimeOffset? ArquivadoEm { get; private set; }

    public DateTimeOffset CriadoEm { get; private set; }

    public DateTimeOffset AtualizadoEm { get; private set; }

    public bool Arquivado => ArquivadoEm is not null;

    public static Evento Criar(DadosEvento dados, DateTimeOffset agora)
    {
        var evento = new Evento
        {
            Id = Guid.NewGuid(),
            CriadoEm = agora,
        };

        evento.AplicarDados(dados, agora);
        return evento;
    }

    public void Atualizar(DadosEvento dados, DateTimeOffset agora)
    {
        if (Arquivado)
        {
            throw new RegraNegocioException(MensagensEvento.ArquivadoSemEdicao);
        }

        AplicarDados(dados, agora);
    }

    public void Arquivar(DateTimeOffset agora)
    {
        if (Arquivado)
        {
            return;
        }

        ArquivadoEm = agora;
        AtualizadoEm = agora;
    }

    public void Restaurar(DateTimeOffset agora)
    {
        if (!Arquivado)
        {
            return;
        }

        ArquivadoEm = null;
        AtualizadoEm = agora;
    }

    public int CalcularDiasRestantes(DateOnly hoje)
    {
        return Data.DayNumber - hoje.DayNumber;
    }

    public FaseEvento CalcularFase(DateOnly hoje)
    {
        return CalculadoraFaseEvento.Calcular(CalcularDiasRestantes(hoje));
    }

    public string FormatarNomes()
    {
        return NomeSegundaPessoa is null ? NomePrimeiraPessoa : $"{NomePrimeiraPessoa} & {NomeSegundaPessoa}";
    }

    public DateOnly DataLimiteRsvpEfetiva()
    {
        return DataLimiteRsvp ?? Data.AddDays(-DiasAntecedenciaPadraoRsvp);
    }

    public bool AceitaRespostaRsvp(DateOnly hoje)
    {
        return !Arquivado && hoje <= DataLimiteRsvpEfetiva();
    }

    private void AplicarDados(DadosEvento dados, DateTimeOffset agora)
    {
        ArgumentNullException.ThrowIfNull(dados);

        if (!RegrasTipoEvento.EhDisponivel(dados.Tipo))
        {
            throw new RegraNegocioException(MensagensEvento.TipoInvalido, CampoTipo);
        }

        var nomePrimeiraPessoa = NormalizarNome(dados.NomePrimeiraPessoa);
        var nomeSegundaPessoa = NormalizarSegundoNome(dados.Tipo, dados.NomeSegundaPessoa);

        if (dados.Data < DataMinima || dados.Data > DataMaxima)
        {
            throw new RegraNegocioException(MensagensEvento.DataForaDaFaixa);
        }

        if (dados.ConvidadosEstimados is < ConvidadosMinimo or > ConvidadosMaximo)
        {
            throw new RegraNegocioException(MensagensEvento.ConvidadosForaDaFaixa);
        }

        if (dados.DataLimiteRsvp is { } dataLimite && (dataLimite < DataMinima || dataLimite > dados.Data))
        {
            throw new RegraNegocioException(MensagensEvento.DataLimiteRsvpInvalida);
        }

        Tipo = dados.Tipo;
        NomePrimeiraPessoa = nomePrimeiraPessoa;
        NomeSegundaPessoa = nomeSegundaPessoa;
        Data = dados.Data;
        Horario = dados.Horario is { } horario ? new TimeOnly(horario.Hour, horario.Minute) : null;
        LocalCerimonia = NormalizarOpcional(dados.LocalCerimonia, TamanhoMaximoLocal, MensagensEvento.TamanhoLocal);
        LocalRecepcao = NormalizarOpcional(dados.LocalRecepcao, TamanhoMaximoLocal, MensagensEvento.TamanhoLocal);
        ConvidadosEstimados = dados.ConvidadosEstimados;
        Observacoes = NormalizarOpcional(dados.Observacoes, TamanhoMaximoObservacoes, MensagensEvento.TamanhoObservacoes);
        DataLimiteRsvp = dados.DataLimiteRsvp;
        AtualizadoEm = agora;
    }

    private static string NormalizarNome(string? nome)
    {
        var normalizado = (nome ?? string.Empty).Trim();

        if (normalizado.Length == 0)
        {
            throw new RegraNegocioException(MensagensEvento.NomeObrigatorio);
        }

        if (normalizado.Length is < TamanhoMinimoNome or > TamanhoMaximoNome)
        {
            throw new RegraNegocioException(MensagensEvento.TamanhoNome);
        }

        return normalizado;
    }

    private static string? NormalizarSegundoNome(TipoEvento tipo, string? nome)
    {
        var informado = !string.IsNullOrWhiteSpace(nome);

        if (RegrasTipoEvento.ExigeSegundoNome(tipo) && !informado)
        {
            throw new RegraNegocioException(MensagensEvento.SegundoNomeObrigatorio, CampoNomeSegundaPessoa);
        }

        if (!RegrasTipoEvento.AceitaSegundoNome(tipo) && informado)
        {
            throw new RegraNegocioException(MensagensEvento.UmHomenageado, CampoNomeSegundaPessoa);
        }

        return informado ? NormalizarNome(nome) : null;
    }

    private static string? NormalizarOpcional(string? valor, int tamanhoMaximo, string mensagem)
    {
        var normalizado = valor?.Trim();

        if (string.IsNullOrEmpty(normalizado))
        {
            return null;
        }

        if (normalizado.Length > tamanhoMaximo)
        {
            throw new RegraNegocioException(mensagem);
        }

        return normalizado;
    }
}
