using Casamento.Aplicacao.Autenticacao;
using Casamento.Aplicacao.Autenticacao.Portas;
using Casamento.Aplicacao.Email;
using Casamento.Aplicacao.Excecoes;
using Casamento.Aplicacao.Isolamento;
using Casamento.Aplicacao.Persistencia;
using Casamento.Aplicacao.UsuarioAtual;
using Casamento.Dominio.AcessosCasal;
using Casamento.Dominio.Casamentos;
using Casamento.Dominio.Excecoes;
using Casamento.Dominio.Organizacoes;
using Casamento.Dominio.Usuarios;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Casamento.Aplicacao.AcessosCasal;

public partial class AcessoCasalService : IAcessoCasalService
{
    public const string CaminhoAceite = "/acesso-casal#token=";

    private readonly IAcessoCasalRepository _acessoRepository;
    private readonly ITokenAcessoCasalRepository _tokenRepository;
    private readonly ICasamentoRepository _casamentoRepository;
    private readonly IUsuarioRepository _usuarioRepository;
    private readonly IOrganizacaoRepository _organizacaoRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly IHashSenhaService _hashSenhaService;
    private readonly IGeradorTokenOpaco _geradorToken;
    private readonly IEnvioEmailService _envioEmail;
    private readonly IAutenticacaoService _autenticacaoService;
    private readonly IUsuarioAtual _usuarioAtual;
    private readonly EscopoIsolamentoAcessoCasal _escopo;
    private readonly OpcoesAutenticacao _opcoes;
    private readonly TimeProvider _relogio;
    private readonly ILogger<AcessoCasalService> _logger;

    public AcessoCasalService(
        IAcessoCasalRepository acessoRepository,
        ITokenAcessoCasalRepository tokenRepository,
        ICasamentoRepository casamentoRepository,
        IUsuarioRepository usuarioRepository,
        IOrganizacaoRepository organizacaoRepository,
        IRefreshTokenRepository refreshTokenRepository,
        IUnidadeTrabalho unidadeTrabalho,
        IHashSenhaService hashSenhaService,
        IGeradorTokenOpaco geradorToken,
        IEnvioEmailService envioEmail,
        IAutenticacaoService autenticacaoService,
        IUsuarioAtual usuarioAtual,
        EscopoIsolamentoAcessoCasal escopo,
        IOptions<OpcoesAutenticacao> opcoes,
        TimeProvider relogio,
        ILogger<AcessoCasalService> logger)
    {
        ArgumentNullException.ThrowIfNull(opcoes);

        _acessoRepository = acessoRepository;
        _tokenRepository = tokenRepository;
        _casamentoRepository = casamentoRepository;
        _usuarioRepository = usuarioRepository;
        _organizacaoRepository = organizacaoRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _unidadeTrabalho = unidadeTrabalho;
        _hashSenhaService = hashSenhaService;
        _geradorToken = geradorToken;
        _envioEmail = envioEmail;
        _autenticacaoService = autenticacaoService;
        _usuarioAtual = usuarioAtual;
        _escopo = escopo;
        _opcoes = opcoes.Value;
        _relogio = relogio;
        _logger = logger;
    }

    private TimeSpan Validade => TimeSpan.FromDays(_opcoes.ValidadeConviteCasalDias);

    public async Task<IReadOnlyList<AcessoCasalDto>> ListarAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        var casamento = await ObterCasamentoAsync(casamentoId, cancelamento);
        var acessos = await _acessoRepository.ListarNaoRevogadosAsync(casamento.Id, cancelamento);
        var agora = _relogio.GetUtcNow();

