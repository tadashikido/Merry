namespace Casamento.Aplicacao.Isolamento;

public class ContextoIsolamentoRequisicao : IContextoIsolamento
{
    private readonly ContextoIsolamentoUsuarioAtual _usuarioAtual;
    private readonly EscopoIsolamentoRsvp _escopoRsvp;
    private readonly EscopoIsolamentoAcessoCasal _escopoAcessoCasal;
    private readonly EscopoIsolamentoSistema _escopoSistema;
    private readonly EscopoIsolamentoCronogramaPublico _escopoCronogramaPublico;

    public ContextoIsolamentoRequisicao(
        ContextoIsolamentoUsuarioAtual usuarioAtual,
        EscopoIsolamentoRsvp escopoRsvp,
        EscopoIsolamentoAcessoCasal escopoAcessoCasal,
        EscopoIsolamentoSistema escopoSistema,
        EscopoIsolamentoCronogramaPublico escopoCronogramaPublico)
    {
        _usuarioAtual = usuarioAtual;
        _escopoRsvp = escopoRsvp;
        _escopoAcessoCasal = escopoAcessoCasal;
        _escopoSistema = escopoSistema;
        _escopoCronogramaPublico = escopoCronogramaPublico;
    }

    public Guid? OrganizacaoId =>
        _escopoRsvp.OrganizacaoId
        ?? _escopoCronogramaPublico.OrganizacaoId
        ?? _escopoAcessoCasal.OrganizacaoId
        ?? _escopoSistema.OrganizacaoId
        ?? _usuarioAtual.OrganizacaoId;

    public IReadOnlyCollection<Guid>? CasamentosPermitidos
    {
        get
        {
            if (_escopoRsvp.OrganizacaoId is not null)
            {
                return null;
            }

            if (_escopoCronogramaPublico.CasamentoId is { } casamentoDoLink)
            {
                return [casamentoDoLink];
            }

            if (_escopoAcessoCasal.CasamentoId is { } casamentoDoConvite)
            {
                return [casamentoDoConvite];
            }

            return _escopoSistema.OrganizacaoId is not null ? null : _usuarioAtual.CasamentosPermitidos;
        }
    }
}
