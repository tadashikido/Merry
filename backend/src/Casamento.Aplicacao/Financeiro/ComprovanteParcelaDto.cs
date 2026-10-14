namespace Casamento.Aplicacao.Financeiro;

public sealed record ComprovanteParcelaDto(string NomeArquivo, string TipoConteudo, long TamanhoBytes, DateTimeOffset EnviadoEm);
