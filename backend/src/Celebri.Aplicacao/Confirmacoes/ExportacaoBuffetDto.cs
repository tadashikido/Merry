namespace Celebri.Aplicacao.Confirmacoes;

public sealed record ExportacaoBuffetDto(
    EventoExportacaoDto Evento,
    DateTimeOffset GeradoEm,
    ContagemBuffetDto Confirmados,
    int Pendentes,
    IReadOnlyList<ConviteBuffetDto> Convites,
    RestricoesBuffetDto Restricoes);

public sealed record EventoExportacaoDto(
    string NomePrimeiraPessoa,
    string? NomeSegundaPessoa,
    DateOnly Data,
    string? Horario,
    string? LocalRecepcao);

public sealed record ContagemBuffetDto(int Adultos, int Criancas, int Total);

public sealed record ConviteBuffetDto(string Nome, IReadOnlyList<PessoaBuffetDto> Pessoas);

public sealed record PessoaBuffetDto(
    string Nome,
    string FaixaEtaria,
    bool Acompanhante,
    IReadOnlyList<string> Tipos,
    string? OutraRestricao,
    string? NecessidadeEspecial);

public sealed record RestricoesBuffetDto(
    IReadOnlyList<ContagemRestricaoBuffetDto> PorTipo,
    int OutrasRestricoes,
    int NecessidadesEspeciais,
    IReadOnlyList<PessoaRestricaoBuffetDto> Pessoas,
    int RegistrosIlegiveis,
    DateTimeOffset? DadosExcluidosEm);

public sealed record ContagemRestricaoBuffetDto(string Tipo, int Quantidade);

public sealed record PessoaRestricaoBuffetDto(
    string Nome,
    string Convite,
    IReadOnlyList<string> Tipos,
    string? OutraRestricao,
    string? NecessidadeEspecial);
