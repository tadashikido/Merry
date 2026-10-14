using Casamento.Dominio.Convidados;
using Casamento.Dominio.Excecoes;
using Casamento.Dominio.Financeiro;
using Casamento.Dominio.Isolamento;

namespace Casamento.Dominio.Fornecedores;

public class FornecedorCasamento : IPertenceCasamento
{
    public const int TamanhoMaximoServico = 120;
    public const int TamanhoMaximoNotas = 2000;
    public const int TamanhoMaximoNomeContrato = 150;
    public const int LimitePorCasamento = 200;
    public const int CasasDecimais = 2;
    public const decimal ValorMaximo = 99_999_999.99m;
    public const string CampoFornecedorId = "fornecedorId";
    public const string CampoServico = "servico";
    public const string CampoValorOrcado = "valorOrcado";
    public const string CampoValorContratado = "valorContratado";
    public const string CampoStatus = "status";
    public const string CampoNotasInternas = "notasInternas";

    private FornecedorCasamento()
    {
    }

    public Guid Id { get; private set; }

    public Guid OrganizacaoId { get; private set; }

    public Guid CasamentoId { get; private set; }

    public Guid FornecedorId { get; private set; }

    public string? Servico { get; private set; }

    public decimal? ValorOrcado { get; private set; }

    public decimal? ValorContratado { get; private set; }

    public StatusFornecedorCasamento Status { get; private set; }

    public string? NotasInternas { get; private set; }

    public Guid? ContratoArquivoId { get; private set; }

    public string? ContratoNomeArquivo { get; private set; }

    public long? ContratoTamanhoBytes { get; private set; }

    public DateTimeOffset? ContratoEnviadoEm { get; private set; }

    public Guid? CriadoPorUsuarioId { get; private set; }

    public DateTimeOffset CriadoEm { get; private set; }

    public DateTimeOffset AtualizadoEm { get; private set; }

    public bool PossuiContrato => ContratoArquivoId is not null;

    public bool Cancelado => Status == StatusFornecedorCasamento.Cancelado;

    public static FornecedorCasamento Criar(
        Guid casamentoId,
        Guid fornecedorId,
        DadosFornecedorCasamento dados,
        Guid? criadoPorUsuarioId,
        DateTimeOffset agora)
    {
        if (casamentoId == Guid.Empty)
        {
            throw new ArgumentException("O casamento do vínculo é obrigatório.", nameof(casamentoId));
        }

        if (fornecedorId == Guid.Empty)
        {
            throw new RegraNegocioException(MensagensFornecedoresCasamento.FornecedorObrigatorio, CampoFornecedorId);
        }

        var vinculo = new FornecedorCasamento
        {
            Id = Guid.NewGuid(),
            CasamentoId = casamentoId,
            FornecedorId = fornecedorId,
            CriadoPorUsuarioId = criadoPorUsuarioId,
            CriadoEm = agora,
        };

        vinculo.Aplicar(dados, agora);
        return vinculo;
    }

    public FornecedorCasamento CopiarPara(Guid casamentoDestinoId, Guid? criadoPorUsuarioId, DateTimeOffset agora)
    {
        return Criar(
            casamentoDestinoId,
            FornecedorId,
            new DadosFornecedorCasamento(Servico, ValorOrcado, null, StatusFornecedorCasamento.Cotacao, null),
            criadoPorUsuarioId,
            agora);
    }

    public bool ElegivelParaCopia(bool fornecedorArquivado)
    {
        return !Cancelado && !fornecedorArquivado;
    }

    public void Atualizar(DadosFornecedorCasamento dados, DateTimeOffset agora)
    {
        Aplicar(dados, agora);
    }

