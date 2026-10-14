using Casamento.Aplicacao.Convidados;

namespace Casamento.Aplicacao.Confirmacoes;

public sealed record PainelConfirmacoesDto(
    SituacaoConvitesDto Convites,
    TotaisConvidadosDto Pessoas,
    int? ConvidadosEstimados,
    PrazoRsvpDto Prazo,
    bool CasamentoArquivado,
    IReadOnlyList<ConvitePendenteDto> Pendentes,
    int PessoasComRestricaoAlimentar = 0);

public sealed record SituacaoConvitesDto(
    int Total,
    int NaoEnviados,
    int Enviados,
    int Visualizados,
    int Respondidos,
    int AguardandoResposta);

public sealed record PrazoRsvpDto(DateOnly DataLimite, int DiasRestantes, bool AceitaRespostas);

public sealed record ConvitePendenteDto(
    Guid ConviteId,
    string Nome,
    string? Grupo,
    string StatusEnvio,
    string? Telefone,
    IReadOnlyList<string> PessoasPendentes,
    int TotalPessoas);
