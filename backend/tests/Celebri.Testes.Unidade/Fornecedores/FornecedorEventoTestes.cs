using System.ComponentModel.DataAnnotations;
using System.Text;
using Celebri.Aplicacao.Arquivos;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.FornecedoresEvento;
using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Fornecedores;

namespace Celebri.Testes.Unidade.Fornecedores;

public class FornecedorEventoTestes
{
    private static readonly DateTimeOffset Agora = new(2026, 9, 30, 12, 0, 0, TimeSpan.Zero);
    private static readonly Guid EventoId = Guid.NewGuid();
    private static readonly Guid FornecedorId = Guid.NewGuid();

    private static DadosFornecedorEvento Dados(
        StatusFornecedorEvento status = StatusFornecedorEvento.Cotacao,
        decimal? orcado = 18000m,
        decimal? contratado = null,
        string? servico = "  Jantar   para 200 ",
        string? notas = " Comissão de 10% ")
    {
        return new DadosFornecedorEvento(servico, orcado, contratado, status, notas);
    }

    [Fact]
    public void Criar_DeveNormalizarEManterIsolamentoParaOInterceptor()
    {
        var vinculo = FornecedorEvento.Criar(EventoId, FornecedorId, Dados(), Guid.NewGuid(), Agora);

        Assert.NotEqual(Guid.Empty, vinculo.Id);
        Assert.Equal(Guid.Empty, vinculo.OrganizacaoId);
        Assert.Equal(EventoId, vinculo.EventoId);
        Assert.Equal("Jantar para 200", vinculo.Servico);
        Assert.Equal("Comissão de 10%", vinculo.NotasInternas);
        Assert.Equal(StatusFornecedorEvento.Cotacao, vinculo.Status);
        Assert.False(vinculo.PossuiContrato);
        Assert.Equal(Agora, vinculo.CriadoEm);
        Assert.True(typeof(FornecedorEvento).GetProperty(nameof(FornecedorEvento.OrganizacaoId))!.SetMethod!.IsPrivate);
        Assert.True(typeof(FornecedorEvento).GetProperty(nameof(FornecedorEvento.EventoId))!.SetMethod!.IsPrivate);
    }

    [Fact]
    public void Criar_SemFornecedor_DeveLancarNoCampo()
    {
        var excecao = Assert.Throws<RegraNegocioException>(() => FornecedorEvento.Criar(EventoId, Guid.Empty, Dados(), null, Agora));

        Assert.Equal(FornecedorEvento.CampoFornecedorId, excecao.Campo);
    }

    [Fact]
    public void Contratado_SemValorContratado_DeveLancarNoCampoValorContratado()
    {
        var excecao = Assert.Throws<RegraNegocioException>(
            () => FornecedorEvento.Criar(EventoId, FornecedorId, Dados(StatusFornecedorEvento.Contratado), null, Agora));

        Assert.Equal(MensagensFornecedoresEvento.ContratadoSemValor, excecao.Message);
        Assert.Equal(FornecedorEvento.CampoValorContratado, excecao.Campo);
    }

    [Theory]
    [InlineData("-0.01")]
    [InlineData("100000000.00")]
    [InlineData("10.123")]
    public void ValorInvalido_DeveLancarNoCampoDoValor(string valor)
    {
        var decimalInvalido = decimal.Parse(valor, System.Globalization.CultureInfo.InvariantCulture);

        var orcado = Assert.Throws<RegraNegocioException>(
            () => FornecedorEvento.Criar(EventoId, FornecedorId, Dados(orcado: decimalInvalido), null, Agora));
        var contratado = Assert.Throws<RegraNegocioException>(
            () => FornecedorEvento.Criar(EventoId, FornecedorId, Dados(contratado: decimalInvalido), null, Agora));

        Assert.Equal(FornecedorEvento.CampoValorOrcado, orcado.Campo);
        Assert.Equal(FornecedorEvento.CampoValorContratado, contratado.Campo);
    }

