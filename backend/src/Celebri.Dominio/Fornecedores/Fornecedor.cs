using Casamento.Dominio.Convidados;
using Casamento.Dominio.Excecoes;
using Casamento.Dominio.Isolamento;

namespace Casamento.Dominio.Fornecedores;

public class Fornecedor : IPertenceOrganizacao
{
    public const int TamanhoMinimoNomeEmpresa = 2;
    public const int TamanhoMaximoNomeEmpresa = 120;
    public const int TamanhoMaximoResponsavel = 120;
    public const int TamanhoMaximoObservacoes = 2000;
    public const int LimitePorOrganizacao = 1000;
    public const string CampoNomeEmpresa = "nomeEmpresa";

    private Fornecedor()
    {
        NomeEmpresa = string.Empty;
        NomeNormalizado = string.Empty;
    }

    public Guid Id { get; private set; }

    public Guid OrganizacaoId { get; private set; }

    public CategoriaFornecedor Categoria { get; private set; }

    public string NomeEmpresa { get; private set; }

    public string NomeNormalizado { get; private set; }

    public string? Responsavel { get; private set; }

    public string? Telefone { get; private set; }

    public string? Email { get; private set; }

    public string? Site { get; private set; }

    public string? Instagram { get; private set; }

    public string? Observacoes { get; private set; }

    public DateTimeOffset? ArquivadoEm { get; private set; }

    public DateTimeOffset CriadoEm { get; private set; }

    public DateTimeOffset AtualizadoEm { get; private set; }

    public bool Arquivado => ArquivadoEm is not null;

    public static Fornecedor Criar(DadosFornecedor dados, DateTimeOffset agora)
    {
        var fornecedor = new Fornecedor
        {
            Id = Guid.NewGuid(),
            CriadoEm = agora,
        };

        fornecedor.Aplicar(dados, agora);
        return fornecedor;
    }

    public static string ChaveNome(string? nomeEmpresa)
    {
        var nome = NormalizarNomeEmpresa(nomeEmpresa);
        return NormalizadorTexto.ChaveComparacao(nome) ?? string.Empty;
    }

    public static string NormalizarNomeEmpresa(string? nomeEmpresa)
    {
        var nome = NormalizadorTexto.Normalizar(nomeEmpresa)
            ?? throw new RegraNegocioException(MensagensFornecedores.NomeEmpresaObrigatorio, CampoNomeEmpresa);

        if (nome.Length is < TamanhoMinimoNomeEmpresa or > TamanhoMaximoNomeEmpresa)
        {
            throw new RegraNegocioException(MensagensFornecedores.TamanhoNomeEmpresa, CampoNomeEmpresa);
        }

        return nome;
    }

    public void Atualizar(DadosFornecedor dados, DateTimeOffset agora)
    {
        if (Arquivado)
        {
            throw new RegraNegocioException(MensagensFornecedores.ArquivadoSemEdicao);
        }

        Aplicar(dados, agora);
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

    private void Aplicar(DadosFornecedor dados, DateTimeOffset agora)
    {
        ArgumentNullException.ThrowIfNull(dados);

        if (!Enum.IsDefined(dados.Categoria))
        {
            throw new RegraNegocioException(MensagensFornecedores.CategoriaInvalida);
        }

        var nomeEmpresa = NormalizarNomeEmpresa(dados.NomeEmpresa);
        var responsavel = NormalizadorTexto.Normalizar(dados.Responsavel);

        if (responsavel is { Length: > TamanhoMaximoResponsavel })
        {
            throw new RegraNegocioException(MensagensFornecedores.TamanhoResponsavel);
        }

        if (!NormalizadorTelefone.TentarNormalizar(dados.Telefone, out var telefone))
        {
            throw new RegraNegocioException(MensagensFornecedores.TelefoneInvalido);
        }

        if (!ValidadorEmailConvidado.Valido(dados.Email))
        {
            throw new RegraNegocioException(MensagensFornecedores.EmailInvalido);
        }

        if (!NormalizadorContatoFornecedor.TentarNormalizarSite(dados.Site, out var site))
        {
            throw new RegraNegocioException(MensagensFornecedores.SiteInvalido);
        }

        if (!NormalizadorContatoFornecedor.TentarNormalizarInstagram(dados.Instagram, out var instagram))
        {
            throw new RegraNegocioException(MensagensFornecedores.InstagramInvalido);
        }

        var observacoes = string.IsNullOrWhiteSpace(dados.Observacoes) ? null : dados.Observacoes.Trim();

        if (observacoes is { Length: > TamanhoMaximoObservacoes })
        {
            throw new RegraNegocioException(MensagensFornecedores.TamanhoObservacoes);
        }

        Categoria = dados.Categoria;
        NomeEmpresa = nomeEmpresa;
        NomeNormalizado = NormalizadorTexto.ChaveComparacao(nomeEmpresa) ?? string.Empty;
        Responsavel = responsavel;
        Telefone = telefone;
        Email = string.IsNullOrWhiteSpace(dados.Email) ? null : dados.Email.Trim().ToLowerInvariant();
        Site = site;
        Instagram = instagram;
        Observacoes = observacoes;
        AtualizadoEm = agora;
    }
}
