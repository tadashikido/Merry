using System.Diagnostics;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Celebri.Aplicacao.Convidados.Importacao;
using Celebri.Dominio.Convidados;
using Celebri.Testes.Integracao.Banco;
using Celebri.Testes.Integracao.Isolamento;
using Microsoft.EntityFrameworkCore;
using static Celebri.Testes.Integracao.Convidados.ClienteConvites;
using ClienteCasamentos = Celebri.Testes.Integracao.Casamentos.ClienteCasamentos;

namespace Celebri.Testes.Integracao.Convidados;

[Collection(ColecaoBancoPostgreSql.Nome)]
public sealed class ImportacaoConvidadosApiTestes : IsolamentoOrganizacaoTestesBase
{
    private const string PlanilhaExcel =
        "Família;Nome;Celular;Idade;E-mail\r\nFamília Conceição;João Conceição;(11) 98765-4321;Adulto;joao@exemplo.com\r\nFamília Conceição;Maria da Conceição;;Criança;\r\n;Irene Araújo;21 99876-5432;;\r\n";

    private const string PlanilhaComErro =
        "Convite;Nome;Telefone\nFamília Lima;Ana Lima;(11) 98765-4321\nFamília Lima;Bia Lima;123\n;Carlos Dias;(21) 99876-5432\n";

    private static readonly JsonSerializerOptions OpcoesJson = new(JsonSerializerDefaults.Web);

    public ImportacaoConvidadosApiTestes(BancoPostgreSqlFixture banco)
        : base(banco)
    {
    }

    private static string RotaImportacao(Guid casamentoId, bool previa = false)
    {
        return previa ? $"{Rota(casamentoId)}/importacao/pre-visualizacao" : $"{Rota(casamentoId)}/importacao";
    }

    private static byte[] Windows1252(string conteudo)
    {
        return CodePagesEncodingProvider.Instance.GetEncoding(1252)!.GetBytes(conteudo);
    }

    private static MultipartFormDataContent Formulario(byte[] arquivo, string nomeArquivo = "lista.csv", string tipo = "text/csv", params (string Nome, string Valor)[] campos)
    {
        var formulario = new MultipartFormDataContent();
        var conteudo = new ByteArrayContent(arquivo);
        conteudo.Headers.ContentType = new MediaTypeHeaderValue(tipo);
        formulario.Add(conteudo, "arquivo", nomeArquivo);
        foreach (var (nome, valor) in campos)
        {
            formulario.Add(new StringContent(valor), nome);
        }

        return formulario;
    }

    private static MultipartFormDataContent Confirmacao(byte[] arquivo, bool somenteValidos, int convites, int pessoas)
    {
        return Formulario(
            arquivo,
            campos:
            [
                ("somenteValidos", somenteValidos ? "true" : "false"),
                ("convitesEsperados", convites.ToString(System.Globalization.CultureInfo.InvariantCulture)),
                ("pessoasEsperadas", pessoas.ToString(System.Globalization.CultureInfo.InvariantCulture)),
            ]);
    }

    private async Task<Guid> CriarCasamentoAsync()
    {
        return (await ClienteCasamentos.CriarAsync(OrganizacaoA.Cliente)).Id;
    }

    private static async Task<PreVisualizacaoImportacaoDto> LerPreviaAsync(HttpResponseMessage resposta)
    {
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        return (await resposta.Content.ReadFromJsonAsync<PreVisualizacaoImportacaoDto>(OpcoesJson))!;
    }

    private static async Task AssertRegraAsync(HttpResponseMessage resposta, string mensagem)
    {
        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
        using var json = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        Assert.Equal(mensagem, json.RootElement.GetProperty("detail").GetString());
    }

    private async Task<int> ContarConvidadosAsync(Guid casamentoId)
    {
        await using var contexto = CriarContexto(OrganizacaoA);
        return await contexto.Convidados.CountAsync(convidado => convidado.CasamentoId == casamentoId);
    }

