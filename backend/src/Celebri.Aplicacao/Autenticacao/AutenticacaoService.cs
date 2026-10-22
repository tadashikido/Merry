using Celebri.Aplicacao.Autenticacao.Portas;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Autenticacao;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Organizacoes;
using Celebri.Dominio.Usuarios;
using Microsoft.Extensions.Options;

namespace Celebri.Aplicacao.Autenticacao;

public class AutenticacaoService : IAutenticacaoService
{
    private readonly IUsuarioRepository _usuarioRepository;
    private readonly IOrganizacaoRepository _organizacaoRepository;
    private readonly IRefreshTokenRepository _refreshTokenRepository;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly IHashSenhaService _hashSenhaService;
    private readonly IGeradorTokenAcesso _geradorTokenAcesso;
    private readonly IGeradorTokenOpaco _geradorTokenOpaco;
    private readonly OpcoesAutenticacao _opcoes;
    private readonly TimeProvider _relogio;

    public AutenticacaoService(
        IUsuarioRepository usuarioRepository,
        IOrganizacaoRepository organizacaoRepository,
        IRefreshTokenRepository refreshTokenRepository,
        IUnidadeTrabalho unidadeTrabalho,
        IHashSenhaService hashSenhaService,
        IGeradorTokenAcesso geradorTokenAcesso,
        IGeradorTokenOpaco geradorTokenOpaco,
        IOptions<OpcoesAutenticacao> opcoes,
        TimeProvider relogio)
    {
        _usuarioRepository = usuarioRepository;
        _organizacaoRepository = organizacaoRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _unidadeTrabalho = unidadeTrabalho;
        _hashSenhaService = hashSenhaService;
        _geradorTokenAcesso = geradorTokenAcesso;
        _geradorTokenOpaco = geradorTokenOpaco;
        _opcoes = opcoes.Value;
        _relogio = relogio;
    }

    public async Task<ResultadoAutenticacao> CadastrarAsync(CadastroOrganizacaoRequest request, CancellationToken cancelamento)
    {
        var email = NormalizadorEmail.Normalizar(request.Email);
        var erroSenha = PoliticaSenha.Validar(request.Senha, email);
        if (erroSenha is not null)
        {
            throw new RegraNegocioException(erroSenha);
        }

        if (await _usuarioRepository.ExisteEmailAsync(email, cancelamento))
        {
            throw new ConflitoException(MensagensAutenticacao.EmailEmUso);
        }

        var agora = _relogio.GetUtcNow();
        var organizacao = Organizacao.Criar(request.NomeAssessoria, agora);
        var usuario = Usuario.CriarDono(organizacao.Id, request.Nome, email, _hashSenhaService.GerarHash(request.Senha), agora);

        _organizacaoRepository.Adicionar(organizacao);
        _usuarioRepository.Adicionar(usuario);
        var refreshToken = EmitirRefreshToken(usuario.Id, Guid.NewGuid(), agora);

        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return MontarResultado(usuario, organizacao, refreshToken);
    }

    public async Task<ResultadoAutenticacao> EntrarAsync(EntrarRequest request, CancellationToken cancelamento)
    {
        var email = NormalizadorEmail.Normalizar(request.Email);
        var usuario = await _usuarioRepository.ObterPorEmailAsync(email, cancelamento);
        var agora = _relogio.GetUtcNow();

        if (usuario is null || !usuario.Ativo || usuario.EstaBloqueado(agora))
        {
            _hashSenhaService.VerificarFicticio(request.Senha);
            throw new CredenciaisInvalidasException(MensagensAutenticacao.CredenciaisInvalidas);
        }

        var verificacao = _hashSenhaService.Verificar(usuario.SenhaHash, request.Senha);
        if (verificacao == ResultadoVerificacaoSenha.Invalida)
        {
            usuario.RegistrarFalhaLogin(agora);
            await _unidadeTrabalho.SalvarAsync(cancelamento);
            throw new CredenciaisInvalidasException(MensagensAutenticacao.CredenciaisInvalidas);
        }

        if (verificacao == ResultadoVerificacaoSenha.ValidaPrecisaAtualizar)
        {
            usuario.AtualizarHashSenha(_hashSenhaService.GerarHash(request.Senha));
        }

        var organizacao = await ObterOrganizacaoAsync(usuario.OrganizacaoId, cancelamento);
        usuario.RegistrarLoginBemSucedido();
        var refreshToken = EmitirRefreshToken(usuario.Id, Guid.NewGuid(), agora);

        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return MontarResultado(usuario, organizacao, refreshToken);
    }

