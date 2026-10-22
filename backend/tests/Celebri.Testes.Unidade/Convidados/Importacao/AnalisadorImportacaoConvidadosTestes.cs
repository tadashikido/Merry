using Casamento.Aplicacao.Convidados.Importacao;
using Casamento.Dominio.Convidados;
using static Casamento.Testes.Unidade.Convidados.Importacao.PlanilhasTeste;

namespace Casamento.Testes.Unidade.Convidados.Importacao;

public class AnalisadorImportacaoConvidadosTestes
{
    private static AnaliseImportacao Analisar(params string[] linhas)
    {
        return AnalisadorImportacaoConvidados.Analisar(Planilha(linhas), []);
    }

    private static AnaliseImportacao Analisar(IReadOnlyList<IdentificacaoConvidado> existentes, params string[] linhas)
    {
        return AnalisadorImportacaoConvidados.Analisar(Planilha(linhas), existentes);
    }

    [Fact]
    public void Analisar_FixtureDoExcel_DeveAgruparFamiliaECriarConviteIndividual()
    {
        var analise = AnalisadorImportacaoConvidados.Analisar(LeitorCsv.Ler(Fixture("excel-windows1252-ponto-e-virgula.csv")), []);

        Assert.Empty(analise.Problemas);
        Assert.Collection(
            analise.Convites,
            familia =>
            {
                Assert.Equal("Família Conceição", familia.Nome);
                Assert.True(familia.Valido);
                Assert.Equal(["João Conceição", "Maria da Conceição"], familia.Pessoas.Select(pessoa => pessoa.Nome));
                Assert.Equal(FaixaEtaria.Crianca, familia.Pessoas[1].FaixaEtaria);
            },
            individual =>
            {
                Assert.Null(individual.Nome);
                Assert.Equal("Irene Araújo", individual.NomeExibicao);
                Assert.Single(individual.Pessoas);
            });
    }

    [Fact]
    public void Analisar_ConviteComGrafiasDiferentes_DeveAgruparSemDiferenciarAcentoECaixa()
    {
        var analise = AnalisadorImportacaoConvidados.Analisar(LeitorCsv.Ler(Fixture("google-utf8-bom-virgula.csv")), []);

        var familia = analise.Convites[0];
        Assert.Equal("Família Conceição", familia.Nome);
        Assert.Equal("Família da noiva, lado materno", familia.Grupo);
        Assert.Equal(2, familia.Pessoas.Count);
        Assert.Equal(2, analise.Convites.Count);
    }

    [Fact]
    public void Analisar_LinhaComVariosCamposInvalidos_DeveListarTodosOsErrosEInvalidarOConvite()
    {
        var analise = Analisar(
            "Convite;Nome;Telefone;E-mail;Idade;Resposta;Acompanhantes;Grupo",
            "Família Lima;Ana Lima;123;ana@;bebê;talvez;12;" + new string('g', 61),
            "Família Lima;Bruno Lima;(11) 98765-4321;;;;;");

        var erros = analise.Problemas.Where(problema => problema.Linha == 2).ToList();
        Assert.All(erros, problema => Assert.Equal(TipoProblemaLinha.Erro, problema.Tipo));
        Assert.Equal(
            [
                ColunaImportacao.Grupo, ColunaImportacao.Telefone, ColunaImportacao.Email, ColunaImportacao.FaixaEtaria,
                ColunaImportacao.Resposta, ColunaImportacao.Acompanhantes,
            ],
            erros.Select(problema => problema.Coluna!.Value));
        Assert.Contains(erros, problema => problema.Mensagem == MensagensConvidados.TelefoneInvalido);
        var convite = Assert.Single(analise.Convites);
        Assert.False(convite.Valido);
        Assert.Equal(SituacaoPessoaImportada.ComErro, convite.Pessoas[0].Situacao);
        Assert.Equal(SituacaoPessoaImportada.Valida, convite.Pessoas[1].Situacao);
        Assert.Empty(analise.ConvitesValidos);
    }

    [Fact]
    public void Analisar_NomeVazioOuCurto_DeveApontarErroNaColunaNome()
    {
        var analise = Analisar("Nome;Telefone", ";(11) 98765-4321", "A;");

        Assert.Contains(analise.Problemas, problema => problema is { Linha: 2, Coluna: ColunaImportacao.Nome } && problema.Mensagem == MensagensConvidados.NomeObrigatorio);
        Assert.Contains(analise.Problemas, problema => problema is { Linha: 3, Coluna: ColunaImportacao.Nome } && problema.Mensagem == MensagensConvidados.TamanhoNome);
    }

    [Fact]
    public void Analisar_ConviteCom31Pessoas_DeveMarcarTodasAsLinhas()
    {
        var linhas = new List<string> { "Convite;Nome" };
        linhas.AddRange(Enumerable.Range(1, 31).Select(indice => $"Turma do futebol;Jogador {indice}"));

        var analise = Analisar([.. linhas]);

        Assert.Equal(31, analise.Problemas.Count(problema => problema.Mensagem == MensagensConvidados.QuantidadeConvidados));
        Assert.False(Assert.Single(analise.Convites).Valido);
    }

    [Fact]
    public void Analisar_ConviteCom30Pessoas_DeveSerValido()
    {
        var linhas = new List<string> { "Convite;Nome" };
        linhas.AddRange(Enumerable.Range(1, 30).Select(indice => $"Turma do futebol;Jogador {indice}"));

        var analise = Analisar([.. linhas]);

        Assert.True(Assert.Single(analise.Convites).Valido);
    }

