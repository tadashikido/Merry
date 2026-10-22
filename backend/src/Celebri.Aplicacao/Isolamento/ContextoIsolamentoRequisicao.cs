namespace Celebri.Aplicacao.Isolamento;

public class ContextoIsolamentoRequisicao : IContextoIsolamento
{
    private readonly ContextoIsolamentoUsuarioAtual _usuarioAtual;
    private readonly EscopoIsolamentoRsvp _escopoRsvp;
    private readonly EscopoIsolamentoAcessoAnfitriao _escopoAcessoAnfitriao;
    private readonly EscopoIsolamentoSistema _escopoSistema;
    private readonly EscopoIsolamentoCronogramaPublico _escopoCronogramaPublico;

    public ContextoIsolamentoRequisicao(
        ContextoIsolamentoUsuarioAtual usuarioAtual,
        EscopoIsolamentoRsvp escopoRsvp,
        EscopoIsolamentoAcessoAnfitriao escopoAcessoAnfitriao,
        EscopoIsolamentoSistema escopoSistema,
        EscopoIsolamentoCronogramaPublico escopoCronogramaPublico)
    {
        _usuarioAtual = usuarioAtual;
        _escopoRsvp = escopoRsvp;
        _escopoAcessoAnfitriao = escopoAcessoAnfitriao;
        _escopoSistema = escopoSistema;
        _escopoCronogramaPublico = escopoCronogramaPublico;
    }

    public Guid? OrganizacaoId =>
        _escopoRsvp.OrganizacaoId
        ?? _escopoCronogramaPublico.OrganizacaoId
        ?? _escopoAcessoAnfitriao.OrganizacaoId
        ?? _escopoSistema.OrganizacaoId
        ?? _usuarioAtual.OrganizacaoId;

    public IReadOnlyCollection<Guid>? EventosPermitidos
    {
        get
        {
            if (_escopoRsvp.OrganizacaoId is not null)
            {
                return null;
            }

            if (_escopoCronogramaPublico.EventoId is { } eventoDoLink)
            {
                return [eventoDoLink];
            }

            if (_escopoAcessoAnfitriao.EventoId is { } eventoDoConvite)
            {
                return [eventoDoConvite];
            }

            return _escopoSistema.OrganizacaoId is not null ? null : _usuarioAtual.EventosPermitidos;
        }
    }
}