    [Fact]
    public void Valores_NosLimites_DevemSerAceitos()
    {
        var vinculo = FornecedorEvento.Criar(
            EventoId,
            FornecedorId,
            Dados(StatusFornecedorEvento.Contratado, 0m, FornecedorEvento.ValorMaximo),
            null,
            Agora);

        Assert.Equal(0m, vinculo.ValorOrcado);
        Assert.Equal(99_999_999.99m, vinculo.ValorContratado);
    }

    [Fact]
    public void TextosLongos_DevemLancarNoCampo()
    {
        var servico = Assert.Throws<RegraNegocioException>(
            () => FornecedorEvento.Criar(EventoId, FornecedorId, Dados(servico: new string('a', 121)), null, Agora));
        var notas = Assert.Throws<RegraNegocioException>(
            () => FornecedorEvento.Criar(EventoId, FornecedorId, Dados(notas: new string('a', 2001)), null, Agora));
        var status = Assert.Throws<RegraNegocioException>(
            () => FornecedorEvento.Criar(EventoId, FornecedorId, Dados((StatusFornecedorEvento)99), null, Agora));

        Assert.Equal(FornecedorEvento.CampoServico, servico.Campo);
        Assert.Equal(FornecedorEvento.CampoNotasInternas, notas.Campo);
        Assert.Equal(FornecedorEvento.CampoStatus, status.Campo);
    }

    [Fact]
    public void CopiarPara_DeveLevarSoFornecedorServicoEOrcadoEmCotacao()
    {
        var origem = FornecedorEvento.Criar(
            EventoId,
            FornecedorId,
            Dados(StatusFornecedorEvento.Contratado, 18000m, 18500m),
            null,
            Agora);
        origem.AnexarContrato(Guid.NewGuid(), "contrato.pdf", 100, Agora);
        var destino = Guid.NewGuid();

        var copia = origem.CopiarPara(destino, null, Agora.AddDays(1));

        Assert.NotEqual(origem.Id, copia.Id);
        Assert.Equal(destino, copia.EventoId);
        Assert.Equal(FornecedorId, copia.FornecedorId);
        Assert.Equal("Jantar para 200", copia.Servico);
        Assert.Equal(18000m, copia.ValorOrcado);
        Assert.Null(copia.ValorContratado);
        Assert.Null(copia.NotasInternas);
        Assert.False(copia.PossuiContrato);
        Assert.Equal(StatusFornecedorEvento.Cotacao, copia.Status);
    }

    [Fact]
    public void AnexarERemoverContrato_DevemDevolverOArquivoAnterior()
    {
        var vinculo = FornecedorEvento.Criar(EventoId, FornecedorId, Dados(), null, Agora);
        var primeiro = Guid.NewGuid();
        var segundo = Guid.NewGuid();

        Assert.Null(vinculo.AnexarContrato(primeiro, "a.pdf", 10, Agora));
        Assert.Equal(primeiro, vinculo.AnexarContrato(segundo, "b.pdf", 20, Agora.AddMinutes(1)));
        Assert.Equal("b.pdf", vinculo.ContratoNomeArquivo);
        Assert.Equal(20, vinculo.ContratoTamanhoBytes);
        Assert.Equal(Agora.AddMinutes(1), vinculo.ContratoEnviadoEm);

        Assert.Equal(segundo, vinculo.RemoverContrato(Agora.AddMinutes(2)));
        Assert.False(vinculo.PossuiContrato);
        Assert.Null(vinculo.ContratoNomeArquivo);
        Assert.Null(vinculo.RemoverContrato(Agora.AddMinutes(3)));
        Assert.Throws<RegraNegocioException>(() => vinculo.AnexarContrato(Guid.NewGuid(), "c.pdf", 0, Agora));
    }

