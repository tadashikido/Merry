using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using System.Text.Json;
using Celebri.Api.Autorizacao;
using Celebri.Aplicacao.Autenticacao;
using Celebri.Aplicacao.Tarefas;
using Celebri.Dominio.Tarefas;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection;

namespace Celebri.Testes.Unidade.Tarefas;

public class RequestsTarefasTestes
{
    private static readonly JsonSerializerOptions OpcoesWeb = new(JsonSerializerDefaults.Web);

    private static List<ValidationResult> Validar(IValidatableObject request)
    {
        return request.Validate(new ValidationContext(request)).ToList();
    }

    [Fact]
    public void SalvarTarefa_Valido_NaoDeveTerErros()
    {
        Assert.Empty(Validar(new SalvarTarefaRequest("Contratar fotógrafo", null, ResponsavelTarefa.Anfitriao, CategoriaTarefa.Geral, new DateOnly(2027, 1, 10))));
    }

    [Theory]
    [InlineData("A", MensagensTarefas.TamanhoTitulo)]
    [InlineData("  B  ", MensagensTarefas.TamanhoTitulo)]
    public void SalvarTarefa_TituloCurtoAposNormalizar_DeveApontarOCampo(string? titulo, string mensagem)
    {
        var erros = Validar(new SalvarTarefaRequest(titulo, null, null, null, null));

        var erro = Assert.Single(erros);
        Assert.Equal(mensagem, erro.ErrorMessage);
        Assert.Contains(nameof(SalvarTarefaRequest.Titulo), erro.MemberNames);
    }

    [Fact]
    public void SalvarTarefa_TituloVazio_FicaParaOAtributoObrigatorio()
    {
        Assert.Empty(Validar(new SalvarTarefaRequest(null, null, null, null, null)));
        Assert.Empty(Validar(new SalvarTarefaRequest("   ", null, null, null, null)));
    }

    [Fact]
    public void SalvarTarefa_EnumsEPrazoForaDaFaixa_DevemSerValidados()
    {
        var erros = Validar(new SalvarTarefaRequest(
            "Título válido",
            null,
            (ResponsavelTarefa)7,
            (CategoriaTarefa)70,
            new DateOnly(1990, 1, 1)));

        Assert.Equal(3, erros.Count);
        Assert.Contains(erros, erro => erro.ErrorMessage == MensagensTarefas.ResponsavelInvalido);
        Assert.Contains(erros, erro => erro.ErrorMessage == MensagensTarefas.CategoriaInvalida);
        Assert.Contains(erros, erro => erro.ErrorMessage == MensagensTarefas.PrazoForaDaFaixa);
    }

    [Fact]
    public void SalvarTarefa_Json_DeveAceitarEnumsComoTextoEPrazoComoData()
    {
        var request = JsonSerializer.Deserialize<SalvarTarefaRequest>(
            """{"titulo":"Provar o vestido","responsavel":"Anfitriao","categoria":"TrajesBeleza","prazo":"2027-01-10","organizacaoId":"00000000-0000-0000-0000-000000000001"}""",
            OpcoesWeb)!;

        var dados = request.ParaDados();

        Assert.Equal(ResponsavelTarefa.Anfitriao, dados.Responsavel);
        Assert.Equal(CategoriaTarefa.TrajesBeleza, dados.Categoria);
        Assert.Equal(new DateOnly(2027, 1, 10), dados.Prazo);
        Assert.DoesNotContain(typeof(SalvarTarefaRequest).GetProperties(), propriedade => propriedade.Name.Contains("Organizacao", StringComparison.Ordinal));
        Assert.DoesNotContain(typeof(SalvarTarefaRequest).GetProperties(), propriedade => propriedade.Name.Contains("Origem", StringComparison.Ordinal));
    }

    [Fact]
    public void SalvarTarefa_Json_EnumDesconhecido_DeveFalharNaDesserializacao()
    {
        Assert.Throws<JsonException>(() =>
            JsonSerializer.Deserialize<SalvarTarefaRequest>("""{"titulo":"Teste","responsavel":"Equipe"}""", OpcoesWeb));
    }