        return acessos
            .OrderBy(acesso => acesso.ConvidadoEm)
            .Select(acesso => ParaDto(acesso, agora))
            .ToList();
    }

    public async Task<AcessoCasalDto> ConvidarAsync(Guid casamentoId, ConvidarCasalRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var usuarioId = ObterUsuarioAtual();
        var casamento = await ObterCasamentoAsync(casamentoId, cancelamento);
        if (casamento.Arquivado)
        {
            throw new RegraNegocioException(MensagensAcessoCasal.CasamentoArquivado);
        }

        var acessos = await _acessoRepository.ListarNaoRevogadosAsync(casamento.Id, cancelamento);
        var email = NormalizadorEmail.Normalizar(request.Email);

        if (acessos.Any(acesso => acesso.Email == email))
        {
            throw new RegraNegocioException(MensagensAcessoCasal.EmailJaConvidado);
        }

        if (acessos.Count >= AcessoCasal.LimitePorCasamento)
        {
            throw new RegraNegocioException(MensagensAcessoCasal.LimiteAtingido);
        }

        if (await _acessoRepository.ExisteNaoRevogadoComEmailAsync(email, cancelamento))
        {
            throw new RegraNegocioException(MensagensAcessoCasal.EmailEmUso);
        }

        await GarantirEmailDisponivelAsync(email, casamento.Id, cancelamento);

        var agora = _relogio.GetUtcNow();
        var acesso = AcessoCasal.Convidar(casamento.Id, request.Nome!, email, usuarioId, agora, Validade);
        _acessoRepository.Adicionar(acesso);

        var valorToken = _geradorToken.Gerar();
        _tokenRepository.Adicionar(TokenAcessoCasal.Gerar(acesso, casamento.OrganizacaoId, _geradorToken.CalcularHash(valorToken), agora));

        await _unidadeTrabalho.SalvarAsync(cancelamento);
        await EnviarConviteAsync(acesso, casamento, valorToken, cancelamento);

        return ParaDto(acesso, agora);
    }

    public async Task<AcessoCasalDto> ReenviarAsync(Guid casamentoId, Guid acessoId, CancellationToken cancelamento)
    {
        var casamento = await ObterCasamentoAsync(casamentoId, cancelamento);
        if (casamento.Arquivado)
        {
            throw new RegraNegocioException(MensagensAcessoCasal.CasamentoArquivado);
        }

        var acesso = await ObterAcessoAsync(casamento.Id, acessoId, cancelamento);
        var agora = _relogio.GetUtcNow();
        acesso.Reenviar(agora, Validade);

        var valorToken = _geradorToken.Gerar();
        var hash = _geradorToken.CalcularHash(valorToken);
        var token = await _tokenRepository.ObterPorAcessoAsync(acesso.Id, cancelamento);

        if (token is null)
        {
            _tokenRepository.Adicionar(TokenAcessoCasal.Gerar(acesso, casamento.OrganizacaoId, hash, agora));
        }
        else
        {
            token.Renovar(hash, agora);
        }

        await _unidadeTrabalho.SalvarAsync(cancelamento);
        await EnviarConviteAsync(acesso, casamento, valorToken, cancelamento);

        return ParaDto(acesso, agora);
    }

    public async Task RevogarAsync(Guid casamentoId, Guid acessoId, CancellationToken cancelamento)
    {
        var usuarioId = ObterUsuarioAtual();
        var casamento = await ObterCasamentoAsync(casamentoId, cancelamento);
        var acesso = await ObterAcessoAsync(casamento.Id, acessoId, cancelamento);
        var agora = _relogio.GetUtcNow();

        acesso.Revogar(usuarioId, agora);

        var token = await _tokenRepository.ObterPorAcessoAsync(acesso.Id, cancelamento);
        if (token is not null)
        {
            _tokenRepository.Remover(token);
        }

        if (acesso.UsuarioId is { } usuarioCasalId)
        {
            var usuarioCasal = await _usuarioRepository.ObterPorIdAsync(usuarioCasalId, cancelamento);
            if (usuarioCasal is { Papel: PapelUsuario.Casal } && usuarioCasal.CasamentoId == casamento.Id)
            {
                usuarioCasal.Desativar();
                var sessoes = await _refreshTokenRepository.ListarNaoUtilizadosDoUsuarioAsync(usuarioCasal.Id, cancelamento);
                foreach (var sessao in sessoes)
                {
                    sessao.Revogar(agora);
                }
            }
        }

        await _unidadeTrabalho.SalvarAsync(cancelamento);
        RegistrarRevogacao(casamento.Id, acesso.Id, usuarioId);
    }

    public async Task<ConviteAcessoCasalDto> ConsultarConviteAsync(ConsultarConviteCasalRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var (acesso, _, casamento, organizacao) = await ResolverAsync(request.Token, cancelamento);

        return new ConviteAcessoCasalDto(
            acesso.Nome,
            acesso.Email,
            casamento.NomePrimeiraPessoa,
            casamento.NomeSegundaPessoa,
            organizacao.Nome,
            acesso.ConviteExpiraEm);
    }

    public async Task<ResultadoAutenticacao> AceitarConviteAsync(AceitarConviteCasalRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var (acesso, token, casamento, organizacao) = await ResolverAsync(request.Token, cancelamento);

        if (PoliticaSenha.Validar(request.Senha, acesso.Email) is { } erroSenha)
        {
            throw new RegraNegocioException(erroSenha);
        }

        var agora = _relogio.GetUtcNow();
        var hashSenha = _hashSenhaService.GerarHash(request.Senha!);
        var existente = await _usuarioRepository.ObterPorEmailAsync(acesso.Email, cancelamento);
        Usuario usuario;

        if (existente is null)
        {
            usuario = Usuario.CriarCasal(organizacao.Id, casamento.Id, acesso.Nome, acesso.Email, hashSenha, agora);
            _usuarioRepository.Adicionar(usuario);
        }
        else if (PodeReativar(existente, casamento))
        {
            existente.ReativarCasal(casamento.Id, acesso.Nome, hashSenha, agora);
            usuario = existente;
        }
        else
        {
            throw new RegraNegocioException(MensagensAcessoCasal.EmailEmUso);
        }

        acesso.Aceitar(usuario.Id, agora);
        _tokenRepository.Remover(token);
        var resultado = _autenticacaoService.IniciarSessao(usuario, organizacao);

        try
        {
            await _unidadeTrabalho.SalvarAsync(cancelamento);
        }
        catch (ConcorrenciaException)
        {
            throw new RegraNegocioException(MensagensAcessoCasal.ConviteInvalido);
        }
        catch (ConflitoException)
        {
            throw new RegraNegocioException(MensagensAcessoCasal.EmailEmUso);
        }

        RegistrarAceite(casamento.Id, acesso.Id, usuario.Id);
        return resultado;
    }

    private static bool PodeReativar(Usuario existente, CasamentoAssessorado casamento)
    {
        return existente is { Papel: PapelUsuario.Casal, Ativo: false }
            && existente.CasamentoId == casamento.Id
            && existente.OrganizacaoId == casamento.OrganizacaoId;
    }

    private async Task GarantirEmailDisponivelAsync(string email, Guid casamentoId, CancellationToken cancelamento)
    {
        var existente = await _usuarioRepository.ObterPorEmailAsync(email, cancelamento);
        if (existente is null)
        {
            return;
        }

        var reativavel = existente is { Papel: PapelUsuario.Casal, Ativo: false } && existente.CasamentoId == casamentoId;
        if (!reativavel)
        {
            throw new RegraNegocioException(MensagensAcessoCasal.EmailEmUso);
        }
    }

    private async Task<(AcessoCasal Acesso, TokenAcessoCasal Token, CasamentoAssessorado Casamento, Organizacao Organizacao)> ResolverAsync(
        string? valorToken,
        CancellationToken cancelamento)
    {
        if (!FormatoTokenConviteCasal.Valido(valorToken))
        {
            throw new RegraNegocioException(MensagensAcessoCasal.ConviteInvalido);
        }

        var token = await _tokenRepository.ObterPorHashAsync(_geradorToken.CalcularHash(valorToken!), cancelamento)
            ?? throw new RegraNegocioException(MensagensAcessoCasal.ConviteInvalido);

        _escopo.Fixar(token.OrganizacaoId, token.CasamentoId);

        var acesso = await _acessoRepository.ObterPorIdAsync(token.CasamentoId, token.AcessoCasalId, cancelamento);
        var casamento = await _casamentoRepository.ObterPorIdAsync(token.CasamentoId, cancelamento);
        var organizacao = await _organizacaoRepository.ObterPorIdAsync(token.OrganizacaoId, cancelamento);

        if (acesso is null || casamento is null || organizacao is null
            || acesso.Situacao(_relogio.GetUtcNow()) != SituacaoAcessoCasal.Pendente)
        {
            throw new RegraNegocioException(MensagensAcessoCasal.ConviteInvalido);
        }

        return (acesso, token, casamento, organizacao);
    }

    private async Task EnviarConviteAsync(AcessoCasal acesso, CasamentoAssessorado casamento, string valorToken, CancellationToken cancelamento)
    {
        var organizacao = await _organizacaoRepository.ObterPorIdAsync(casamento.OrganizacaoId, cancelamento);
        var link = $"{_opcoes.UrlFrontend.TrimEnd('/')}{CaminhoAceite}{Uri.EscapeDataString(valorToken)}";
        var mensagem = ModelosEmail.ConviteAcessoCasal(
            acesso.Nome,
            acesso.Email,
            link,
            $"{casamento.NomePrimeiraPessoa} & {casamento.NomeSegundaPessoa}",
            organizacao?.Nome ?? string.Empty,
            _opcoes.ValidadeConviteCasalDias);

        try
        {
            await _envioEmail.EnviarAsync(mensagem, cancelamento);
        }
        catch (Exception excecao) when (excecao is not OperationCanceledException)
        {
            RegistrarFalhaEnvio(excecao, casamento.Id, acesso.Id);
        }
    }

    private async Task<CasamentoAssessorado> ObterCasamentoAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        return await _casamentoRepository.ObterPorIdAsync(casamentoId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensCasamento.NaoEncontrado);
    }

    private async Task<AcessoCasal> ObterAcessoAsync(Guid casamentoId, Guid acessoId, CancellationToken cancelamento)
    {
        var acesso = await _acessoRepository.ObterPorIdAsync(casamentoId, acessoId, cancelamento);
        if (acesso is null || acesso.RevogadoEm is not null)
        {
            throw new RecursoNaoEncontradoException(MensagensAcessoCasal.AcessoNaoEncontrado);
        }

        return acesso;
    }

    private Guid ObterUsuarioAtual()
    {
        return _usuarioAtual.UsuarioId
            ?? throw new InvalidOperationException("A gestão do acesso do casal exige um usuário autenticado.");
    }

    private static AcessoCasalDto ParaDto(AcessoCasal acesso, DateTimeOffset agora)
    {
        return new AcessoCasalDto(
            acesso.Id,
            acesso.Nome,
            acesso.Email,
            acesso.Situacao(agora).ToString(),
            acesso.ConvidadoEm,
            acesso.ConviteExpiraEm,
            acesso.AceitoEm);
    }

    [LoggerMessage(EventId = 9201, Level = LogLevel.Error, Message = "Falha ao enviar o convite de acesso do casal {AcessoId} do casamento {CasamentoId}.")]
    private partial void RegistrarFalhaEnvio(Exception excecao, Guid casamentoId, Guid acessoId);

    [LoggerMessage(EventId = 9202, Level = LogLevel.Information, Message = "Acesso do casal {AcessoId} do casamento {CasamentoId} revogado pelo usuário {UsuarioId}.")]
    private partial void RegistrarRevogacao(Guid casamentoId, Guid acessoId, Guid usuarioId);

    [LoggerMessage(EventId = 9203, Level = LogLevel.Information, Message = "Convite de acesso do casal {AcessoId} do casamento {CasamentoId} aceito pelo usuário {UsuarioId}.")]
    private partial void RegistrarAceite(Guid casamentoId, Guid acessoId, Guid usuarioId);
}
