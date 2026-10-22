using Celebri.Dominio.Eventos;
using Celebri.Dominio.Excecoes;

namespace Celebri.Testes.Unidade.Eventos;

public class EventoTestes
{
    private static readonly DateTimeOffset Agora = new(2026, 9, 28, 15, 0, 0, TimeSpan.Zero);

    public static DadosEvento DadosValidos(
        string nomePrimeiraPessoa = "Ana Beatriz",
        string nomeSegundaPessoa = "Bruno",
        DateOnly? data = null,
        TimeOnly? horario = null,
        string? localCerimonia = "Capela São José",
        string? localRecepcao = null,
        int? convidadosEstimados = 150,
        string? observacoes = null)
    {
        return new DadosEvento(
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
        var evento = Evento.Criar(
            DadosValidos(
                nomePrimeiraPessoa: "  Ana Beatriz  ",
                nomeSegundaPessoa: " Bruno ",
                horario: new TimeOnly(16, 30, 45),
                localCerimonia: "  Capela  ",
                localRecepcao: "   ",
                observacoes: ""),
            Agora);

        Assert.NotEqual(Guid.Empty, evento.Id);
        Assert.Equal(Guid.Empty, evento.OrganizacaoId);
        Assert.Equal("Ana Beatriz", evento.NomePrimeiraPessoa);
        Assert.Equal("Bruno", evento.NomeSegundaPessoa);
        Assert.Equal(new TimeOnly(16, 30), evento.Horario);
        Assert.Equal("Capela", evento.LocalCerimonia);
        Assert.Null(evento.LocalRecepcao);
        Assert.Null(evento.Observacoes);
        Assert.Equal(Agora, evento.CriadoEm);
        Assert.Equal(Agora, evento.AtualizadoEm);
        Assert.False(evento.Arquivado);
    }

    [Theory]
    [InlineData("", "Bruno", MensagensEvento.NomeObrigatorio)]
    [InlineData("   ", "Bruno", MensagensEvento.NomeObrigatorio)]
    [InlineData("Ana", "", MensagensEvento.NomeObrigatorio)]
    [InlineData("A", "Bruno", MensagensEvento.TamanhoNome)]
    [InlineData("Ana", " B ", MensagensEvento.TamanhoNome)]
    public void Criar_NomesInvalidos_DeveLancarRegraNegocio(string primeiro, string segundo, string mensagem)
    {
        var excecao = Assert.Throws<RegraNegocioException>(() =>
            Evento.Criar(DadosValidos(nomePrimeiraPessoa: primeiro, nomeSegundaPessoa: segundo), Agora));

        Assert.Equal(mensagem, excecao.Message);
    }

    [Fact]
    public void Criar_NomeCom81Caracteres_DeveLancarRegraNegocio()
    {
        var excecao = Assert.Throws<RegraNegocioException>(() =>
            Evento.Criar(DadosValidos(nomePrimeiraPessoa: new string('a', 81)), Agora));

        Assert.Equal(MensagensEvento.TamanhoNome, excecao.Message);
    }

    [Fact]
    public void Criar_NomeCom80Caracteres_DeveAceitar()
    {
        var evento = Evento.Criar(DadosValidos(nomePrimeiraPessoa: new string('a', 80)), Agora);

        Assert.Equal(80, evento.NomePrimeiraPessoa.Length);
    }

    [Theory]
    [InlineData(1999, 12, 31)]
    [InlineData(2101, 1, 1)]
    [InlineData(1, 1, 1)]
    public void Criar_DataForaDaFaixa_DeveLancarRegraNegocio(int ano, int mes, int dia)
    {
        var excecao = Assert.Throws<RegraNegocioException>(() =>
            Evento.Criar(DadosValidos(data: new DateOnly(ano, mes, dia)), Agora));

        Assert.Equal(MensagensEvento.DataForaDaFaixa, excecao.Message);
    }

    [Theory]
    [InlineData(2000, 1, 1)]
    [InlineData(2100, 12, 31)]
    [InlineData(2010, 6, 12)]
    public void Criar_DataNosLimitesOuPassada_DeveAceitar(int ano, int mes, int dia)
    {
        var evento = Evento.Criar(DadosValidos(data: new DateOnly(ano, mes, dia)), Agora);

        Assert.Equal(new DateOnly(ano, mes, dia), evento.Data);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    [InlineData(5001)]
    public void Criar_ConvidadosForaDaFaixa_DeveLancarRegraNegocio(int convidados)
    {
        var excecao = Assert.Throws<RegraNegocioException>(() =>
            Evento.Criar(DadosValidos(convidadosEstimados: convidados), Agora));

        Assert.Equal(MensagensEvento.ConvidadosForaDaFaixa, excecao.Message);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(5000)]
    public void Criar_ConvidadosNosLimites_DeveAceitar(int convidados)
    {
        var evento = Evento.Criar(DadosValidos(convidadosEstimados: convidados), Agora);

        Assert.Equal(convidados, evento.ConvidadosEstimados);
    }

    [Fact]
    public void Criar_LocalCom201Caracteres_DeveLancarRegraNegocio()
    {
        var excecao = Assert.Throws<RegraNegocioException>(() =>
            Evento.Criar(DadosValidos(localRecepcao: new string('x', 201)), Agora));

        Assert.Equal(MensagensEvento.TamanhoLocal, excecao.Message);
    }

    [Fact]
    public void Criar_ObservacoesCom2001Caracteres_DeveLancarRegraNegocio()
    {
        var excecao = Assert.Throws<RegraNegocioException>(() =>
            Evento.Criar(DadosValidos(observacoes: new string('x', 2001)), Agora));

        Assert.Equal(MensagensEvento.TamanhoObservacoes, excecao.Message);
    }

    [Fact]
    public void Criar_DadosNulos_DeveLancarArgumentNull()
    {
        Assert.Throws<ArgumentNullException>(() => Evento.Criar(null!, Agora));
    }

    [Fact]
    public void Atualizar_EventoAtivo_DeveAplicarDadosEAtualizarInstante()
    {
        var evento = Evento.Criar(DadosValidos(), Agora);
        var depois = Agora.AddHours(2);

        evento.Atualizar(DadosValidos(nomeSegundaPessoa: "Bruna", data: new DateOnly(2027, 6, 1), convidadosEstimados: null), depois);

        Assert.Equal("Bruna", evento.NomeSegundaPessoa);
        Assert.Equal(new DateOnly(2027, 6, 1), evento.Data);
        Assert.Null(evento.ConvidadosEstimados);
        Assert.Equal(Agora, evento.CriadoEm);
        Assert.Equal(depois, evento.AtualizadoEm);
    }

    [Fact]
    public void Atualizar_DadosInvalidos_NaoDeveAlterarNada()
    {
        var evento = Evento.Criar(DadosValidos(), Agora);

        Assert.Throws<RegraNegocioException>(() => evento.Atualizar(DadosValidos(nomeSegundaPessoa: "Novo", convidadosEstimados: 0), Agora.AddHours(1)));

        Assert.Equal("Bruno", evento.NomeSegundaPessoa);
        Assert.Equal(Agora, evento.AtualizadoEm);
    }

    [Fact]
    public void Atualizar_EventoArquivado_DeveLancarRegraNegocio()
    {
        var evento = Evento.Criar(DadosValidos(), Agora);
        evento.Arquivar(Agora.AddDays(1));

        var excecao = Assert.Throws<RegraNegocioException>(() => evento.Atualizar(DadosValidos(nomeSegundaPessoa: "Outro"), Agora.AddDays(2)));

        Assert.Equal(MensagensEvento.ArquivadoSemEdicao, excecao.Message);
        Assert.Equal("Bruno", evento.NomeSegundaPessoa);
    }

    [Fact]
    public void ArquivarERestaurar_DevemSerIdempotentes()
    {
        var evento = Evento.Criar(DadosValidos(), Agora);
        var primeiroArquivamento = Agora.AddDays(1);

        evento.Arquivar(primeiroArquivamento);
        evento.Arquivar(Agora.AddDays(2));

        Assert.True(evento.Arquivado);
        Assert.Equal(primeiroArquivamento, evento.ArquivadoEm);
        Assert.Equal(primeiroArquivamento, evento.AtualizadoEm);

        var restauracao = Agora.AddDays(3);
        evento.Restaurar(restauracao);
        evento.Restaurar(Agora.AddDays(4));

        Assert.False(evento.Arquivado);
        Assert.Null(evento.ArquivadoEm);
        Assert.Equal(restauracao, evento.AtualizadoEm);
        Assert.Equal("Ana Beatriz", evento.NomePrimeiraPessoa);
    }

    [Theory]
    [InlineData("2027-05-15", "2027-05-15", 0, FaseEvento.DiaDoEvento)]
    [InlineData("2027-05-16", "2027-05-15", 1, FaseEvento.SemanaDoEvento)]
    [InlineData("2027-05-14", "2027-05-15", -1, FaseEvento.Realizado)]
    [InlineData("2028-05-15", "2027-05-15", 366, FaseEvento.Planejamento)]
    [InlineData("2028-03-01", "2028-02-28", 2, FaseEvento.SemanaDoEvento)]
    public void CalcularDiasEFase_DeveUsarDiasDeCalendario(string data, string hoje, int diasEsperados, FaseEvento faseEsperada)
    {
        var evento = Evento.Criar(DadosValidos(data: DateOnly.Parse(data, System.Globalization.CultureInfo.InvariantCulture)), Agora);
        var diaAtual = DateOnly.Parse(hoje, System.Globalization.CultureInfo.InvariantCulture);

        Assert.Equal(diasEsperados, evento.CalcularDiasRestantes(diaAtual));
        Assert.Equal(faseEsperada, evento.CalcularFase(diaAtual));
    }

    [Fact]
    public void Arquivar_NaoDeveAlterarFase()
    {
        var evento = Evento.Criar(DadosValidos(data: new DateOnly(2027, 5, 15)), Agora);
        var hoje = new DateOnly(2027, 5, 10);
        var faseAntes = evento.CalcularFase(hoje);

        evento.Arquivar(Agora);

        Assert.Equal(faseAntes, evento.CalcularFase(hoje));
    }
}
