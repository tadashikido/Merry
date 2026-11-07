using Celebri.Aplicacao.Autenticacao;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Impersonacao.Portas;
using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Impersonacao;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Celebri.Aplicacao.Impersonacao;

public class ImpersonacaoService : IImpersonacaoService
{
    private readonly IOrganizacaoRepository _organizacaoRepository;
    private readonly IUsuarioRepository _usuarioRepository;
    private readonly ISessaoImpersonacaoRepository _sessaoRepository;
    private readonly IGeradorTokenImpersonacao _geradorTokenImpersonacao;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly OpcoesAutenticacao _opcoes;
    private readonly TimeProvider _relogio;
    private readonly ILogger<ImpersonacaoService> _logger;

    public ImpersonacaoService(
        IOrganizacaoRepository organizacaoRepository,
        IUsuarioRepository usuarioRepository,
        ISessaoImpersonacaoRepository sessaoRepository,
        IGeradorTokenImpersonacao geradorTokenImpersonacao,
        IUnidadeTrabalho unidadeTrabalho,
        IOptions<OpcoesAutenticacao> opcoes,
        TimeProvider relogio,
        ILogger<ImpersonacaoService> logger)
    {
        _organizacaoRepository = organizacaoRepository;
        _usuarioRepository = usuarioRepository;
        _sessaoRepository = sessaoRepository;
        _geradorTokenImpersonacao = geradorTokenImpersonacao;
        _unidadeTrabalho = unidadeTrabalho;
        _opcoes = opcoes.Value;
        _relogio = relogio;
        _logger = logger;
    }

    public async Task<SessaoImpersonacaoDto> IniciarAsync(Guid operadorId, IniciarImpersonacaoRequest request, CancellationToken cancelamento)
    {
        var organizacao = await _organizacaoRepository.ObterPorIdAsync(request.OrganizacaoId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensImpersonacao.AssessoriaNaoEncontrada);

        var dono = await _usuarioRepository.ObterDonoDaOrganizacaoAsync(organizacao.Id, cancelamento)
            ?? throw new RegraNegocioException(MensagensImpersonacao.SemResponsavel);

        var agora = _relogio.GetUtcNow();
        var validade = TimeSpan.FromMinutes(_opcoes.ValidadeTokenAcessoMinutos);
        var sessao = SessaoImpersonacao.Criar(operadorId, organizacao.Id, request.Motivo, agora, validade);

        _sessaoRepository.Adicionar(sessao);
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        var token = _geradorTokenImpersonacao.Gerar(dono, organizacao, sessao.Id);
        RegistrarInicio(_logger, operadorId, organizacao.Id, sessao.Id);

        return new SessaoImpersonacaoDto(sessao.Id, token.Valor, token.ExpiraEm, new AssessoriaImpersonadaDto(organizacao.Id, organizacao.Nome));
    }

    public async Task EncerrarAsync(Guid sessaoId, CancellationToken cancelamento)
    {
        var sessao = await _sessaoRepository.ObterPorIdAsync(sessaoId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensImpersonacao.SessaoNaoEncontrada);

        sessao.Encerrar(_relogio.GetUtcNow());
        await _unidadeTrabalho.SalvarAsync(cancelamento);
        RegistrarFim(_logger, sessao.OperadorId, sessao.OrganizacaoId, sessao.Id);
    }

    public Task<IReadOnlyList<SessaoImpersonacaoResumoDto>> ListarAsync(int limite, CancellationToken cancelamento)
    {
        var limiteNormalizado = limite is > 0 and <= 200 ? limite : 50;
        return _sessaoRepository.ListarRecentesAsync(limiteNormalizado, _relogio.GetUtcNow(), cancelamento);
    }

    private static void RegistrarInicio(ILogger logger, Guid operadorId, Guid organizacaoId, Guid sessaoId)
    {
        logger.LogInformation(
            "Impersonação iniciada: operador {OperadorId}, assessoria {OrganizacaoId}, sessão {SessaoId}.",
            operadorId, organizacaoId, sessaoId);
    }

    private static void RegistrarFim(ILogger logger, Guid operadorId, Guid organizacaoId, Guid sessaoId)
    {
        logger.LogInformation(
            "Impersonação encerrada: operador {OperadorId}, assessoria {OrganizacaoId}, sessão {SessaoId}.",
            operadorId, organizacaoId, sessaoId);
    }
}
