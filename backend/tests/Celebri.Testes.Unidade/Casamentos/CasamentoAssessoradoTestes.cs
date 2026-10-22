using Celebri.Dominio.Casamentos;
using Celebri.Dominio.Excecoes;

namespace Celebri.Testes.Unidade.Casamentos;

public class CasamentoAssessoradoTestes
{
    private static readonly DateTimeOffset Agora = new(2026, 9, 28, 15, 0, 0, TimeSpan.Zero);

    public static DadosCasamento DadosValidos(
        string nomePrimeiraPessoa = "Ana Beatriz",
        string nomeSegundaPessoa = "Bruno",
        DateOnly? data = null,
        TimeOnly? horario = null,
        string? localCerimonia = "Capela São José",
        string? localRecepcao = null,
        int? convidadosEstimados = 150,
        string? observacoes = null)
    {
        return new DadosCasamento(
            nomePrimeiraPessoa,
            nomeSegundaPessoa,
            data ?? new DateOnly(2027, 5, 15),
            horario,
            localCerimonia,
            localRecepcao,
            convidadosEstimados,
            observacoes);
    }

    [Fact]
    public void Criar_DadosValidos_DeveNormalizarEPreencherAuditoriaSemOrganizacao()
    {
        var casamento = CasamentoAssessorado.Criar(
            DadosValidos(
                nomePrimeiraPessoa: "  Ana Beatriz  ",
                nomeSegundaPessoa: " Bruno ",
                horario: new TimeOnly(16, 30, 45),
                localCerimonia: "  Capela  ",
                localRecepcao: "   ",
                observacoes: ""),
            Agora);

        Assert.NotEqual(Guid.Empty, casamento.Id);
        Assert.Equal(Guid.Empty, casamento.OrganizacaoId);
        Assert.Equal("Ana Beatriz", casamento.NomePrimeiraPessoa);
        Assert.Equal("Bruno", casamento.NomeSegundaPessoa);
        Assert.Equal(new TimeOnly(16, 30), casamento.Horario);
        Assert.Equal("Capela", casamento.LocalCerimonia);
        Assert.Null(casamento.LocalRecepcao);
        Assert.Null(casamento.Observacoes);
        Assert.Equal(Agora, casamento.CriadoEm);
        Assert.Equal(Agora, casamento.AtualizadoEm);
        Assert.False(casamento.Arquivado);
    }

    [Theory]
    [InlineData("", "Bruno", MensagensCasamento.NomeObrigatorio)]
    [InlineData("   ", "Bruno", MensagensCasamento.NomeObrigatorio)]
    [InlineData("Ana", "", MensagensCasamento.NomeObrigatorio)]
    [InlineData("A", "Bruno", MensagensCasamento.TamanhoNome)]
    [InlineData("Ana", " B ", MensagensCasamento.TamanhoNome)]
    public void Criar_NomesInvalidos_DeveLancarRegraNegocio(string primeiro, string segundo, string mensagem)
    {
        var excecao = Assert.Throws<RegraNegocioException>(() =>
            CasamentoAssessorado.Criar(DadosValidos(nomePrimeiraPessoa: primeiro, nomeSegundaPessoa: segundo), Agora));

        Assert.Equal(mensagem, excecao.Message);
    }

    [Fact]
    public void Criar_NomeCom81Caracteres_DeveLancarRegraNegocio()
    {
        var excecao = Assert.Throws<RegraNegocioException>(() =>
            CasamentoAssessorado.Criar(DadosValidos(nomePrimeiraPessoa: new string('a', 81)), Agora));

        Assert.Equal(MensagensCasamento.TamanhoNome, excecao.Message);
    }

    [Fact]
    public void Criar_NomeCom80Caracteres_DeveAceitar()
    {
        var casamento = CasamentoAssessorado.Criar(DadosValidos(nomePrimeiraPessoa: new string('a', 80)), Agora);

        Assert.Equal(80, casamento.NomePrimeiraPessoa.Length);
    }

    [Theory]
    [InlineData(1999, 12, 31)]
    [InlineData(2101, 1, 1)]
    [InlineData(1, 1, 1)]
    public void Criar_DataForaDaFaixa_DeveLancarRegraNegocio(int ano, int mes, int dia)
    {
        var excecao = Assert.Throws<RegraNegocioException>(() =>
            CasamentoAssessorado.Criar(DadosValidos(data: new DateOnly(ano, mes, dia)), Agora));

        Assert.Equal(MensagensCasamento.DataForaDaFaixa, excecao.Message);
    }

