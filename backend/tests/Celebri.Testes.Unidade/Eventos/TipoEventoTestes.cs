using Celebri.Dominio.Checklists;
using Celebri.Dominio.Cronogramas;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Organizacoes;

namespace Celebri.Testes.Unidade.Eventos;

public class TipoEventoTestes
{
    private static readonly DateTimeOffset Agora = new(2026, 10, 22, 15, 0, 0, TimeSpan.Zero);

    private static DadosEvento Dados(TipoEvento tipo, string? segundo) =>
        new("Helena", segundo, new DateOnly(2027, 5, 15), null, "Espaço Aurora", null, 100, null, null, tipo);

    [Theory]
    [InlineData(TipoEvento.Casamento, "Bruno")]
    [InlineData(TipoEvento.QuinzeAnos, null)]
    [InlineData(TipoEvento.Aniversario, "   ")]
    [InlineData(TipoEvento.Comemoracao, null)]
    [InlineData(TipoEvento.Comemoracao, " Família Souza ")]
    public void Criar_TipoComHomenageadosCoerentes_DeveGravarTipoENormalizarSegundoNome(TipoEvento tipo, string? segundo)
    {
        var evento = Evento.Criar(Dados(tipo, segundo), Agora);

        Assert.Equal(tipo, evento.Tipo);
        Assert.Equal(string.IsNullOrWhiteSpace(segundo) ? null : segundo.Trim(), evento.NomeSegundaPessoa);
    }

    [Theory]
    [InlineData(TipoEvento.QuinzeAnos)]
    [InlineData(TipoEvento.Aniversario)]
    public void Criar_TipoDeUmHomenageadoComSegundoNome_DeveLancarComCampo(TipoEvento tipo)
    {
        var excecao = Assert.Throws<RegraNegocioException>(() => Evento.Criar(Dados(tipo, "Pedro"), Agora));

        Assert.Equal(MensagensEvento.UmHomenageado, excecao.Message);
        Assert.Equal(Evento.CampoNomeSegundaPessoa, excecao.Campo);
    }

    [Fact]
    public void Criar_CasamentoSemSegundoNome_DeveLancarComCampo()
    {
        var excecao = Assert.Throws<RegraNegocioException>(() => Evento.Criar(Dados(TipoEvento.Casamento, null), Agora));

        Assert.Equal(MensagensEvento.SegundoNomeObrigatorio, excecao.Message);
        Assert.Equal(Evento.CampoNomeSegundaPessoa, excecao.Campo);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(5)]
    [InlineData(99)]
    public void Criar_TipoIndisponivel_DeveLancarTipoInvalido(int valor)
    {
        var excecao = Assert.Throws<RegraNegocioException>(() => Evento.Criar(Dados((TipoEvento)valor, null), Agora));

        Assert.Equal(MensagensEvento.TipoInvalido, excecao.Message);
        Assert.Equal(Evento.CampoTipo, excecao.Campo);
    }

    [Fact]
    public void Atualizar_TrocarParaAniversario_DeveTrocarTipoERemoverSegundoNome()
    {
        var evento = Evento.Criar(Dados(TipoEvento.Casamento, "Bruno"), Agora);

        evento.Atualizar(Dados(TipoEvento.Aniversario, null), Agora.AddMinutes(1));

        Assert.Equal(TipoEvento.Aniversario, evento.Tipo);
        Assert.Null(evento.NomeSegundaPessoa);
        Assert.Equal("Espaço Aurora", evento.LocalCerimonia);
    }

    [Fact]
    public void FormatarNomes_DeveOmitirOConectorComUmHomenageado()
    {
        Assert.Equal("Helena & Bruno", Evento.Criar(Dados(TipoEvento.Casamento, "Bruno"), Agora).FormatarNomes());
        Assert.Equal("Helena", Evento.Criar(Dados(TipoEvento.Aniversario, null), Agora).FormatarNomes());
    }

    [Fact]
    public void RegrasTipoEvento_DevemListarSoOsQuatroTiposSociais()
    {
        Assert.Equal([TipoEvento.Casamento, TipoEvento.QuinzeAnos, TipoEvento.Aniversario, TipoEvento.Comemoracao], RegrasTipoEvento.Disponiveis);
        Assert.Equal(Enum.GetValues<TipoEvento>(), RegrasTipoEvento.Disponiveis);
        Assert.True(RegrasTipoEvento.ExigeSegundoNome(TipoEvento.Casamento));
        Assert.False(RegrasTipoEvento.ExigeSegundoNome(TipoEvento.Comemoracao));
        Assert.True(RegrasTipoEvento.AceitaSegundoNome(TipoEvento.Comemoracao));
        Assert.False(RegrasTipoEvento.AceitaSegundoNome(TipoEvento.QuinzeAnos));
    }