    [Fact]
    public async Task PreVisualizar_ExcelWindows1252_DeveMostrarAcentosAgruparENaoGravar()
    {
        var casamentoId = await CriarCasamentoAsync();

        var resposta = await OrganizacaoA.Cliente.PostAsync(RotaImportacao(casamentoId, previa: true), Formulario(Windows1252(PlanilhaExcel)));

        var previa = await LerPreviaAsync(resposta);
        Assert.Equal(2, previa.Resumo.ConvitesValidos);
        Assert.Equal(3, previa.Resumo.PessoasValidas);
        Assert.Equal(1, previa.Resumo.CriancasValidas);
        Assert.Equal("Família Conceição", previa.Convites[0].Nome);
        Assert.Equal(["João Conceição", "Maria da Conceição"], previa.Convites[0].Pessoas.Select(pessoa => pessoa.Nome));
        Assert.Equal("Irene Araújo", previa.Convites[1].Nome);
        Assert.DoesNotContain("98765", await resposta.Content.ReadAsStringAsync(), StringComparison.Ordinal);
        Assert.DoesNotContain("organizacao", await resposta.Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);
        Assert.Equal(0, await ContarConvidadosAsync(casamentoId));
    }

    [Fact]
    public async Task Importar_SemProblemas_DeveGravarTudoNaOrganizacaoECasamentoCorretos()
    {
        var casamentoId = await CriarCasamentoAsync();

        var resposta = await OrganizacaoA.Cliente.PostAsync(RotaImportacao(casamentoId), Confirmacao(Windows1252(PlanilhaExcel), false, 2, 3));

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        var resultado = await resposta.Content.ReadFromJsonAsync<ResultadoImportacaoDto>(OpcoesJson);
        Assert.Equal(new ResultadoImportacaoDto(2, 3), resultado);
        await using var contexto = CriarContexto(OrganizacaoA);
        var convites = await contexto.Convites.Include(convite => convite.Convidados).Where(convite => convite.CasamentoId == casamentoId).ToListAsync();
        Assert.Equal(2, convites.Count);
        Assert.All(convites, convite =>
        {
            Assert.Equal(OrganizacaoA.OrganizacaoId, convite.OrganizacaoId);
            Assert.Equal(StatusEnvioConvite.NaoEnviado, convite.StatusEnvio);
            Assert.All(convite.Convidados, convidado => Assert.Equal(OrganizacaoA.OrganizacaoId, convidado.OrganizacaoId));
        });
        var familia = convites.Single(convite => convite.Nome == "Família Conceição");
        var joao = familia.ConvidadosOrdenados()[0];
        Assert.Equal("11987654321", joao.Telefone);
        Assert.Equal("joao@exemplo.com", joao.Email);
        Assert.Equal(FaixaEtaria.Crianca, familia.ConvidadosOrdenados()[1].FaixaEtaria);

        var lista = await ListarAsync(OrganizacaoA.Cliente, casamentoId);
        Assert.Equal(3, lista.Totais.Pessoas);
    }

    [Fact]
    public async Task Importar_QuinhentasLinhas_DeveConcluirEmPoucosSegundos()
    {
        var casamentoId = await CriarCasamentoAsync();
        var construtor = new StringBuilder("Convite;Grupo;Nome;Telefone;E-mail;Faixa etária\n");
        for (var indice = 1; indice <= 500; indice++)
        {
            construtor.Append(System.Globalization.CultureInfo.InvariantCulture, $"Família {indice / 4};Amigos;Pessoa {indice};11{900000000 + indice};pessoa{indice}@exemplo.com;{(indice % 5 == 0 ? "Criança" : "Adulto")}\n");
        }

        var arquivo = Encoding.UTF8.GetBytes(construtor.ToString());
        var cronometro = Stopwatch.StartNew();
        var previa = await LerPreviaAsync(await OrganizacaoA.Cliente.PostAsync(RotaImportacao(casamentoId, previa: true), Formulario(arquivo)));
        var tempoPrevia = cronometro.Elapsed;
        cronometro.Restart();
        var resposta = await OrganizacaoA.Cliente.PostAsync(
            RotaImportacao(casamentoId),
            Confirmacao(arquivo, false, previa.Resumo.ConvitesValidos, previa.Resumo.PessoasValidas));
        var tempoImportacao = cronometro.Elapsed;

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        Assert.Equal(126, previa.Resumo.ConvitesValidos);
        Assert.Equal(500, await ContarConvidadosAsync(casamentoId));
        Assert.True(tempoPrevia < TimeSpan.FromSeconds(3), $"Pré-visualização levou {tempoPrevia.TotalMilliseconds} ms");
        Assert.True(tempoImportacao < TimeSpan.FromSeconds(3), $"Importação levou {tempoImportacao.TotalMilliseconds} ms");
    }

