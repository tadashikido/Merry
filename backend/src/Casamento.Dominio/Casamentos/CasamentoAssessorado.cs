using Casamento.Dominio.Excecoes;
using Casamento.Dominio.Isolamento;

namespace Casamento.Dominio.Casamentos;

public class CasamentoAssessorado : IRaizCasamento
{
    public const int TamanhoMinimoNome = 2;
    public const int TamanhoMaximoNome = 80;
    public const int TamanhoMaximoLocal = 200;
    public const int TamanhoMaximoObservacoes = 2000;
    public const int ConvidadosMinimo = 1;
    public const int ConvidadosMaximo = 5000;
    public const int DiasAntecedenciaPadraoRsvp = 10;

    public static readonly DateOnly DataMinima = new(2000, 1, 1);
    public static readonly DateOnly DataMaxima = new(2100, 12, 31);

    private CasamentoAssessorado()
    {
        NomePrimeiraPessoa = string.Empty;
        NomeSegundaPessoa = string.Empty;
    }

    public Guid Id { get; private set; }

    public Guid OrganizacaoId { get; private set; }

    public string NomePrimeiraPessoa { get; private set; }

    public string NomeSegundaPessoa { get; private set; }

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

    public static CasamentoAssessorado Criar(DadosCasamento dados, DateTimeOffset agora)
    {
        var casamento = new CasamentoAssessorado
        {
            Id = Guid.NewGuid(),
            CriadoEm = agora,
        };

        casamento.AplicarDados(dados, agora);
        return casamento;
    }

    public void Atualizar(DadosCasamento dados, DateTimeOffset agora)
    {
        if (Arquivado)
        {
            throw new RegraNegocioException(MensagensCasamento.ArquivadoSemEdicao);
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

    public FaseCasamento CalcularFase(DateOnly hoje)
    {
        return CalculadoraFaseCasamento.Calcular(CalcularDiasRestantes(hoje));
    }

    public DateOnly DataLimiteRsvpEfetiva()
    {
        return DataLimiteRsvp ?? Data.AddDays(-DiasAntecedenciaPadraoRsvp);
    }

    public bool AceitaRespostaRsvp(DateOnly hoje)
    {
        return !Arquivado && hoje <= DataLimiteRsvpEfetiva();
    }

    private void AplicarDados(DadosCasamento dados, DateTimeOffset agora)
    {
        ArgumentNullException.ThrowIfNull(dados);

        var nomePrimeiraPessoa = NormalizarNome(dados.NomePrimeiraPessoa);
        var nomeSegundaPessoa = NormalizarNome(dados.NomeSegundaPessoa);

        if (dados.Data < DataMinima || dados.Data > DataMaxima)
        {
            throw new RegraNegocioException(MensagensCasamento.DataForaDaFaixa);
        }

        if (dados.ConvidadosEstimados is < ConvidadosMinimo or > ConvidadosMaximo)
        {
            throw new RegraNegocioException(MensagensCasamento.ConvidadosForaDaFaixa);
        }

        if (dados.DataLimiteRsvp is { } dataLimite && (dataLimite < DataMinima || dataLimite > dados.Data))
        {
            throw new RegraNegocioException(MensagensCasamento.DataLimiteRsvpInvalida);
        }

        NomePrimeiraPessoa = nomePrimeiraPessoa;
        NomeSegundaPessoa = nomeSegundaPessoa;
        Data = dados.Data;
        Horario = dados.Horario is { } horario ? new TimeOnly(horario.Hour, horario.Minute) : null;
        LocalCerimonia = NormalizarOpcional(dados.LocalCerimonia, TamanhoMaximoLocal, MensagensCasamento.TamanhoLocal);
        LocalRecepcao = NormalizarOpcional(dados.LocalRecepcao, TamanhoMaximoLocal, MensagensCasamento.TamanhoLocal);
        ConvidadosEstimados = dados.ConvidadosEstimados;
        Observacoes = NormalizarOpcional(dados.Observacoes, TamanhoMaximoObservacoes, MensagensCasamento.TamanhoObservacoes);
        DataLimiteRsvp = dados.DataLimiteRsvp;
        AtualizadoEm = agora;
    }

    private static string NormalizarNome(string? nome)
    {
        var normalizado = (nome ?? string.Empty).Trim();

        if (normalizado.Length == 0)
        {
            throw new RegraNegocioException(MensagensCasamento.NomeObrigatorio);
        }

        if (normalizado.Length is < TamanhoMinimoNome or > TamanhoMaximoNome)
        {
            throw new RegraNegocioException(MensagensCasamento.TamanhoNome);
        }

        return normalizado;
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
