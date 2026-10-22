using Casamento.Aplicacao.Arquivos;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Casamento.Infraestrutura.Arquivos;

public partial class ArmazenamentoArquivosDisco : IArmazenamentoArquivos
{
    private const string ExtensaoTemporaria = ".tmp";

    private readonly string _raiz;
    private readonly ILogger<ArmazenamentoArquivosDisco> _logger;

    public ArmazenamentoArquivosDisco(IOptions<OpcoesArmazenamentoArquivos> opcoes, ILogger<ArmazenamentoArquivosDisco> logger)
    {
        ArgumentNullException.ThrowIfNull(opcoes);

        if (!OpcoesArmazenamentoArquivos.DiretorioValido(opcoes.Value.Diretorio))
        {
            throw new InvalidOperationException(OpcoesArmazenamentoArquivos.MensagemDiretorioInvalido);
        }

        _raiz = Path.TrimEndingDirectorySeparator(Path.GetFullPath(opcoes.Value.Diretorio));
        _logger = logger;
    }

    public async Task SalvarAsync(ChaveArquivo chave, ReadOnlyMemory<byte> conteudo, CancellationToken cancelamento)
    {
        var caminho = MontarCaminho(chave);
        Directory.CreateDirectory(Path.GetDirectoryName(caminho)!);
        var temporario = caminho + ExtensaoTemporaria;

        try
        {
            await using (var arquivo = new FileStream(temporario, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, useAsync: true))
            {
                await arquivo.WriteAsync(conteudo, cancelamento);
                await arquivo.FlushAsync(cancelamento);
            }

            File.Move(temporario, caminho, overwrite: false);
        }
        catch
        {
            ApagarSilenciosamente(temporario);
            throw;
        }
    }

    public Task<Stream?> AbrirLeituraAsync(ChaveArquivo chave, CancellationToken cancelamento)
    {
        var caminho = MontarCaminho(chave);

        if (!File.Exists(caminho))
        {
            return Task.FromResult<Stream?>(null);
        }

        Stream fluxo = new FileStream(caminho, FileMode.Open, FileAccess.Read, FileShare.Read, 81920, useAsync: true);
        return Task.FromResult<Stream?>(fluxo);
    }

    public Task RemoverAsync(ChaveArquivo chave, CancellationToken cancelamento)
    {
        var caminho = MontarCaminho(chave);

        try
        {
            if (File.Exists(caminho))
            {
                File.Delete(caminho);
            }
        }
        catch (Exception excecao) when (excecao is IOException or UnauthorizedAccessException)
        {
            RegistrarFalhaRemocao(_logger, chave.ArquivoId, excecao);
        }

        return Task.CompletedTask;
    }

    public string MontarCaminho(ChaveArquivo chave)
    {
        ArgumentNullException.ThrowIfNull(chave);

        if (chave.OrganizacaoId == Guid.Empty || chave.CasamentoId == Guid.Empty || chave.ArquivoId == Guid.Empty)
        {
            throw new ArgumentException("A chave do arquivo está incompleta.", nameof(chave));
        }

        var caminho = Path.GetFullPath(Path.Combine(
            _raiz,
            chave.OrganizacaoId.ToString("N"),
            chave.CasamentoId.ToString("N"),
            chave.ArquivoId.ToString("N")));

        if (!caminho.StartsWith(_raiz + Path.DirectorySeparatorChar, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Caminho de arquivo fora do diretório de armazenamento.");
        }

        return caminho;
    }

    private static void ApagarSilenciosamente(string caminho)
    {
        try
        {
            File.Delete(caminho);
        }
        catch (Exception excecao) when (excecao is IOException or UnauthorizedAccessException)
        {
        }
    }

    [LoggerMessage(Level = LogLevel.Warning, Message = "Não foi possível remover o arquivo {ArquivoId} do armazenamento.")]
    private static partial void RegistrarFalhaRemocao(ILogger logger, Guid arquivoId, Exception excecao);
}