    [Fact]
    public async Task Importar_ComProblemasSemSomenteValidos_DeveRetornar422ENaoGravarNada()
    {
        var casamentoId = await CriarCasamentoAsync();

        var resposta = await OrganizacaoA.Cliente.PostAsync(RotaImportacao(casamentoId), Confirmacao(Encoding.UTF8.GetBytes(PlanilhaComErro), false, 1, 1));

        await AssertRegraAsync(resposta, MensagensImportacaoConvidados.ImportacaoComProblemas);
        Assert.Equal(0, await ContarConvidadosAsync(casamentoId));
    }

    [Fact]
    public async Task Importar_SomenteValidos_DeveGravarSoOsConvitesSemProblema()
    {
        var casamentoId = await CriarCasamentoAsync();
        var arquivo = Encoding.UTF8.GetBytes(PlanilhaComErro);
        var previa = await LerPreviaAsync(await OrganizacaoA.Cliente.PostAsync(RotaImportacao(casamentoId, previa: true), Formulario(arquivo)));

        var resposta = await OrganizacaoA.Cliente.PostAsync(RotaImportacao(casamentoId), Confirmacao(arquivo, true, previa.Resumo.ConvitesValidos, previa.Resumo.PessoasValidas));

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        var lista = await ListarAsync(OrganizacaoA.Cliente, casamentoId);
        var convite = Assert.Single(lista.Convites);
        Assert.Equal("Carlos Dias", convite.Nome);
        var linha = Assert.Single(previa.LinhasComProblema);
        Assert.Equal(3, linha.Linha);
        Assert.Equal("123", linha.Valores.Telefone);
    }

    [Fact]
    public async Task Importar_PlanilhaDiferenteDaPrevia_DeveRetornar422ENaoGravar()
    {
        var casamentoId = await CriarCasamentoAsync();

        var resposta = await OrganizacaoA.Cliente.PostAsync(RotaImportacao(casamentoId), Confirmacao(Windows1252(PlanilhaExcel), false, 5, 9));

        await AssertRegraAsync(resposta, MensagensImportacaoConvidados.PlanilhaAlterada);
        Assert.Equal(0, await ContarConvidadosAsync(casamentoId));
    }

    [Fact]
    public async Task ReimportarMesmaPlanilha_DeveApontarPessoasJaCadastradas()
    {
        var casamentoId = await CriarCasamentoAsync();
        var arquivo = Windows1252(PlanilhaExcel);
        Assert.Equal(HttpStatusCode.OK, (await OrganizacaoA.Cliente.PostAsync(RotaImportacao(casamentoId), Confirmacao(arquivo, false, 2, 3))).StatusCode);

        var previa = await LerPreviaAsync(await OrganizacaoA.Cliente.PostAsync(RotaImportacao(casamentoId, previa: true), Formulario(arquivo)));

        Assert.Equal(3, previa.Resumo.ConvidadosExistentes);
        Assert.Equal(2, previa.Resumo.LinhasDuplicadas);
        Assert.Equal(0, previa.Resumo.ConvitesValidos);
        Assert.All(
            previa.LinhasComProblema.Where(linha => linha.Valores.Telefone.Length > 0),
            linha => Assert.Equal(MensagensImportacaoConvidados.JaCadastrada, linha.Problemas.Single(problema => problema.Tipo == "Duplicado").Mensagem));
        var novaTentativa = await OrganizacaoA.Cliente.PostAsync(RotaImportacao(casamentoId), Confirmacao(arquivo, true, 0, 0));
        await AssertRegraAsync(novaTentativa, MensagensImportacaoConvidados.NenhumConviteValido);
        Assert.Equal(3, await ContarConvidadosAsync(casamentoId));
    }

    [Fact]
    public async Task CasamentoArquivado_DeveRetornar422NasDuasRotas()
    {
        var casamentoId = await CriarCasamentoAsync();
        await OrganizacaoA.Cliente.PostAsync($"{ClienteCasamentos.Rota}/{casamentoId}/arquivar", null);

        var previa = await OrganizacaoA.Cliente.PostAsync(RotaImportacao(casamentoId, previa: true), Formulario(Windows1252(PlanilhaExcel)));
        var importacao = await OrganizacaoA.Cliente.PostAsync(RotaImportacao(casamentoId), Confirmacao(Windows1252(PlanilhaExcel), false, 2, 3));

        await AssertRegraAsync(previa, MensagensConvidados.CasamentoArquivado);
        await AssertRegraAsync(importacao, MensagensConvidados.CasamentoArquivado);
        Assert.Equal(0, await ContarConvidadosAsync(casamentoId));
    }

