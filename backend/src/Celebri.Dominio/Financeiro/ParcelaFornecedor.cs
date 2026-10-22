using Celebri.Dominio.Convidados;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Fornecedores;
using Celebri.Dominio.Isolamento;

namespace Celebri.Dominio.Financeiro;

public class ParcelaFornecedor : IPertenceEvento
{
    public const int LimitePorVinculo = 60;
    public const int JanelaAlertaDias = 7;
    public const int TamanhoMaximoObservacao = 120;
    public const int TamanhoMaximoNomeComprovante = 150;
    public const int TamanhoMaximoTipoComprovante = 40;
    public const int CasasDecimais = 2;
    public const decimal ValorMinimo = 0.01m;
    public const decimal ValorMaximo = 99_999_999.99m;
    public const string CampoValor = "valor";
    public const string CampoVencimento = "vencimento";
    public const string CampoObservacao = "observacao";
    public const string CampoPagaEm = "pagaEm";
    public const string CampoQuantidade = "quantidade";
    public const string CampoValorTotal = "valorTotal";
    public const string CampoPrimeiroVencimento = "primeiroVencimento";

    public static readonly DateOnly DataMinima = new(2000, 1, 1);
    public static readonly DateOnly DataMaxima = new(2100, 12, 31);

    private ParcelaFornecedor()
    {
    }

    public Guid Id { get; private set; }

    public Guid OrganizacaoId { get; private set; }

    public Guid EventoId { get; private set; }

    public Guid FornecedorEventoId { get; private set; }

    public decimal Valor { get; private set; }

    public DateOnly Vencimento { get; private set; }

    public string? Observacao { get; private set; }

    public StatusParcela Status { get; private set; }

    public DateOnly? PagaEm { get; private set; }

    public Guid? ComprovanteArquivoId { get; private set; }

    public string? ComprovanteNomeArquivo { get; private set; }

    public string? ComprovanteTipoConteudo { get; private set; }

    public long? ComprovanteTamanhoBytes { get; private set; }

    public DateTimeOffset? ComprovanteEnviadoEm { get; private set; }

    public Guid? CriadoPorUsuarioId { get; private set; }

    public DateTimeOffset CriadoEm { get; private set; }

    public DateTimeOffset AtualizadoEm { get; private set; }

    public bool Paga => Status == StatusParcela.Paga;

    public bool PossuiComprovante => ComprovanteArquivoId is not null;

    public static ParcelaFornecedor Criar(
        FornecedorEvento vinculo,
        DadosParcela dados,
        Guid? criadoPorUsuarioId,
        DateTimeOffset agora)
    {
        ArgumentNullException.ThrowIfNull(vinculo);
        GarantirVinculoAceitaParcelas(vinculo);

        var parcela = new ParcelaFornecedor
        {
            Id = Guid.NewGuid(),
            EventoId = vinculo.EventoId,
            FornecedorEventoId = vinculo.Id,
            Status = StatusParcela.Pendente,
            CriadoPorUsuarioId = criadoPorUsuarioId,
            CriadoEm = agora,
        };

        parcela.Aplicar(dados, agora);
        return parcela;
    }

    public static void GarantirVinculoAceitaParcelas(FornecedorEvento vinculo)
    {
        ArgumentNullException.ThrowIfNull(vinculo);

        if (vinculo.Cancelado)
        {
            throw new RegraNegocioException(MensagensFinanceiro.VinculoCancelado);
        }

        if (vinculo.Status != StatusFornecedorEvento.Contratado || vinculo.ValorContratado is null)
        {
            throw new RegraNegocioException(MensagensFinanceiro.VinculoNaoContratado);
        }
    }

    public static bool ValorValido(decimal valor)
    {
        return valor >= ValorMinimo && valor <= ValorMaximo && decimal.Round(valor, CasasDecimais) == valor;
    }

    public static bool VencimentoValido(DateOnly data)
    {
        return data >= DataMinima && data <= DataMaxima;
    }

    public void Atualizar(DadosParcela dados, DateTimeOffset agora)
    {
        GarantirPendente();
        Aplicar(dados, agora);
    }

    public void GarantirPendente()
    {
        if (Paga)
        {
            throw new RegraNegocioException(MensagensFinanceiro.ParcelaPagaSemEdicao);
        }
    }

