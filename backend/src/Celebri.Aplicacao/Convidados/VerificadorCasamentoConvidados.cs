using Casamento.Aplicacao.Excecoes;
using Casamento.Aplicacao.Persistencia;
using Casamento.Dominio.Casamentos;
using Casamento.Dominio.Convidados;
using Casamento.Dominio.Excecoes;

namespace Casamento.Aplicacao.Convidados;

public sealed class VerificadorCasamentoConvidados
{
    private readonly ICasamentoRepository _casamentoRepository;
    private readonly IConviteRepository _conviteRepository;

    public VerificadorCasamentoConvidados(ICasamentoRepository casamentoRepository, IConviteRepository conviteRepository)
    {
        _casamentoRepository = casamentoRepository;
        _conviteRepository = conviteRepository;
    }

    public async Task<CasamentoAssessorado> ObterAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        return await _casamentoRepository.ObterPorIdAsync(casamentoId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensCasamento.NaoEncontrado);
    }

    public async Task<CasamentoAssessorado> ObterEditavelAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        var casamento = await ObterAsync(casamentoId, cancelamento);

        if (casamento.Arquivado)
        {
            throw new RegraNegocioException(MensagensConvidados.CasamentoArquivado);
        }

        return casamento;
    }

    public async Task GarantirLimiteAsync(Guid casamentoId, int novos, int atuais, CancellationToken cancelamento)
    {
        var existentes = await _conviteRepository.ContarConvidadosAsync(casamentoId, cancelamento);

        if (existentes - atuais + novos > Convite.ConvidadosMaximoPorCasamento)
        {
            throw new RegraNegocioException(MensagensConvidados.LimitePorCasamento);
        }
    }
}