    [Fact]
    public void ChecklistsSugeridos_DevemCobrirCadaTipoComNomesUnicosEItensValidos()
    {
        Assert.Equal(RegrasTipoEvento.Disponiveis, ModeloChecklistSugerido.Conteudos.Select(conteudo => conteudo.Tipo));
        Assert.Equal(ModeloChecklistSugerido.Conteudos.Count, ModeloChecklistSugerido.Conteudos.Select(conteudo => conteudo.Nome).Distinct().Count());

        foreach (var conteudo in ModeloChecklistSugerido.Conteudos)
        {
            var modelo = ModeloChecklistSugerido.Criar(conteudo.Tipo, Agora);

            Assert.True(modelo.Sugerido);
            Assert.Equal(conteudo.Tipo, modelo.TipoEvento);
            Assert.Equal(conteudo.Itens.Count, modelo.Itens.Count);
            Assert.Equal(modelo.Itens.Count, modelo.Itens.Select(item => item.Titulo).Distinct().Count());
            Assert.InRange(modelo.Itens.Count, 10, ModeloChecklist.LimiteItens);
        }
    }

    [Fact]
    public void ChecklistsSugeridos_SoCasamentoDeveFalarDeNoivosOuPadrinhos()
    {
        foreach (var conteudo in ModeloChecklistSugerido.Conteudos.Where(conteudo => conteudo.Tipo != TipoEvento.Casamento))
        {
            var textos = conteudo.Itens.Select(item => $"{item.Titulo} {item.Descricao}").Append(conteudo.Descricao);
            Assert.DoesNotContain(textos, texto => TextoDeCasamento(texto));
        }

        Assert.Contains(ModeloChecklistSugerido.Casamento.Itens, item => TextoDeCasamento(item.Titulo!));
    }

    [Fact]
    public void CronogramasSugeridos_DevemCobrirCadaTipoSemConflitoEComMomentoPrincipal()
    {
        Assert.Equal(RegrasTipoEvento.Disponiveis, ModeloCronogramaSugerido.Conteudos.Select(conteudo => conteudo.Tipo));
        Assert.Equal(ModeloCronogramaSugerido.Conteudos.Count, ModeloCronogramaSugerido.Conteudos.Select(conteudo => conteudo.Nome).Distinct().Count());

        foreach (var conteudo in ModeloCronogramaSugerido.Conteudos)
        {
            var modelo = ModeloCronogramaSugerido.Criar(conteudo.Tipo, Agora);
            var evento = Evento.Criar(
                new DadosEvento("Helena", conteudo.Tipo == TipoEvento.Casamento ? "Bruno" : null, new DateOnly(2027, 5, 15), modelo.HorarioReferencia, "Local", "Outro", null, null, null, conteudo.Tipo),
                Agora);
            var itens = modelo.ItensOrdenados()
                .Select(item => ItemCronograma.Criar(evento.Id, item.ParaDadosItem(evento, modelo.HorarioReferencia, null), null, Agora))
                .ToList();

            Assert.Equal(conteudo.Tipo, modelo.TipoEvento);
            Assert.Equal(conteudo.HorarioReferencia, modelo.HorarioReferencia);
            Assert.Contains(modelo.Itens, item => item.MinutosDesdeCerimonia == 0);
            Assert.Empty(DetectorConflitosCronograma.Detectar(itens));

            if (conteudo.Tipo != TipoEvento.Casamento)
            {
                Assert.DoesNotContain(modelo.Itens, item => TextoDeCasamento($"{item.Atividade} {item.Instrucoes}"));
            }
        }
    }

    [Fact]
    public void Organizacao_MarcadoresPorTipo_DevemSerRegistradosUmaVez()
    {
        var organizacao = Organizacao.Criar("Assessoria", Agora);

        Assert.False(organizacao.PossuiModelosChecklistPorTipo);
        Assert.False(organizacao.PossuiModelosCronogramaPorTipo);

        organizacao.RegistrarModelosChecklistPorTipo(Agora);
        organizacao.RegistrarModelosChecklistPorTipo(Agora.AddDays(1));
        organizacao.RegistrarModelosCronogramaPorTipo(Agora);

        Assert.Equal(Agora, organizacao.ModelosChecklistPorTipoEm);
        Assert.Equal(Agora, organizacao.ModelosCronogramaPorTipoEm);
    }

    private static bool TextoDeCasamento(string texto)
    {
        return new[] { "noiv", "padrinh", "madrinh", "casamento", "casal", "aliança" }
            .Any(termo => texto.Contains(termo, StringComparison.OrdinalIgnoreCase));
    }
}
