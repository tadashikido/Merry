using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Casamento.Dominio.Convidados;
using Casamento.Dominio.Excecoes;
using Casamento.Dominio.Fornecedores;

namespace Casamento.Aplicacao.Fornecedores;

public sealed record SalvarFornecedorRequest(
    [Required(ErrorMessage = MensagensFornecedores.CategoriaObrigatoria)]
    [property: JsonConverter(typeof(JsonStringEnumConverter<CategoriaFornecedor>))]
    CategoriaFornecedor? Categoria,
    [Required(ErrorMessage = MensagensFornecedores.NomeEmpresaObrigatorio)]
    [StringLength(Fornecedor.TamanhoMaximoNomeEmpresa, ErrorMessage = MensagensFornecedores.TamanhoNomeEmpresa)]
    string? NomeEmpresa,
    [StringLength(Fornecedor.TamanhoMaximoResponsavel, ErrorMessage = MensagensFornecedores.TamanhoResponsavel)]
    string? Responsavel,
    [StringLength(NormalizadorTelefone.TamanhoMaximoEntrada, ErrorMessage = MensagensFornecedores.TelefoneInvalido)]
    string? Telefone,
    [StringLength(ValidadorEmailConvidado.TamanhoMaximo, ErrorMessage = MensagensFornecedores.EmailInvalido)]
    string? Email,
    [StringLength(NormalizadorContatoFornecedor.TamanhoMaximoSite, ErrorMessage = MensagensFornecedores.SiteInvalido)]
    string? Site,
    [StringLength(NormalizadorContatoFornecedor.TamanhoMaximoEntradaInstagram, ErrorMessage = MensagensFornecedores.InstagramInvalido)]
    string? Instagram,
    [StringLength(Fornecedor.TamanhoMaximoObservacoes, ErrorMessage = MensagensFornecedores.TamanhoObservacoes)]
    string? Observacoes) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Categoria is { } categoria && !Enum.IsDefined(categoria))
        {
            yield return new ValidationResult(MensagensFornecedores.CategoriaInvalida, [nameof(Categoria)]);
        }

        var nomeEmpresa = NormalizadorTexto.Normalizar(NomeEmpresa);

        if (nomeEmpresa is not null && nomeEmpresa.Length < Fornecedor.TamanhoMinimoNomeEmpresa)
        {
            yield return new ValidationResult(MensagensFornecedores.TamanhoNomeEmpresa, [nameof(NomeEmpresa)]);
        }

        if (!NormalizadorTelefone.Valido(Telefone))
        {
            yield return new ValidationResult(MensagensFornecedores.TelefoneInvalido, [nameof(Telefone)]);
        }

        if (!ValidadorEmailConvidado.Valido(Email))
        {
            yield return new ValidationResult(MensagensFornecedores.EmailInvalido, [nameof(Email)]);
        }

        if (!NormalizadorContatoFornecedor.SiteValido(Site))
        {
            yield return new ValidationResult(MensagensFornecedores.SiteInvalido, [nameof(Site)]);
        }

        if (!NormalizadorContatoFornecedor.InstagramValido(Instagram))
        {
            yield return new ValidationResult(MensagensFornecedores.InstagramInvalido, [nameof(Instagram)]);
        }
    }

    public DadosFornecedor ParaDados()
    {
        return new DadosFornecedor(
            Categoria ?? throw new RegraNegocioException(MensagensFornecedores.CategoriaObrigatoria),
            NomeEmpresa,
            Responsavel,
            Telefone,
            Email,
            Site,
            Instagram,
            Observacoes);
    }
}
