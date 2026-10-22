using System.ComponentModel.DataAnnotations;
using Celebri.Aplicacao.Eventos;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Excecoes;

namespace Celebri.Testes.Unidade.Eventos;

public class SalvarEventoRequestTestes
{
    private static SalvarEventoRequest Valido()
    {
        return new SalvarEventoRequest("Ana", "Bruno", new DateOnly(2027, 5, 15), "16:30", null, null, null, null, Tipo: TipoEvento.Casamento);
    }

    private static Dictionary<string, string> ValidarRegrasCompostas(SalvarEventoRequest request)
    {
        return request.Validate(new ValidationContext(request))
            .SelectMany(resultado => resultado.MemberNames.Select(membro => (membro, resultado.ErrorMessage ?? string.Empty)))
            .ToDictionary(par => par.membro, par => par.Item2);
    }

    [Fact]
    public void RequestValido_NaoDeveTerErrosCompostos()
    {
        Assert.Empty(ValidarRegrasCompostas(Valido()));
    }

    [Fact]
    public void NomesComUmCaractereAposTrim_DevemGerarErroDeTamanho()
    {
        var erros = ValidarRegrasCompostas(Valido() with { NomePrimeiraPessoa = " a ", NomeSegundaPessoa = "  b" });

        Assert.Equal(MensagensEvento.TamanhoNome, erros[nameof(SalvarEventoRequest.NomePrimeiraPessoa)]);
        Assert.Equal(MensagensEvento.TamanhoNome, erros[nameof(SalvarEventoRequest.NomeSegundaPessoa)]);
    }

    [Fact]
    public void NomesVazios_NaoGeramErroComposto_QuandoOTipoAceitaUmHomenageado()
    {
        Assert.Empty(ValidarRegrasCompostas(Valido() with { NomePrimeiraPessoa = "", NomeSegundaPessoa = "   ", Tipo = TipoEvento.Comemoracao }));
    }

    [Fact]
    public void Casamento_SegundoNomeVazio_DeveGerarErroNoCampo()
    {
        var erros = ValidarRegrasCompostas(Valido() with { NomeSegundaPessoa = "   " });

        Assert.Equal(MensagensEvento.SegundoNomeObrigatorio, erros[nameof(SalvarEventoRequest.NomeSegundaPessoa)]);
    }

    [Theory]
    [InlineData(TipoEvento.QuinzeAnos)]
    [InlineData(TipoEvento.Aniversario)]
    public void TipoDeUmHomenageado_ComSegundoNome_DeveGerarErroNoCampo(TipoEvento tipo)
    {
        var erros = ValidarRegrasCompostas(Valido() with { Tipo = tipo });

        Assert.Equal(MensagensEvento.UmHomenageado, erros[nameof(SalvarEventoRequest.NomeSegundaPessoa)]);
    }

    [Fact]
    public void TipoForaDosDisponiveis_DeveGerarErroNoTipo()
    {
        var erros = ValidarRegrasCompostas(Valido() with { Tipo = (TipoEvento)99 });

        Assert.Equal(MensagensEvento.TipoInvalido, erros[nameof(SalvarEventoRequest.Tipo)]);
    }

    [Fact]
    public void TipoAusente_DeveFalharNaConversaoParaDados()
    {
        var request = Valido() with { Tipo = null };

        Assert.Empty(ValidarRegrasCompostas(request with { NomeSegundaPessoa = null }));
        var excecao = Assert.Throws<RegraNegocioException>(() => request.ParaDados());
        Assert.Equal(MensagensEvento.TipoObrigatorio, excecao.Message);
    }

    [Fact]
    public void ParaDados_DeveLevarOTipoEOSegundoNomeNulo()
    {
        var dados = (Valido() with { Tipo = TipoEvento.Aniversario, NomeSegundaPessoa = null }).ParaDados();

        Assert.Equal(TipoEvento.Aniversario, dados.Tipo);
        Assert.Null(dados.NomeSegundaPessoa);
    }

    [Theory]
    [InlineData(1999, 12, 31)]
    [InlineData(2101, 1, 1)]
    public void DataForaDaFaixa_DeveGerarErro(int ano, int mes, int dia)
    {
        var erros = ValidarRegrasCompostas(Valido() with { Data = new DateOnly(ano, mes, dia) });

        Assert.Equal(MensagensEvento.DataForaDaFaixa, erros[nameof(SalvarEventoRequest.Data)]);
    }

    [Theory]
    [InlineData("00:00", true)]
    [InlineData("09:05", true)]
    [InlineData("23:59", true)]
    [InlineData("9:05", false)]
    [InlineData("16h30", false)]
    [InlineData("16:30:00", false)]
    [InlineData("24:00", false)]
    [InlineData("16:60", false)]
    public void PadraoHorario_DeveAceitarSomente24hComDoisDigitos(string horario, bool valido)
    {
        Assert.Equal(valido, System.Text.RegularExpressions.Regex.IsMatch(horario, SalvarEventoRequest.PadraoHorario));
    }

    [Fact]
    public void ParaDados_DeveConverterHorarioEPreservarCampos()
    {
        var dados = (Valido() with { LocalCerimonia = "Capela", ConvidadosEstimados = 80 }).ParaDados();

        Assert.Equal(new TimeOnly(16, 30), dados.Horario);
        Assert.Equal(new DateOnly(2027, 5, 15), dados.Data);
        Assert.Equal("Capela", dados.LocalCerimonia);
        Assert.Equal(80, dados.ConvidadosEstimados);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    public void InterpretarHorario_Vazio_DeveRetornarNulo(string? horario)
    {
        Assert.Null(SalvarEventoRequest.InterpretarHorario(horario));
    }

    [Fact]
    public void InterpretarHorario_ForaDoFormato_DeveLancarRegraNegocio()
    {
        var excecao = Assert.Throws<RegraNegocioException>(() => SalvarEventoRequest.InterpretarHorario("16h30"));

        Assert.Equal(MensagensEvento.HorarioInvalido, excecao.Message);
    }

    [Fact]
    public void ParaDados_SemData_DeveGerarDataQueODominioRejeita()
    {
        var dados = (Valido() with { Data = null }).ParaDados();

        Assert.Throws<RegraNegocioException>(() => Evento.Criar(dados, DateTimeOffset.UtcNow));
    }
}