    [Fact]
    public void Requests_DevemValidarValoresStatusEFornecedor()
    {
        var sem = Validar(new VincularFornecedorRequest(Guid.Empty, null, null, null, null, null));
        var contratadoSemValor = Validar(new AtualizarFornecedorEventoRequest(null, null, null, StatusFornecedorEvento.Contratado, null));
        var negativo = Validar(new AtualizarFornecedorEventoRequest(null, -1m, 10.001m, StatusFornecedorEvento.Cotacao, null));
        var valido = Validar(new VincularFornecedorRequest(Guid.NewGuid(), "Jantar", 1m, null, null, null));

        Assert.Contains(sem, resultado => resultado.MemberNames.Contains(nameof(VincularFornecedorRequest.FornecedorId)));
        Assert.Contains(contratadoSemValor, resultado => resultado.ErrorMessage == MensagensFornecedoresEvento.ContratadoSemValor);
        Assert.Equal(2, negativo.Count);
        Assert.Empty(valido);
        Assert.Equal(StatusFornecedorEvento.Cotacao, new VincularFornecedorRequest(Guid.NewGuid(), null, null, null, null, null).ParaDados().Status);
    }

    [Fact]
    public void Dtos_NaoDevemExporIsolamentoObservacoesNemArquivoNoDisco()
    {
        var nomes = typeof(FornecedorEventoDto).GetProperties().Select(propriedade => propriedade.Name)
            .Concat(typeof(FornecedorVinculadoDto).GetProperties().Select(propriedade => propriedade.Name))
            .Concat(typeof(ContratoFornecedorDto).GetProperties().Select(propriedade => propriedade.Name))
            .ToList();

        Assert.DoesNotContain("OrganizacaoId", nomes);
        Assert.DoesNotContain("EventoId", nomes);
        Assert.DoesNotContain("Observacoes", nomes);
        Assert.DoesNotContain("ContratoArquivoId", nomes);
        Assert.DoesNotContain("ArquivoId", nomes);
    }

    private static List<ValidationResult> Validar(object request)
    {
        var resultados = new List<ValidationResult>();
        Validator.TryValidateObject(request, new ValidationContext(request), resultados, validateAllProperties: true);
        return resultados;
    }
}

public class ArquivoPdfTestes
{
    [Fact]
    public void PossuiAssinaturaPdf_DeveOlharOsBytesEnaoAExtensao()
    {
        Assert.True(ArquivoPdf.PossuiAssinaturaPdf("%PDF-1.7\n"u8));
        Assert.False(ArquivoPdf.PossuiAssinaturaPdf("\x89PNG\r\n"u8));
        Assert.False(ArquivoPdf.PossuiAssinaturaPdf("%PD"u8));
        Assert.False(ArquivoPdf.PossuiAssinaturaPdf(" %PDF-1.7"u8));
    }

    [Theory]
    [InlineData("contrato.pdf", "contrato.pdf")]
    [InlineData("../../etc/passwd", "passwd.pdf")]
    [InlineData("C:\\temp\\Contrato Buffet.PDF", "Contrato Buffet.pdf")]
    [InlineData("contrato\"; filename=x.exe", "contrato__ filename=x.exe.pdf")]
    [InlineData("linha\r\nquebrada.pdf", "linha__quebrada.pdf")]
    [InlineData("   ", "contrato.pdf")]
    [InlineData(null, "contrato.pdf")]
    [InlineData("...", "contrato.pdf")]
    public void SanitizarNome_DeveRemoverCaminhoEControleEForcarPdf(string? entrada, string esperado)
    {
        Assert.Equal(esperado, ArquivoPdf.SanitizarNome(entrada));
    }

    [Fact]
    public void SanitizarNome_DeveLimitarA150Caracteres()
    {
        var nome = ArquivoPdf.SanitizarNome(new string('a', 400) + ".pdf");

        Assert.Equal(FornecedorEvento.TamanhoMaximoNomeContrato, nome.Length);
        Assert.EndsWith(".pdf", nome, StringComparison.Ordinal);
    }

