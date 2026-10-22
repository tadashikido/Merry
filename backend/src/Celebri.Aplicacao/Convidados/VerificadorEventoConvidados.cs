using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Convidados;
using Celebri.Dominio.Excecoes;

namespace Celebri.Aplicacao.Convidados;

public sealed class VerificadorEventoConvidados
{
    private readonly IEventoRepository _eventoRepository;
    private readonly IConviteRepository _conviteRepository;

    public VerificadorEventoConvidados(IEventoRepository eventoRepository, IConviteRepository conviteRepository)
    {
        _eventoRepository = eventoRepository;
        _conviteRepository = conviteRepository;
    }

    public async Task<Evento> ObterAsync(Guid eventoId, CancellationToken cancelamento)
    {
        return await _eventoRepository.ObterPorIdAsync(eventoId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensEvento.NaoEncontrado);
    }

    public async Task<Evento> ObterEditavelAsync(Guid eventoId, CancellationToken cancelamento)
    {
        var evento = await ObterAsync(eventoId, cancelamento);

        if (evento.Arquivado)
        {
            throw new RegraNegocioException(MensagensConvidados.EventoArquivado);
        }

        return evento;
    }

    public async Task GarantirLimiteAsync(Guid eventoId, int novos, int atuais, CancellationToken cancelamento)
    {
        var existentes = await _conviteRepository.ContarConvidadosAsync(eventoId, cancelamento);

        if (existentes - atuais + novos > Convite.ConvidadosMaximoPorEvento)
        {
            throw new RegraNegocioException(MensagensConvidados.LimitePorEvento);
        }
    }
}