    [Fact]
    public void Analisar_PessoaRepetidaNaPlanilha_DeveApontarASegundaComReferenciaAPrimeira()
    {
        var analise = Analisar(
            "Nome;Telefone",
            "Maria da Silva;(11) 98765-4321",
            "MARIA  DA SILVA;+55 11 98765-4321");

        var duplicado = Assert.Single(analise.Problemas);
        Assert.Equal(3, duplicado.Linha);
        Assert.Equal(TipoProblemaLinha.Duplicado, duplicado.Tipo);
        Assert.Equal(MensagensImportacaoConvidados.DuplicadaNaPlanilha(2), duplicado.Mensagem);
        Assert.True(analise.Convites[0].Valido);
        Assert.False(analise.Convites[1].Valido);
        Assert.Equal(SituacaoPessoaImportada.Duplicada, analise.Convites[1].Pessoas[0].Situacao);
    }

    [Fact]
    public void Analisar_PessoaJaCadastrada_DeveApontarDuplicadoContraABase()
    {
        var analise = Analisar(
            [new IdentificacaoConvidado("Maria da Silva", "11987654321")],
            "Nome;Telefone",
            "maria da silva;(11) 98765-4321",
            "Maria da Silva;(11) 91234-5678");

        var duplicado = Assert.Single(analise.Problemas);
        Assert.Equal(2, duplicado.Linha);
        Assert.Equal(MensagensImportacaoConvidados.JaCadastrada, duplicado.Mensagem);
        Assert.Single(analise.ConvitesValidos);
    }

    [Fact]
    public void Analisar_HomonimoSemTelefone_DeveGerarApenasAviso()
    {
        var analise = Analisar(
            [new IdentificacaoConvidado("João Pereira", null)],
            "Nome;Telefone",
            "João Pereira;(11) 98765-4321",
            "Carlos Dias;",
            "carlos dias;");

        Assert.All(analise.Problemas, problema => Assert.Equal(TipoProblemaLinha.Aviso, problema.Tipo));
        Assert.Equal([2, 4], analise.Problemas.Select(problema => problema.Linha));
        Assert.All(analise.Convites, convite => Assert.True(convite.Valido));
    }

    [Fact]
    public void Analisar_GrupoEAcompanhantesDivergentesNoConvite_DeveAvisarEUsarOPrimeiro()
    {
        var analise = Analisar(
            "Convite;Nome;Grupo;Acompanhantes",
            "Família Lima;Ana;Família da noiva;2",
            "Família Lima;Bruno;família DA noiva;",
            "Família Lima;Carla;Amigos;3");

        Assert.Equal(2, analise.Problemas.Count);
        Assert.All(analise.Problemas, problema =>
        {
            Assert.Equal(4, problema.Linha);
            Assert.Equal(TipoProblemaLinha.Aviso, problema.Tipo);
        });
        var convite = Assert.Single(analise.Convites);
        Assert.True(convite.Valido);
        Assert.Equal("Família da noiva", convite.Grupo);
        Assert.Equal(2, convite.LimiteAcompanhantes);
    }

    [Fact]
    public void Analisar_LinhaDeExemploDoModelo_DeveAvisar()
    {
        var analise = Analisar("Nome", "Carla Exemplo (exemplo)");

        var aviso = Assert.Single(analise.Problemas);
        Assert.Equal(MensagensImportacaoConvidados.LinhaExemplo, aviso.Mensagem);
        Assert.True(analise.Convites[0].Valido);
    }

    [Fact]
    public void ParaRequest_DeveGerarRequestAceitoPeloDominio()
    {
        var analise = Analisar(
            "Convite;Nome;Telefone;E-mail;Idade;Resposta;Acompanhantes;Grupo",
            "Família Lima;Ana Lima;(11) 98765-4321;Ana@Exemplo.com;Adulto;Sim;1;Família da noiva",
            "Família Lima;Bia Lima;;;C;;;");

        var dados = AnalisadorImportacaoConvidados.ParaRequest(analise.Convites[0]).ParaDados();
        var convite = Convite.Criar(Guid.NewGuid(), dados, DateTimeOffset.UnixEpoch);

        Assert.Equal("Família Lima", convite.Nome);
        Assert.Equal("Família da noiva", convite.Grupo);
        Assert.Equal(1, convite.LimiteAcompanhantes);
        var pessoas = convite.ConvidadosOrdenados();
        Assert.Equal("11987654321", pessoas[0].Telefone);
        Assert.Equal("ana@exemplo.com", pessoas[0].Email);
        Assert.Equal(RespostaRsvp.Confirmado, pessoas[0].Resposta);
        Assert.Equal(FaixaEtaria.Crianca, pessoas[1].FaixaEtaria);
        Assert.Equal(RespostaRsvp.Pendente, pessoas[1].Resposta);
    }

    [Fact]
    public void Analisar_QuinhentasLinhas_DeveSerRapido()
    {
        var planilha = LeitorCsv.Ler(Utf8(Linhas(500, "Convite;Nome;Telefone", indice => $"Família {indice / 4};Pessoa {indice};11{900000000 + indice}")));
        var existentes = Enumerable.Range(1, 4500).Select(indice => new IdentificacaoConvidado($"Existente {indice}", $"21{900000000 + indice}")).ToList();
        var cronometro = System.Diagnostics.Stopwatch.StartNew();

        var analise = AnalisadorImportacaoConvidados.Analisar(planilha, existentes);

        cronometro.Stop();
        Assert.Empty(analise.Problemas);
        Assert.Equal(126, analise.Convites.Count);
        Assert.True(cronometro.ElapsedMilliseconds < 1000, $"Análise levou {cronometro.ElapsedMilliseconds} ms");
    }
}