    [Fact]
    public void AlterarStatus_StatusForaDoEnum_DeveTerErroEAusenteFicaParaOAtributo()
    {
        Assert.Empty(Validar(new AlterarStatusTarefaRequest(null)));
        Assert.Equal(MensagensTarefas.StatusInvalido, Assert.Single(Validar(new AlterarStatusTarefaRequest((StatusTarefa)9))).ErrorMessage);
        Assert.Empty(Validar(new AlterarStatusTarefaRequest(StatusTarefa.Concluida)));
    }

    [Fact]
    public void AlterarStatus_Json_SoTemOCampoStatus()
    {
        var request = JsonSerializer.Deserialize<AlterarStatusTarefaRequest>("""{"status":"Concluida","titulo":"Invasão"}""", OpcoesWeb)!;

        Assert.Equal(StatusTarefa.Concluida, request.Status);
        Assert.Single(typeof(AlterarStatusTarefaRequest).GetProperties());
    }

    [Fact]
    public void Dtos_NaoDevemExporIdentificadoresInternos()
    {
        var nomes = typeof(TarefaDto).GetProperties().Select(propriedade => propriedade.Name)
            .Concat(typeof(TarefaPendenteDto).GetProperties().Select(propriedade => propriedade.Name))
            .ToList();

        Assert.DoesNotContain("OrganizacaoId", nomes);
        Assert.DoesNotContain("OrigemModeloItemId", nomes);
        Assert.DoesNotContain("ConcluidaPorUsuarioId", nomes);
        Assert.DoesNotContain("CriadoPorUsuarioId", nomes);
    }

    private static IAuthorizationService Autorizacao()
    {
        var servicos = new ServiceCollection();
        servicos.AddLogging();
        servicos.AddAuthorization(PoliticasAutorizacao.Registrar);
        return servicos.BuildServiceProvider().GetRequiredService<IAuthorizationService>();
    }

    private static ClaimsPrincipal Usuario(string papel)
    {
        return new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim(ClaimsAutenticacao.Papel, papel)],
            "Teste",
            ClaimsAutenticacao.Nome,
            ClaimsAutenticacao.Papel));
    }

    [Theory]
    [InlineData(PoliticasAutorizacao.ConsultarTarefas, "Dono", true)]
    [InlineData(PoliticasAutorizacao.ConsultarTarefas, "Anfitriao", true)]
    [InlineData(PoliticasAutorizacao.AlterarStatusTarefas, "Dono", true)]
    [InlineData(PoliticasAutorizacao.AlterarStatusTarefas, "Anfitriao", true)]
    [InlineData(PoliticasAutorizacao.GerenciarTarefas, "Dono", true)]
    [InlineData(PoliticasAutorizacao.GerenciarTarefas, "Anfitriao", false)]
    [InlineData(PoliticasAutorizacao.ConsultarPendenciasTarefas, "Dono", true)]
    [InlineData(PoliticasAutorizacao.ConsultarPendenciasTarefas, "Anfitriao", false)]
    [InlineData(PoliticasAutorizacao.ConsultarTarefas, "Membro", false)]
    [InlineData(PoliticasAutorizacao.GerenciarModelosChecklist, "Dono", true)]
    [InlineData(PoliticasAutorizacao.GerenciarModelosChecklist, "Anfitriao", false)]
    [InlineData(PoliticasAutorizacao.GerenciarChecklist, "Dono", true)]
    [InlineData(PoliticasAutorizacao.GerenciarChecklist, "Anfitriao", false)]
    public async Task Politicas_DevemSeguirAMatrizQuemVeOQue(string politica, string papel, bool autorizado)
    {
        var resultado = await Autorizacao().AuthorizeAsync(Usuario(papel), politica);

        Assert.Equal(autorizado, resultado.Succeeded);
    }
}
