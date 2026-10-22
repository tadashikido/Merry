using Celebri.Dominio.Convidados;
using Celebri.Dominio.Excecoes;

namespace Celebri.Testes.Unidade.Convidados;

public class ConviteTestes
{
    private static readonly DateTimeOffset Agora = new(2027, 3, 10, 12, 0, 0, TimeSpan.Zero);
    private static readonly Guid CasamentoId = Guid.NewGuid();

    public static DadosConvidado Pessoa(
        string? nome = "Carla Souza",
        string? telefone = null,
        string? email = null,
        FaixaEtaria faixaEtaria = FaixaEtaria.Adulto,
        RespostaRsvp resposta = RespostaRsvp.Pendente,
        Guid? id = null)
    {
        return new DadosConvidado(id, nome, telefone, email, faixaEtaria, resposta);
    }

    public static DadosConvite Dados(string? nome = "Família Souza", string? grupo = "Família da noiva", int limite = 1, params DadosConvidado[] pessoas)
    {
        return new DadosConvite(nome, grupo, limite, pessoas.Length > 0 ? pessoas : [Pessoa()]);
    }

    [Fact]
    public void Criar_DeveNormalizarEAplicarPadroes()
    {
        var convite = Convite.Criar(
            CasamentoId,
            Dados("  Família   Souza ", "  Família da   noiva ", 2, Pessoa(" Carla  Souza ", "(11) 98765-4321", " Carla@Exemplo.COM "), Pessoa("Pedro", faixaEtaria: FaixaEtaria.Crianca)),
            Agora);

        Assert.NotEqual(Guid.Empty, convite.Id);
        Assert.Equal(Guid.Empty, convite.OrganizacaoId);
        Assert.Equal(CasamentoId, convite.CasamentoId);
        Assert.Equal("Família Souza", convite.Nome);
        Assert.Equal("Família da noiva", convite.Grupo);
        Assert.Equal(2, convite.LimiteAcompanhantes);
        Assert.Equal(StatusEnvioConvite.NaoEnviado, convite.StatusEnvio);
        Assert.Equal(Agora, convite.CriadoEm);
        Assert.Equal(Agora, convite.AtualizadoEm);

        var carla = convite.ConvidadosOrdenados()[0];
        Assert.Equal("Carla Souza", carla.Nome);
        Assert.Equal("11987654321", carla.Telefone);
        Assert.Equal("carla@exemplo.com", carla.Email);
        Assert.Equal(RespostaRsvp.Pendente, carla.Resposta);
        Assert.Equal(CasamentoId, carla.CasamentoId);
        Assert.Equal(convite.Id, carla.ConviteId);
        Assert.Equal(0, carla.Ordem);
        Assert.Equal(FaixaEtaria.Crianca, convite.ConvidadosOrdenados()[1].FaixaEtaria);
        Assert.Equal(1, convite.ConvidadosOrdenados()[1].Ordem);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Criar_SemNome_DeveUsarNomeDoPrimeiroConvidado(string? nome)
    {
        var convite = Convite.Criar(CasamentoId, Dados(nome, null, 0, Pessoa("  Ana   Lima "), Pessoa("Bia")), Agora);

        Assert.Equal("Ana Lima", convite.Nome);
        Assert.Null(convite.Grupo);
    }

    [Fact]
    public void Criar_CasamentoVazio_DeveLancarArgumentException()
    {
        Assert.Throws<ArgumentException>(() => Convite.Criar(Guid.Empty, Dados(), Agora));
    }

    [Fact]
    public void Criar_SemConvidados_DeveLancarRegraNegocio()
    {
        var excecao = Assert.Throws<RegraNegocioException>(() => Convite.Criar(CasamentoId, new DadosConvite("X", null, 0, []), Agora));

        Assert.Equal(MensagensConvidados.QuantidadeConvidados, excecao.Message);
    }

    [Fact]
    public void Criar_ComMaisDe30Convidados_DeveLancarRegraNegocio()
    {
        var pessoas = Enumerable.Range(1, Convite.ConvidadosMaximo + 1).Select(indice => Pessoa($"Pessoa {indice}")).ToArray();

        Assert.Throws<RegraNegocioException>(() => Convite.Criar(CasamentoId, Dados("Grande", null, 0, pessoas), Agora));
    }

    [Fact]
    public void Criar_Com30Convidados_DevePermitir()
    {
        var pessoas = Enumerable.Range(1, Convite.ConvidadosMaximo).Select(indice => Pessoa($"Pessoa {indice}")).ToArray();

        var convite = Convite.Criar(CasamentoId, Dados("Grande", null, 0, pessoas), Agora);

        Assert.Equal(30, convite.Convidados.Count);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(11)]
    public void Criar_LimiteAcompanhantesForaDaFaixa_DeveLancarRegraNegocio(int limite)
    {
        var excecao = Assert.Throws<RegraNegocioException>(() => Convite.Criar(CasamentoId, Dados(limite: limite), Agora));

        Assert.Equal(MensagensConvidados.LimiteAcompanhantesForaDaFaixa, excecao.Message);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(10)]
    public void Criar_LimiteAcompanhantesNaBorda_DevePermitir(int limite)
    {
        Assert.Equal(limite, Convite.Criar(CasamentoId, Dados(limite: limite), Agora).LimiteAcompanhantes);
    }

    [Fact]
    public void Criar_GrupoLongo_DeveLancarRegraNegocio()
    {
        var excecao = Assert.Throws<RegraNegocioException>(() => Convite.Criar(CasamentoId, Dados(grupo: new string('g', 61)), Agora));

        Assert.Equal(MensagensConvidados.TamanhoGrupo, excecao.Message);
    }

    [Theory]
    [InlineData("A")]
    [InlineData(null)]
    [InlineData("  ")]
    public void Criar_NomeDeConvidadoInvalido_DeveLancarRegraNegocio(string? nome)
    {
        Assert.Throws<RegraNegocioException>(() => Convite.Criar(CasamentoId, Dados(pessoas: Pessoa(nome)), Agora));
    }

    [Fact]
    public void Criar_NomeDeConvidadoLongo_DeveLancarRegraNegocio()
    {
        Assert.Throws<RegraNegocioException>(() => Convite.Criar(CasamentoId, Dados(pessoas: Pessoa(new string('a', 121))), Agora));
    }

    [Theory]
    [InlineData("123", MensagensConvidados.TelefoneInvalido)]
    [InlineData("11 9876-abcd", MensagensConvidados.TelefoneInvalido)]
    public void Criar_TelefoneInvalido_DeveLancarRegraNegocio(string telefone, string mensagem)
    {
        var excecao = Assert.Throws<RegraNegocioException>(() => Convite.Criar(CasamentoId, Dados(pessoas: Pessoa(telefone: telefone)), Agora));

        Assert.Equal(mensagem, excecao.Message);
    }

    [Fact]
    public void Criar_EmailInvalido_DeveLancarRegraNegocio()
    {
        var excecao = Assert.Throws<RegraNegocioException>(() => Convite.Criar(CasamentoId, Dados(pessoas: Pessoa(email: "ana@")), Agora));

        Assert.Equal(MensagensConvidados.EmailInvalido, excecao.Message);
    }

    [Fact]
    public void Criar_EnumsIndefinidos_DevemLancarRegraNegocio()
    {
        Assert.Throws<RegraNegocioException>(() => Convite.Criar(CasamentoId, Dados(pessoas: Pessoa(faixaEtaria: (FaixaEtaria)9)), Agora));
        Assert.Throws<RegraNegocioException>(() => Convite.Criar(CasamentoId, Dados(pessoas: Pessoa(resposta: (RespostaRsvp)9)), Agora));
    }

    [Fact]
    public void Criar_ComIdDeConvidadoInformado_DeveLancarRegraNegocio()
    {
        var excecao = Assert.Throws<RegraNegocioException>(() => Convite.Criar(CasamentoId, Dados(pessoas: Pessoa(id: Guid.NewGuid())), Agora));

        Assert.Equal(MensagensConvidados.ConvidadoDeOutroConvite, excecao.Message);
    }

    [Fact]
    public void Atualizar_DeveSincronizarPorIdEOrdem()
    {
        var convite = Convite.Criar(CasamentoId, Dados("Lima", null, 0, Pessoa("Ana"), Pessoa("Bruno"), Pessoa("Caio")), Agora);
        var ana = convite.ConvidadosOrdenados()[0];
        var bruno = convite.ConvidadosOrdenados()[1];
        var caio = convite.ConvidadosOrdenados()[2];
        var depois = Agora.AddHours(1);

        convite.Atualizar(
            Dados("Lima", "Amigos", 3, Pessoa("Caio Lima", resposta: RespostaRsvp.Confirmado, id: caio.Id), Pessoa("Duda", faixaEtaria: FaixaEtaria.Crianca), Pessoa("Ana", id: ana.Id)),
            depois);

        var ordenados = convite.ConvidadosOrdenados();
        Assert.Equal(["Caio Lima", "Duda", "Ana"], ordenados.Select(convidado => convidado.Nome));
        Assert.Same(caio, ordenados[0]);
        Assert.Same(ana, ordenados[2]);
        Assert.DoesNotContain(bruno, convite.Convidados);
        Assert.Equal(RespostaRsvp.Confirmado, caio.Resposta);
        Assert.Equal(depois, caio.AtualizadoEm);
        Assert.Equal(Agora, caio.CriadoEm);
        Assert.Equal(depois, ordenados[1].CriadoEm);
        Assert.Equal("Amigos", convite.Grupo);
        Assert.Equal(3, convite.LimiteAcompanhantes);
        Assert.Equal(depois, convite.AtualizadoEm);
        Assert.Equal(Agora, convite.CriadoEm);
    }

    [Fact]
    public void Atualizar_ComIdDeOutroConvite_DeveLancarENaoAlterar()
    {
        var convite = Convite.Criar(CasamentoId, Dados("Lima", null, 0, Pessoa("Ana")), Agora);
        var outro = Convite.Criar(CasamentoId, Dados("Outro", null, 0, Pessoa("Rita")), Agora);

        var excecao = Assert.Throws<RegraNegocioException>(() =>
            convite.Atualizar(Dados("Alterado", null, 0, Pessoa("Rita", id: outro.Convidados[0].Id)), Agora.AddHours(1)));

        Assert.Equal(MensagensConvidados.ConvidadoDeOutroConvite, excecao.Message);
        Assert.Equal("Lima", convite.Nome);
        Assert.Equal("Ana", Assert.Single(convite.Convidados).Nome);
    }

    [Fact]
    public void Atualizar_ComIdRepetido_DeveLancar()
    {
        var convite = Convite.Criar(CasamentoId, Dados("Lima", null, 0, Pessoa("Ana")), Agora);
        var id = convite.Convidados[0].Id;

        var excecao = Assert.Throws<RegraNegocioException>(() =>
            convite.Atualizar(Dados("Lima", null, 0, Pessoa("Ana", id: id), Pessoa("Ana 2", id: id)), Agora));

        Assert.Equal(MensagensConvidados.ConvidadoRepetido, excecao.Message);
    }

    [Fact]
    public void Atualizar_ComConvidadoInvalidoNoMeio_NaoDeveAlterarNada()
    {
        var convite = Convite.Criar(CasamentoId, Dados("Lima", "Amigos", 0, Pessoa("Ana"), Pessoa("Bruno")), Agora);

        Assert.Throws<RegraNegocioException>(() =>
            convite.Atualizar(Dados("Novo nome", "Outro", 1, Pessoa("Ana alterada", id: convite.Convidados[0].Id), Pessoa("X")), Agora.AddHours(1)));

        Assert.Equal("Lima", convite.Nome);
        Assert.Equal("Amigos", convite.Grupo);
        Assert.Equal(["Ana", "Bruno"], convite.ConvidadosOrdenados().Select(convidado => convidado.Nome));
    }

    [Fact]
    public void Atualizar_SemConvidados_DeveLancar()
    {
        var convite = Convite.Criar(CasamentoId, Dados(), Agora);

        Assert.Throws<RegraNegocioException>(() => convite.Atualizar(new DadosConvite("X", null, 0, []), Agora));
        Assert.Single(convite.Convidados);
    }
}
