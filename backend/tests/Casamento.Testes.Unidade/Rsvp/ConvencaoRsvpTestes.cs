using Casamento.Aplicacao.Convidados;
using Casamento.Dominio.Convidados;
using Casamento.Testes.Unidade.Convidados;

namespace Casamento.Testes.Unidade.Rsvp;

public class ConvencaoRsvpTestes
{
    private static string DiretorioFontes()
    {
        var diretorio = new DirectoryInfo(AppContext.BaseDirectory);

        while (diretorio is not null && !Directory.Exists(Path.Combine(diretorio.FullName, "src", "Casamento.Aplicacao")))
        {
            diretorio = diretorio.Parent;
        }

        return Path.Combine(diretorio?.FullName ?? throw new DirectoryNotFoundException("Pasta backend/src não encontrada."), "src");
    }

    private static IEnumerable<(string Arquivo, string Conteudo)> Fontes()
    {
        return Directory.EnumerateFiles(DiretorioFontes(), "*.cs", SearchOption.AllDirectories)
            .Where(arquivo => !arquivo.Contains($"{Path.DirectorySeparatorChar}obj{Path.DirectorySeparatorChar}", StringComparison.Ordinal))
            .Where(arquivo => !arquivo.Contains($"{Path.DirectorySeparatorChar}bin{Path.DirectorySeparatorChar}", StringComparison.Ordinal))
            .Select(arquivo => (arquivo, File.ReadAllText(arquivo)));
    }

    [Fact]
    public void EscopoRsvp_SoPodeSerEstabelecidoPeloServicoPublicoDeRsvp()
    {
        var chamadores = Fontes()
            .Where(fonte => fonte.Conteudo.Contains(".Estabelecer(", StringComparison.Ordinal))
            .Select(fonte => Path.GetFileName(fonte.Arquivo))
            .ToList();

        Assert.Equal(["RsvpPublicoService.cs"], chamadores);
    }

    [Fact]
    public void CodigoDeProducao_NaoDeveIgnorarFiltrosDeIsolamento()
    {
        var violacoes = Fontes()
            .Where(fonte => fonte.Conteudo.Contains("IgnoreQueryFilters", StringComparison.Ordinal)
                || fonte.Conteudo.Contains("FromSql", StringComparison.Ordinal))
            .Select(fonte => Path.GetFileName(fonte.Arquivo))
            .ToList();

        Assert.Empty(violacoes);
    }

    [Fact]
    public void Totais_AcompanhantesPermitidos_DevemSerVagasRestantes()
    {
        var convite = Convite.Criar(Guid.NewGuid(), ConviteTestes.Dados("Família", null, 2, ConviteTestes.Pessoa("Célia")), DateTimeOffset.UnixEpoch);
        convite.RegistrarRespostaRsvp(
            [new RespostaPessoaRsvp(convite.Convidados[0].Id, RespostaRsvp.Confirmado)],
            [new DadosAcompanhanteRsvp(null, "Pedro", FaixaEtaria.Adulto)],
            DateTimeOffset.UnixEpoch);
        var semAcompanhante = Convite.Criar(Guid.NewGuid(), ConviteTestes.Dados("Outro", null, 3, ConviteTestes.Pessoa("Rui")), DateTimeOffset.UnixEpoch);

        var totais = CalculadoraTotaisConvidados.Calcular(CalculadoraTotaisConvidados.Resumir([convite, semAcompanhante]));

        Assert.Equal(4, totais.AcompanhantesPermitidos);
        Assert.Equal(3, totais.Pessoas);
        Assert.Equal(2, totais.Confirmados.Total);
    }

    [Fact]
    public void ConviteDto_DeveExporAcompanhanteERespondidoEm()
    {
        var convite = Convite.Criar(Guid.NewGuid(), ConviteTestes.Dados("Família", null, 1, ConviteTestes.Pessoa("Célia")), DateTimeOffset.UnixEpoch);
        convite.RegistrarRespostaRsvp(
            [new RespostaPessoaRsvp(convite.Convidados[0].Id, RespostaRsvp.Confirmado)],
            [new DadosAcompanhanteRsvp(null, "Pedro", FaixaEtaria.Adulto)],
            DateTimeOffset.UnixEpoch.AddDays(1));

        var dto = ConviteService.ParaDto(convite);

        Assert.Equal(DateTimeOffset.UnixEpoch.AddDays(1), dto.RespondidoEm);
        Assert.Equal([false, true], dto.Convidados.Select(pessoa => pessoa.Acompanhante));
        Assert.Equal("Visualizado", dto.StatusEnvio);
    }
}
