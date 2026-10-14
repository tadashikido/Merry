using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using Casamento.Aplicacao.Convidados;
using Casamento.Dominio.Convidados;

namespace Casamento.Testes.Unidade.Convidados;

public class SalvarConviteRequestTestes
{
    private static readonly JsonSerializerOptions OpcoesWeb = new(JsonSerializerDefaults.Web);

    private static SalvarConvidadoRequest Pessoa(
        string? nome = "Carla",
        string? telefone = null,
        string? email = null,
        FaixaEtaria? faixaEtaria = null,
        RespostaRsvp? resposta = null)
    {
        return new SalvarConvidadoRequest(null, nome, telefone, email, faixaEtaria, resposta);
    }

    private static List<ValidationResult> Validar(IValidatableObject objeto)
    {
        return objeto.Validate(new ValidationContext(objeto)).ToList();
    }

    [Fact]
    public void RequestValido_NaoDeveTerErros()
    {
        var request = new SalvarConviteRequest("Família", "Amigos", 2, [Pessoa()]);

        Assert.Empty(Validar(request));
        Assert.Empty(Validar(request.Convidados![0]));
    }




    [Fact]
    public void NomeDoConviteComUmCaractere_DeveGerarErro()
    {
        Assert.Contains(Validar(new SalvarConviteRequest(" A ", null, null, [Pessoa()])), erro => erro.MemberNames.Contains(nameof(SalvarConviteRequest.Nome)));
    }

    [Theory]
    [InlineData("A", nameof(SalvarConvidadoRequest.Nome))]
    public void NomeDoConvidadoInvalido_DeveGerarErroNoCampo(string? nome, string campo)
    {
        Assert.Contains(Validar(Pessoa(nome)), erro => erro.MemberNames.Contains(campo));
    }

    [Fact]
    public void TelefoneEEmailInvalidos_DevemGerarErrosNosCampos()
    {
        var erros = Validar(Pessoa(telefone: "123", email: "ana@"));

        Assert.Contains(erros, erro => erro.MemberNames.Contains(nameof(SalvarConvidadoRequest.Telefone)) && erro.ErrorMessage == MensagensConvidados.TelefoneInvalido);
        Assert.Contains(erros, erro => erro.MemberNames.Contains(nameof(SalvarConvidadoRequest.Email)) && erro.ErrorMessage == MensagensConvidados.EmailInvalido);
    }

    [Fact]
    public void EnumsForaDoIntervalo_DevemGerarErros()
    {
        var erros = Validar(Pessoa(faixaEtaria: (FaixaEtaria)7, resposta: (RespostaRsvp)7));

        Assert.Contains(erros, erro => erro.MemberNames.Contains(nameof(SalvarConvidadoRequest.FaixaEtaria)));
        Assert.Contains(erros, erro => erro.MemberNames.Contains(nameof(SalvarConvidadoRequest.Resposta)));
    }

    [Fact]
    public void ParaDados_DeveAplicarPadroes()
    {
        var dados = new SalvarConviteRequest(null, null, null, [Pessoa()]).ParaDados();

        Assert.Equal(0, dados.LimiteAcompanhantes);
        var pessoa = Assert.Single(dados.Convidados);
        Assert.Equal(FaixaEtaria.Adulto, pessoa.FaixaEtaria);
        Assert.Equal(RespostaRsvp.Pendente, pessoa.Resposta);
        Assert.Null(pessoa.Id);
    }

    [Fact]
    public void Json_DeveAceitarEnumsComoTexto()
    {
        var request = JsonSerializer.Deserialize<SalvarConviteRequest>(
            """{"convidados":[{"nome":"Pedro","faixaEtaria":"Crianca","resposta":"Confirmado"}]}""",
            OpcoesWeb)!;

        var pessoa = Assert.Single(request.Convidados!);
        Assert.Equal(FaixaEtaria.Crianca, pessoa.FaixaEtaria);
        Assert.Equal(RespostaRsvp.Confirmado, pessoa.Resposta);
    }

    [Fact]
    public void Json_TextoDeEnumDesconhecido_DeveFalhar()
    {
        Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<SalvarConviteRequest>(
            """{"convidados":[{"nome":"Pedro","faixaEtaria":"Idoso"}]}""",
            OpcoesWeb));
    }

    [Fact]
    public void Json_OrganizacaoIdNoCorpo_DeveSerIgnorado()
    {
        var request = JsonSerializer.Deserialize<SalvarConviteRequest>(
            """{"organizacaoId":"7c9e6679-7425-40de-944b-e07fc1f90ae7","casamentoId":"7c9e6679-7425-40de-944b-e07fc1f90ae7","statusEnvio":"Enviado","convidados":[{"nome":"Pedro"}]}""",
            OpcoesWeb)!;

        Assert.DoesNotContain("organizacao", JsonSerializer.Serialize(request, OpcoesWeb), StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("statusEnvio", JsonSerializer.Serialize(request, OpcoesWeb), StringComparison.OrdinalIgnoreCase);
    }
}
