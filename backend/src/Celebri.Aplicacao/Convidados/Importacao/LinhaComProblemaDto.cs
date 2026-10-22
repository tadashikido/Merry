namespace Celebri.Aplicacao.Convidados.Importacao;

public sealed record LinhaComProblemaDto(int Linha, ValoresLinhaImportacaoDto Valores, IReadOnlyList<ProblemaLinhaDto> Problemas);