    [Fact]
    public async Task ArquivoBinarioComExtensaoCsv_DeveRetornar422()
    {
        var casamentoId = await CriarCasamentoAsync();
        byte[] png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D, 0x49, 0x48, 0x44, 0x52];

        var resposta = await OrganizacaoA.Cliente.PostAsync(RotaImportacao(casamentoId, previa: true), Formulario(png, "foto.csv", "text/csv"));

        await AssertRegraAsync(resposta, MensagensImportacaoConvidados.ArquivoNaoTexto);
    }

    [Fact]
    public async Task PlanilhaSemColunaNome_DeveRetornar422()
    {
        var casamentoId = await CriarCasamentoAsync();

        var resposta = await OrganizacaoA.Cliente.PostAsync(RotaImportacao(casamentoId, previa: true), Formulario(Encoding.UTF8.GetBytes("Convidada;Telefone\n")));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, resposta.StatusCode);
    }

    [Fact]
    public async Task ArquivoLigeiramenteAcimaDe2MB_DeveRetornar422()
    {
        var casamentoId = await CriarCasamentoAsync();
        var arquivo = Encoding.UTF8.GetBytes("Nome\n" + new string('a', LimitesImportacao.TamanhoMaximoBytes));

        var resposta = await OrganizacaoA.Cliente.PostAsync(RotaImportacao(casamentoId, previa: true), Formulario(arquivo));

        await AssertRegraAsync(resposta, MensagensImportacaoConvidados.ArquivoGrandeDemais);
    }

    [Fact]
    public async Task ArquivoMuitoAcimaDoLimite_DeveRetornar413AntesDeProcessar()
    {
        var casamentoId = await CriarCasamentoAsync();
        var arquivo = new byte[3 * 1024 * 1024];

        var resposta = await OrganizacaoA.Cliente.PostAsync(RotaImportacao(casamentoId, previa: true), Formulario(arquivo));

        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, resposta.StatusCode);
        using var json = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        Assert.Equal(MensagensImportacaoConvidados.ArquivoGrandeDemais, json.RootElement.GetProperty("detail").GetString());
        Assert.Equal(0, await ContarConvidadosAsync(casamentoId));
    }

    [Fact]
    public async Task SemArquivo_DeveRetornar400()
    {
        var casamentoId = await CriarCasamentoAsync();
        using var formulario = new MultipartFormDataContent { { new StringContent("true"), "somenteValidos" } };

        var resposta = await OrganizacaoA.Cliente.PostAsync(RotaImportacao(casamentoId, previa: true), formulario);

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
    }

    [Fact]
    public async Task SemAutenticacao_DeveRetornar401()
    {
        var casamentoId = await CriarCasamentoAsync();

        var resposta = await ClienteAnonimo.PostAsync(RotaImportacao(casamentoId, previa: true), Formulario(Windows1252(PlanilhaExcel)));

        Assert.Equal(HttpStatusCode.Unauthorized, resposta.StatusCode);
    }

    [Fact]
    public async Task OutraOrganizacao_DeveRetornar404IndistinguivelENaoGravar()
    {
        var casamentoId = await CriarCasamentoAsync();

        var previa = await OrganizacaoB.Cliente.PostAsync(RotaImportacao(casamentoId, previa: true), Formulario(Windows1252(PlanilhaExcel)));
        var importacao = await OrganizacaoB.Cliente.PostAsync(RotaImportacao(casamentoId), Confirmacao(Windows1252(PlanilhaExcel), false, 2, 3));
        var inexistente = await OrganizacaoB.Cliente.PostAsync(RotaImportacao(Guid.NewGuid(), previa: true), Formulario(Windows1252(PlanilhaExcel)));

        await AssertNaoEncontradoAsync(previa);
        await AssertNaoEncontradoAsync(importacao);
        await AssertNaoEncontradoAsync(inexistente);
        Assert.DoesNotContain("Conceição", await previa.Content.ReadAsStringAsync(), StringComparison.Ordinal);
        Assert.Equal(0, await ContarConvidadosAsync(casamentoId));
        await using var contextoB = CriarContexto(OrganizacaoB);
        Assert.False(await contextoB.Convidados.AnyAsync());
    }
}
