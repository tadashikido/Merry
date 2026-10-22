using Celebri.Aplicacao.Arquivos;
using Celebri.Infraestrutura.Arquivos;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Celebri.Testes.Unidade.Fornecedores;

public sealed class ArmazenamentoArquivosDiscoTestes : IDisposable
{
    private readonly string _raiz = Path.Combine(Path.GetTempPath(), "celebri-testes-unidade", Guid.NewGuid().ToString("N"));
    private readonly ArmazenamentoArquivosDisco _armazenamento;

    public ArmazenamentoArquivosDiscoTestes()
    {
        _armazenamento = Criar(_raiz);
    }

    public void Dispose()
    {
        if (Directory.Exists(_raiz))
        {
            Directory.Delete(_raiz, recursive: true);
        }
    }

    private static ArmazenamentoArquivosDisco Criar(string diretorio)
    {
        return new ArmazenamentoArquivosDisco(
            Options.Create(new OpcoesArmazenamentoArquivos { Diretorio = diretorio }),
            NullLogger<ArmazenamentoArquivosDisco>.Instance);
    }

    private static ChaveArquivo Chave()
    {
        return new ChaveArquivo(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());
    }

    [Fact]
    public async Task SalvarAbrirERemover_DevemUsarCaminhoSoComGuidsIsoladoPorOrganizacaoEEvento()
    {
        var chave = Chave();
        var conteudo = "%PDF-1.7 contrato"u8.ToArray();

        await _armazenamento.SalvarAsync(chave, conteudo, CancellationToken.None);

        var caminho = _armazenamento.MontarCaminho(chave);
        Assert.Equal(
            Path.Combine(Path.GetFullPath(_raiz), chave.OrganizacaoId.ToString("N"), chave.EventoId.ToString("N"), chave.ArquivoId.ToString("N")),
            caminho);
        Assert.True(File.Exists(caminho));
        Assert.Empty(Directory.GetFiles(Path.GetDirectoryName(caminho)!, "*.tmp"));

        await using (var leitura = await _armazenamento.AbrirLeituraAsync(chave, CancellationToken.None))
        {
            using var memoria = new MemoryStream();
            await leitura!.CopyToAsync(memoria);
            Assert.Equal(conteudo, memoria.ToArray());
        }

        await _armazenamento.RemoverAsync(chave, CancellationToken.None);
        Assert.False(File.Exists(caminho));
        Assert.Null(await _armazenamento.AbrirLeituraAsync(chave, CancellationToken.None));
        await _armazenamento.RemoverAsync(chave, CancellationToken.None);
    }

    [Fact]
    public async Task Salvar_MesmaChaveDuasVezes_NaoDeveSobrescrever()
    {
        var chave = Chave();
        await _armazenamento.SalvarAsync(chave, "%PDF-a"u8.ToArray(), CancellationToken.None);

        await Assert.ThrowsAsync<IOException>(() => _armazenamento.SalvarAsync(chave, "%PDF-b"u8.ToArray(), CancellationToken.None));
    }

    [Fact]
    public void ChaveIncompleta_DeveSerRecusada()
    {
        Assert.Throws<ArgumentException>(() => _armazenamento.MontarCaminho(new ChaveArquivo(Guid.Empty, Guid.NewGuid(), Guid.NewGuid())));
        Assert.Throws<ArgumentException>(() => _armazenamento.MontarCaminho(new ChaveArquivo(Guid.NewGuid(), Guid.NewGuid(), Guid.Empty)));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("arquivos/relativos")]
    public void DiretorioAusenteOuRelativo_DeveFalharComMensagemDaVariavel(string diretorio)
    {
        var excecao = Assert.Throws<InvalidOperationException>(() => Criar(diretorio));

        Assert.Contains("ArmazenamentoArquivos__Diretorio", excecao.Message, StringComparison.Ordinal);
        Assert.False(OpcoesArmazenamentoArquivos.DiretorioValido(diretorio));
    }
}