    [Fact]
    public async Task LerComLimite_DeveLerAte10MbELancarAcima()
    {
        using var noLimite = new MemoryStream(new byte[ArquivoPdf.TamanhoMaximoBytes]);
        using var acima = new MemoryStream(new byte[ArquivoPdf.TamanhoMaximoBytes + 1]);

        var lidos = await ArquivoPdf.LerComLimiteAsync(noLimite, CancellationToken.None);

        Assert.Equal(ArquivoPdf.TamanhoMaximoBytes, lidos.Length);
        await Assert.ThrowsAsync<ArquivoGrandeDemaisException>(() => ArquivoPdf.LerComLimiteAsync(acima, CancellationToken.None));
    }
}

public class CalculadoraResumoOrcamentoTestes
{
    private static readonly DateTimeOffset Agora = new(2026, 9, 30, 12, 0, 0, TimeSpan.Zero);

    private static VinculoFornecedor Item(CategoriaFornecedor categoria, StatusFornecedorEvento status, decimal? orcado, decimal? contratado)
    {
        var fornecedor = Fornecedor.Criar(new DadosFornecedor(categoria, $"Empresa {Guid.NewGuid():N}", null, null, null, null, null, null), Agora);
        var vinculo = FornecedorEvento.Criar(Guid.NewGuid(), fornecedor.Id, new DadosFornecedorEvento(null, orcado, contratado, status, null), null, Agora);
        return new VinculoFornecedor(vinculo, fornecedor);
    }

    [Fact]
    public void Calcular_DeveIgnorarCanceladosEContarContratadoSoDeContratado()
    {
        var resumo = CalculadoraResumoOrcamento.Calcular(
        [
            Item(CategoriaFornecedor.Decoracao, StatusFornecedorEvento.EmNegociacao, 15800m, 15000m),
            Item(CategoriaFornecedor.Buffet, StatusFornecedorEvento.Contratado, 18000m, 18500m),
            Item(CategoriaFornecedor.Buffet, StatusFornecedorEvento.Cotacao, null, null),
            Item(CategoriaFornecedor.Musica, StatusFornecedorEvento.Cancelado, 4500m, null),
        ]);

        Assert.Equal(["Buffet", "Decoracao"], resumo.Categorias.Select(categoria => categoria.Categoria));
        var buffet = resumo.Categorias[0];
        Assert.Equal(2, buffet.Quantidade);
        Assert.Equal(1, buffet.Contratados);
        Assert.Equal(18000m, buffet.Orcado);
        Assert.Equal(18500m, buffet.Contratado);
        Assert.Equal(0m, resumo.Categorias[1].Contratado);
        Assert.Equal(33800m, resumo.TotalOrcado);
        Assert.Equal(18500m, resumo.TotalContratado);
        Assert.Equal(3, resumo.QuantidadeFornecedores);
        Assert.Equal(1, resumo.QuantidadeContratados);
    }

    [Fact]
    public void Calcular_ListaVazia_DeveZerar()
    {
        var resumo = CalculadoraResumoOrcamento.Calcular([]);

        Assert.Empty(resumo.Categorias);
        Assert.Equal(0m, resumo.TotalOrcado);
        Assert.Equal(0, resumo.QuantidadeFornecedores);
    }

    [Fact]
    public void Texto_DeveSerPtBr()
    {
        Assert.Contains("PDF", MensagensFornecedoresEvento.ContratoFormatoInvalido, StringComparison.Ordinal);
        Assert.Equal("Este fornecedor já participou de eventos. Arquive-o em vez de excluir.", MensagensFornecedores.ParticipouDeEventos);
        Assert.True(Encoding.UTF8.GetByteCount(MensagensFornecedoresEvento.JaVinculado) > MensagensFornecedoresEvento.JaVinculado.Length);
    }
}