    public void RegistrarPagamento(DateOnly pagaEm, DateOnly hoje, DateTimeOffset agora)
    {
        if (pagaEm > hoje)
        {
            throw new RegraNegocioException(MensagensFinanceiro.PagamentoFuturo, CampoPagaEm);
        }

        if (pagaEm < DataMinima)
        {
            throw new RegraNegocioException(MensagensFinanceiro.PagamentoInvalido, CampoPagaEm);
        }

        Status = StatusParcela.Paga;
        PagaEm = pagaEm;
        AtualizadoEm = agora;
    }

    public Guid? DesfazerPagamento(DateTimeOffset agora)
    {
        if (!Paga)
        {
            throw new RegraNegocioException(MensagensFinanceiro.ParcelaNaoPaga);
        }

        var comprovante = LimparComprovante();
        Status = StatusParcela.Pendente;
        PagaEm = null;
        AtualizadoEm = agora;
        return comprovante;
    }

    public Guid? AnexarComprovante(Guid arquivoId, string nomeArquivo, string tipoConteudo, long tamanhoBytes, DateTimeOffset agora)
    {
        if (!Paga)
        {
            throw new RegraNegocioException(MensagensFinanceiro.ComprovanteSemPagamento);
        }

        if (arquivoId == Guid.Empty)
        {
            throw new ArgumentException("O arquivo do comprovante é obrigatório.", nameof(arquivoId));
        }

        if (string.IsNullOrWhiteSpace(nomeArquivo) || nomeArquivo.Length > TamanhoMaximoNomeComprovante)
        {
            throw new ArgumentException("O nome do comprovante é inválido.", nameof(nomeArquivo));
        }

        if (string.IsNullOrWhiteSpace(tipoConteudo) || tipoConteudo.Length > TamanhoMaximoTipoComprovante)
        {
            throw new ArgumentException("O tipo do comprovante é inválido.", nameof(tipoConteudo));
        }

        if (tamanhoBytes <= 0)
        {
            throw new RegraNegocioException(MensagensFinanceiro.ComprovanteVazio);
        }

        var anterior = ComprovanteArquivoId;
        ComprovanteArquivoId = arquivoId;
        ComprovanteNomeArquivo = nomeArquivo;
        ComprovanteTipoConteudo = tipoConteudo;
        ComprovanteTamanhoBytes = tamanhoBytes;
        ComprovanteEnviadoEm = agora;
        AtualizadoEm = agora;
        return anterior;
    }

    public Guid? RemoverComprovante(DateTimeOffset agora)
    {
        var anterior = LimparComprovante();

        if (anterior is not null)
        {
            AtualizadoEm = agora;
        }

        return anterior;
    }

    public SituacaoParcela Situacao(DateOnly hoje)
    {
        if (Paga)
        {
            return SituacaoParcela.Paga;
        }

        return Vencimento < hoje ? SituacaoParcela.Vencida : SituacaoParcela.Pendente;
    }

    public int DiasParaVencimento(DateOnly hoje)
    {
        return Vencimento.DayNumber - hoje.DayNumber;
    }

    public bool VenceEmBreve(DateOnly hoje)
    {
        var dias = DiasParaVencimento(hoje);
        return !Paga && dias >= 0 && dias <= JanelaAlertaDias;
    }

    private Guid? LimparComprovante()
    {
        var anterior = ComprovanteArquivoId;
        ComprovanteArquivoId = null;
        ComprovanteNomeArquivo = null;
        ComprovanteTipoConteudo = null;
        ComprovanteTamanhoBytes = null;
        ComprovanteEnviadoEm = null;
        return anterior;
    }

    private void Aplicar(DadosParcela dados, DateTimeOffset agora)
    {
        ArgumentNullException.ThrowIfNull(dados);

        if (!ValorValido(dados.Valor))
        {
            throw new RegraNegocioException(MensagensFinanceiro.ValorInvalido, CampoValor);
        }

        if (!VencimentoValido(dados.Vencimento))
        {
            throw new RegraNegocioException(MensagensFinanceiro.VencimentoInvalido, CampoVencimento);
        }

        var observacao = NormalizadorTexto.Normalizar(dados.Observacao);

        if (observacao is { Length: > TamanhoMaximoObservacao })
        {
            throw new RegraNegocioException(MensagensFinanceiro.TamanhoObservacao, CampoObservacao);
        }

        Valor = dados.Valor;
        Vencimento = dados.Vencimento;
        Observacao = observacao;
        AtualizadoEm = agora;
    }
}
