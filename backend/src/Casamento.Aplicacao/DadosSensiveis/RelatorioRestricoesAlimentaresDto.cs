namespace Casamento.Aplicacao.DadosSensiveis;

public sealed record RelatorioRestricoesAlimentaresDto(
    int TotalPessoas,
    int TotalConfirmados,
    IReadOnlyList<ContagemRestricaoDto> PorTipo,
    int OutrasRestricoes,
    int NecessidadesEspeciais,
    IReadOnlyList<PessoaRestricaoAlimentarDto> Pessoas,
    int DiasRetencao,
    DateOnly DataExclusaoPrevista,
    DateTimeOffset? DadosExcluidosEm,
    int RegistrosIlegiveis,
    bool PodeRegistrar);

public sealed record ContagemRestricaoDto(string Tipo, int Quantidade);

public sealed record PessoaRestricaoAlimentarDto(
    Guid ConvidadoId,
    Guid ConviteId,
    string Nome,
    bool Acompanhante,
    string Resposta,
    IReadOnlyList<string> Tipos,
    string? OutraRestricao,
    string? NecessidadeEspecial,
    string OrigemConsentimento,
    DateTimeOffset ConsentidoEm);