    [Theory]
    [InlineData(2000, 1, 1)]
    [InlineData(2100, 12, 31)]
    [InlineData(2010, 6, 12)]
    public void Criar_DataNosLimitesOuPassada_DeveAceitar(int ano, int mes, int dia)
    {
        var casamento = CasamentoAssessorado.Criar(DadosValidos(data: new DateOnly(ano, mes, dia)), Agora);

        Assert.Equal(new DateOnly(ano, mes, dia), casamento.Data);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    [InlineData(5001)]
    public void Criar_ConvidadosForaDaFaixa_DeveLancarRegraNegocio(int convidados)
    {
        var excecao = Assert.Throws<RegraNegocioException>(() =>
            CasamentoAssessorado.Criar(DadosValidos(convidadosEstimados: convidados), Agora));

        Assert.Equal(MensagensCasamento.ConvidadosForaDaFaixa, excecao.Message);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(5000)]
    public void Criar_ConvidadosNosLimites_DeveAceitar(int convidados)
    {
        var casamento = CasamentoAssessorado.Criar(DadosValidos(convidadosEstimados: convidados), Agora);

        Assert.Equal(convidados, casamento.ConvidadosEstimados);
    }

    [Fact]
    public void Criar_LocalCom201Caracteres_DeveLancarRegraNegocio()
    {
        var excecao = Assert.Throws<RegraNegocioException>(() =>
            CasamentoAssessorado.Criar(DadosValidos(localRecepcao: new string('x', 201)), Agora));

        Assert.Equal(MensagensCasamento.TamanhoLocal, excecao.Message);
    }

    [Fact]
    public void Criar_ObservacoesCom2001Caracteres_DeveLancarRegraNegocio()
    {
        var excecao = Assert.Throws<RegraNegocioException>(() =>
            CasamentoAssessorado.Criar(DadosValidos(observacoes: new string('x', 2001)), Agora));

        Assert.Equal(MensagensCasamento.TamanhoObservacoes, excecao.Message);
    }

    [Fact]
    public void Criar_DadosNulos_DeveLancarArgumentNull()
    {
        Assert.Throws<ArgumentNullException>(() => CasamentoAssessorado.Criar(null!, Agora));
    }

    [Fact]
    public void Atualizar_CasamentoAtivo_DeveAplicarDadosEAtualizarInstante()
    {
        var casamento = CasamentoAssessorado.Criar(DadosValidos(), Agora);
        var depois = Agora.AddHours(2);

        casamento.Atualizar(DadosValidos(nomeSegundaPessoa: "Bruna", data: new DateOnly(2027, 6, 1), convidadosEstimados: null), depois);

        Assert.Equal("Bruna", casamento.NomeSegundaPessoa);
        Assert.Equal(new DateOnly(2027, 6, 1), casamento.Data);
        Assert.Null(casamento.ConvidadosEstimados);
        Assert.Equal(Agora, casamento.CriadoEm);
        Assert.Equal(depois, casamento.AtualizadoEm);
    }

    [Fact]
    public void Atualizar_DadosInvalidos_NaoDeveAlterarNada()
    {
        var casamento = CasamentoAssessorado.Criar(DadosValidos(), Agora);

        Assert.Throws<RegraNegocioException>(() => casamento.Atualizar(DadosValidos(nomeSegundaPessoa: "Novo", convidadosEstimados: 0), Agora.AddHours(1)));

        Assert.Equal("Bruno", casamento.NomeSegundaPessoa);
        Assert.Equal(Agora, casamento.AtualizadoEm);
    }

    [Fact]
    public void Atualizar_CasamentoArquivado_DeveLancarRegraNegocio()
    {
        var casamento = CasamentoAssessorado.Criar(DadosValidos(), Agora);
        casamento.Arquivar(Agora.AddDays(1));

        var excecao = Assert.Throws<RegraNegocioException>(() => casamento.Atualizar(DadosValidos(nomeSegundaPessoa: "Outro"), Agora.AddDays(2)));

        Assert.Equal(MensagensCasamento.ArquivadoSemEdicao, excecao.Message);
        Assert.Equal("Bruno", casamento.NomeSegundaPessoa);
    }

    [Fact]
    public void ArquivarERestaurar_DevemSerIdempotentes()
    {
        var casamento = CasamentoAssessorado.Criar(DadosValidos(), Agora);
        var primeiroArquivamento = Agora.AddDays(1);

        casamento.Arquivar(primeiroArquivamento);
        casamento.Arquivar(Agora.AddDays(2));

        Assert.True(casamento.Arquivado);
        Assert.Equal(primeiroArquivamento, casamento.ArquivadoEm);
        Assert.Equal(primeiroArquivamento, casamento.AtualizadoEm);

        var restauracao = Agora.AddDays(3);
        casamento.Restaurar(restauracao);
        casamento.Restaurar(Agora.AddDays(4));

        Assert.False(casamento.Arquivado);
        Assert.Null(casamento.ArquivadoEm);
        Assert.Equal(restauracao, casamento.AtualizadoEm);
        Assert.Equal("Ana Beatriz", casamento.NomePrimeiraPessoa);
    }

    [Theory]
    [InlineData("2027-05-15", "2027-05-15", 0, FaseCasamento.DiaDoCasamento)]
    [InlineData("2027-05-16", "2027-05-15", 1, FaseCasamento.SemanaDoCasamento)]
    [InlineData("2027-05-14", "2027-05-15", -1, FaseCasamento.Realizado)]
    [InlineData("2028-05-15", "2027-05-15", 366, FaseCasamento.Planejamento)]
    [InlineData("2028-03-01", "2028-02-28", 2, FaseCasamento.SemanaDoCasamento)]
    public void CalcularDiasEFase_DeveUsarDiasDeCalendario(string data, string hoje, int diasEsperados, FaseCasamento faseEsperada)
    {
        var casamento = CasamentoAssessorado.Criar(DadosValidos(data: DateOnly.Parse(data, System.Globalization.CultureInfo.InvariantCulture)), Agora);
        var diaAtual = DateOnly.Parse(hoje, System.Globalization.CultureInfo.InvariantCulture);

        Assert.Equal(diasEsperados, casamento.CalcularDiasRestantes(diaAtual));
        Assert.Equal(faseEsperada, casamento.CalcularFase(diaAtual));
    }

    [Fact]
    public void Arquivar_NaoDeveAlterarFase()
    {
        var casamento = CasamentoAssessorado.Criar(DadosValidos(data: new DateOnly(2027, 5, 15)), Agora);
        var hoje = new DateOnly(2027, 5, 10);
        var faseAntes = casamento.CalcularFase(hoje);

        casamento.Arquivar(Agora);

        Assert.Equal(faseAntes, casamento.CalcularFase(hoje));
    }
}