    public void GarantirCompativelComParcelas(DadosFornecedorCasamento dados, int quantidadeParcelas, decimal somaParcelas)
    {
        ArgumentNullException.ThrowIfNull(dados);

        if (quantidadeParcelas <= 0)
        {
            return;
        }

        if (dados.Status is StatusFornecedorCasamento.Cotacao or StatusFornecedorCasamento.EmNegociacao)
        {
            throw new RegraNegocioException(MensagensFinanceiro.StatusComParcelas, CampoStatus);
        }

        if (dados.Status == StatusFornecedorCasamento.Contratado && dados.ValorContratado is { } contratado && contratado < somaParcelas)
        {
            throw new RegraNegocioException(
                MensagensFinanceiro.ContratadoAbaixoDasParcelas(FormatacaoMoeda.Formatar(somaParcelas)),
                CampoValorContratado);
        }
    }

    public void RegistrarAlteracaoParcelas(DateTimeOffset agora)
    {
        AtualizadoEm = agora;
    }

    public Guid? AnexarContrato(Guid arquivoId, string nomeArquivo, long tamanhoBytes, DateTimeOffset agora)
    {
        if (arquivoId == Guid.Empty)
        {
            throw new ArgumentException("O arquivo do contrato é obrigatório.", nameof(arquivoId));
        }

        if (string.IsNullOrWhiteSpace(nomeArquivo) || nomeArquivo.Length > TamanhoMaximoNomeContrato)
        {
            throw new ArgumentException("O nome do contrato é inválido.", nameof(nomeArquivo));
        }

        if (tamanhoBytes <= 0)
        {
            throw new RegraNegocioException(MensagensFornecedoresCasamento.ContratoVazio);
        }

        var anterior = ContratoArquivoId;
        ContratoArquivoId = arquivoId;
        ContratoNomeArquivo = nomeArquivo;
        ContratoTamanhoBytes = tamanhoBytes;
        ContratoEnviadoEm = agora;
        AtualizadoEm = agora;
        return anterior;
    }

    public Guid? RemoverContrato(DateTimeOffset agora)
    {
        var anterior = ContratoArquivoId;

        if (anterior is null)
        {
            return null;
        }

        ContratoArquivoId = null;
        ContratoNomeArquivo = null;
        ContratoTamanhoBytes = null;
        ContratoEnviadoEm = null;
        AtualizadoEm = agora;
        return anterior;
    }

    public static bool ValorValido(decimal? valor)
    {
        return valor is null
            || (valor >= 0 && valor <= ValorMaximo && decimal.Round(valor.Value, CasasDecimais) == valor.Value);
    }

    private void Aplicar(DadosFornecedorCasamento dados, DateTimeOffset agora)
    {
        ArgumentNullException.ThrowIfNull(dados);

        if (!Enum.IsDefined(dados.Status))
        {
            throw new RegraNegocioException(MensagensFornecedoresCasamento.StatusInvalido, CampoStatus);
        }

        var servico = NormalizadorTexto.Normalizar(dados.Servico);

        if (servico is { Length: > TamanhoMaximoServico })
        {
            throw new RegraNegocioException(MensagensFornecedoresCasamento.TamanhoServico, CampoServico);
        }

        if (!ValorValido(dados.ValorOrcado))
        {
            throw new RegraNegocioException(MensagensFornecedoresCasamento.ValorInvalido, CampoValorOrcado);
        }

        if (!ValorValido(dados.ValorContratado))
        {
            throw new RegraNegocioException(MensagensFornecedoresCasamento.ValorInvalido, CampoValorContratado);
        }

        if (dados.Status == StatusFornecedorCasamento.Contratado && dados.ValorContratado is null)
        {
            throw new RegraNegocioException(MensagensFornecedoresCasamento.ContratadoSemValor, CampoValorContratado);
        }

        var notas = string.IsNullOrWhiteSpace(dados.NotasInternas) ? null : dados.NotasInternas.Trim();

        if (notas is { Length: > TamanhoMaximoNotas })
        {
            throw new RegraNegocioException(MensagensFornecedoresCasamento.TamanhoNotas, CampoNotasInternas);
        }

        Servico = servico;
        ValorOrcado = dados.ValorOrcado;
        ValorContratado = dados.ValorContratado;
        Status = dados.Status;
        NotasInternas = notas;
        AtualizadoEm = agora;
    }
}