    public async Task<ResultadoAutenticacao> RenovarAsync(string? refreshToken, CancellationToken cancelamento)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            throw new CredenciaisInvalidasException(MensagensAutenticacao.SessaoInvalida);
        }

        var tokenAtual = await _refreshTokenRepository.ObterPorHashAsync(_geradorTokenOpaco.CalcularHash(refreshToken), cancelamento);
        var agora = _relogio.GetUtcNow();

        if (tokenAtual is null)
        {
            throw new CredenciaisInvalidasException(MensagensAutenticacao.SessaoInvalida);
        }

        if (tokenAtual.FoiUtilizado)
        {
            await RevogarFamiliaAsync(tokenAtual.Familia, agora, cancelamento);
            throw new CredenciaisInvalidasException(MensagensAutenticacao.SessaoInvalida);
        }

        if (!tokenAtual.EstaAtivo(agora))
        {
            throw new CredenciaisInvalidasException(MensagensAutenticacao.SessaoInvalida);
        }

        var usuario = await _usuarioRepository.ObterPorIdAsync(tokenAtual.UsuarioId, cancelamento);
        if (usuario is null || !usuario.Ativo)
        {
            tokenAtual.Revogar(agora);
            await _unidadeTrabalho.SalvarAsync(cancelamento);
            throw new CredenciaisInvalidasException(MensagensAutenticacao.SessaoInvalida);
        }

        var organizacao = await ObterOrganizacaoAsync(usuario.OrganizacaoId, cancelamento);
        tokenAtual.Substituir(agora);
        var novoRefreshToken = EmitirRefreshToken(usuario.Id, tokenAtual.Familia, agora);

        try
        {
            await _unidadeTrabalho.SalvarAsync(cancelamento);
        }
        catch (ConcorrenciaException)
        {
            throw new CredenciaisInvalidasException(MensagensAutenticacao.SessaoInvalida);
        }

        return MontarResultado(usuario, organizacao, novoRefreshToken);
    }

    public async Task SairAsync(string? refreshToken, CancellationToken cancelamento)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return;
        }

        var token = await _refreshTokenRepository.ObterPorHashAsync(_geradorTokenOpaco.CalcularHash(refreshToken), cancelamento);
        if (token is null || token.FoiUtilizado)
        {
            return;
        }

        token.Revogar(_relogio.GetUtcNow());

        try
        {
            await _unidadeTrabalho.SalvarAsync(cancelamento);
        }
        catch (ConcorrenciaException)
        {
            return;
        }
    }

    public async Task<UsuarioAutenticadoDto> ObterUsuarioAsync(Guid usuarioId, CancellationToken cancelamento)
    {
        var usuario = await _usuarioRepository.ObterPorIdAsync(usuarioId, cancelamento);
        if (usuario is null || !usuario.Ativo)
        {
            throw new RecursoNaoEncontradoException(MensagensAutenticacao.UsuarioNaoEncontrado);
        }

        var organizacao = await ObterOrganizacaoAsync(usuario.OrganizacaoId, cancelamento);
        return MapearUsuario(usuario, organizacao);
    }

    public ResultadoAutenticacao IniciarSessao(Usuario usuario, Organizacao organizacao)
    {
        ArgumentNullException.ThrowIfNull(usuario);
        ArgumentNullException.ThrowIfNull(organizacao);

        var refreshToken = EmitirRefreshToken(usuario.Id, Guid.NewGuid(), _relogio.GetUtcNow());
        return MontarResultado(usuario, organizacao, refreshToken);
    }

    private async Task RevogarFamiliaAsync(Guid familia, DateTimeOffset agora, CancellationToken cancelamento)
    {
        var tokensAtivos = await _refreshTokenRepository.ListarNaoUtilizadosDaFamiliaAsync(familia, cancelamento);
        foreach (var token in tokensAtivos)
        {
            token.Revogar(agora);
        }

        try
        {
            await _unidadeTrabalho.SalvarAsync(cancelamento);
        }
        catch (ConcorrenciaException)
        {
            return;
        }
    }

    private async Task<Organizacao> ObterOrganizacaoAsync(Guid organizacaoId, CancellationToken cancelamento)
    {
        return await _organizacaoRepository.ObterPorIdAsync(organizacaoId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensAutenticacao.UsuarioNaoEncontrado);
    }

    private (RefreshToken Entidade, string Valor) EmitirRefreshToken(Guid usuarioId, Guid familia, DateTimeOffset agora)
    {
        var valor = _geradorTokenOpaco.Gerar();
        var entidade = RefreshToken.Emitir(
            usuarioId,
            familia,
            _geradorTokenOpaco.CalcularHash(valor),
            agora,
            agora.AddDays(_opcoes.ValidadeRefreshTokenDias));

        _refreshTokenRepository.Adicionar(entidade);
        return (entidade, valor);
    }

    private ResultadoAutenticacao MontarResultado(Usuario usuario, Organizacao organizacao, (RefreshToken Entidade, string Valor) refreshToken)
    {
        var tokenAcesso = _geradorTokenAcesso.Gerar(usuario, organizacao);
        var sessao = new SessaoDto(tokenAcesso.Valor, tokenAcesso.ExpiraEm, MapearUsuario(usuario, organizacao));
        return new ResultadoAutenticacao(sessao, refreshToken.Valor, refreshToken.Entidade.ExpiraEm);
    }

    private static UsuarioAutenticadoDto MapearUsuario(Usuario usuario, Organizacao organizacao)
    {
        return new UsuarioAutenticadoDto(
            usuario.Id,
            usuario.Nome,
            usuario.Email,
            usuario.Papel.ToString(),
            new OrganizacaoResumoDto(organizacao.Id, organizacao.Nome),
            usuario.EventoId);
    }
}
