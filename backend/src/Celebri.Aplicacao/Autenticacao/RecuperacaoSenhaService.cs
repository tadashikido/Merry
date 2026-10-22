using Celebri.Aplicacao.Autenticacao.Portas;
using Celebri.Aplicacao.Email;
using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Autenticacao;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Usuarios;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Celebri.Aplicacao.Autenticacao;

public class RecuperacaoSenhaService : IRecuperacaoSenhaService
{
    public const string CaminhoRedefinicao = "/redefinir-senha#token=";

    private readonly IUsuarioRepository _usuarioRepository;
    private readonly ITokenRedefinicaoSenhaRepository _tokenRedefinicaoRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly IHashSenhaService _hashSenhaService;
    private readonly IGeradorTokenOpaco _geradorTokenOpaco;
    private readonly IEnvioEmailService _envioEmailService;
    private readonly OpcoesAutenticacao _opcoes;
    private readonly TimeProvider _relogio;
    private readonly ILogger<RecuperacaoSenhaService> _logger;

    public RecuperacaoSenhaService(
        IUsuarioRepository usuarioRepository,
        ITokenRedefinicaoSenhaRepository tokenRedefinicaoRepository,
        IRefreshTokenRepository refreshTokenRepository,
        IUnidadeTrabalho unidadeTrabalho,
        IHashSenhaService hashSenhaService,
        IGeradorTokenOpaco geradorTokenOpaco,
        IEnvioEmailService envioEmailService,
        IOptions<OpcoesAutenticacao> opcoes,
        TimeProvider relogio,
        ILogger<RecuperacaoSenhaService> logger)
    {
        _usuarioRepository = usuarioRepository;
        _tokenRedefinicaoRepository = tokenRedefinicaoRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _unidadeTrabalho = unidadeTrabalho;
        _hashSenhaService = hashSenhaService;
        _geradorTokenOpaco = geradorTokenOpaco;
        _envioEmailService = envioEmailService;
        _opcoes = opcoes.Value;
        _relogio = relogio;
        _logger = logger;
    }

    public async Task<SolicitacaoRecuperacaoDto> SolicitarAsync(EsqueciSenhaRequest request, CancellationToken cancelamento)
    {
        var resposta = new SolicitacaoRecuperacaoDto(MensagensAutenticacao.RecuperacaoSolicitada);
        var usuario = await _usuarioRepository.ObterPorEmailAsync(NormalizadorEmail.Normalizar(request.Email), cancelamento);

        if (usuario is null || !usuario.Ativo)
        {
            return resposta;
        }

        var agora = _relogio.GetUtcNow();
        await InvalidarPendentesAsync(usuario.Id, agora, cancelamento);

        var valor = _geradorTokenOpaco.Gerar();
        var token = TokenRedefinicaoSenha.Emitir(
            usuario.Id,
            _geradorTokenOpaco.CalcularHash(valor),
            agora,
            agora.AddMinutes(_opcoes.ValidadeTokenRedefinicaoMinutos));
        _tokenRedefinicaoRepository.Adicionar(token);

        await _unidadeTrabalho.SalvarAsync(cancelamento);

        var link = $"{_opcoes.UrlFrontend.TrimEnd('/')}{CaminhoRedefinicao}{Uri.EscapeDataString(valor)}";
        var mensagem = ModelosEmail.RedefinicaoSenha(usuario.Nome, usuario.Email, link, _opcoes.ValidadeTokenRedefinicaoMinutos);

        try
        {
            await _envioEmailService.EnviarAsync(mensagem, cancelamento);
        }
        catch (Exception excecao) when (excecao is not OperationCanceledException)
        {
            _logger.LogError(excecao, "Falha ao enviar o e-mail de redefinição de senha do usuário {UsuarioId}.", usuario.Id);
        }

        return resposta;
    }

    public async Task RedefinirAsync(RedefinirSenhaRequest request, CancellationToken cancelamento)
    {
        if (string.IsNullOrWhiteSpace(request.Token))
        {
            throw new RegraNegocioException(MensagensAutenticacao.LinkRedefinicaoInvalido);
        }

        var agora = _relogio.GetUtcNow();
        var token = await _tokenRedefinicaoRepository.ObterPorHashAsync(_geradorTokenOpaco.CalcularHash(request.Token), cancelamento);

        if (token is null || !token.EstaValido(agora))
        {
            throw new RegraNegocioException(MensagensAutenticacao.LinkRedefinicaoInvalido);
        }

        var usuario = await _usuarioRepository.ObterPorIdAsync(token.UsuarioId, cancelamento);
        if (usuario is null || !usuario.Ativo)
        {
            throw new RegraNegocioException(MensagensAutenticacao.LinkRedefinicaoInvalido);
        }

        var erroSenha = PoliticaSenha.Validar(request.NovaSenha, usuario.Email);
        if (erroSenha is not null)
        {
            throw new RegraNegocioException(erroSenha);
        }

        usuario.AlterarSenha(_hashSenhaService.GerarHash(request.NovaSenha), agora);
        token.MarcarUsado(agora);
        await InvalidarPendentesAsync(usuario.Id, agora, cancelamento);

        var sessoes = await _refreshTokenRepository.ListarNaoUtilizadosDoUsuarioAsync(usuario.Id, cancelamento);
        foreach (var sessao in sessoes)
        {
            sessao.Revogar(agora);
        }

        try
        {
            await _unidadeTrabalho.SalvarAsync(cancelamento);
        }
        catch (ConcorrenciaException)
        {
            throw new RegraNegocioException(MensagensAutenticacao.LinkRedefinicaoInvalido);
        }
    }

    private async Task InvalidarPendentesAsync(Guid usuarioId, DateTimeOffset agora, CancellationToken cancelamento)
    {
        var pendentes = await _tokenRedefinicaoRepository.ListarPendentesDoUsuarioAsync(usuarioId, cancelamento);
        foreach (var pendente in pendentes)
        {
            pendente.Invalidar(agora);
        }
    }
}
