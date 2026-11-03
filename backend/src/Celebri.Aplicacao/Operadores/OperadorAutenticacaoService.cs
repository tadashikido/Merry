using Celebri.Aplicacao.Autenticacao;
using Celebri.Aplicacao.Autenticacao.Portas;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Operadores.Portas;
using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Operadores;
using Celebri.Dominio.Usuarios;
using Microsoft.Extensions.Options;

namespace Celebri.Aplicacao.Operadores;

public class OperadorAutenticacaoService : IOperadorAutenticacaoService
{
    private readonly IOperadorPlataformaRepository _operadorRepository;
    private readonly IRefreshTokenOperadorRepository _refreshTokenRepository;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly IHashSenhaService _hashSenhaService;
    private readonly IGeradorTokenOperador _geradorTokenOperador;
    private readonly IGeradorTokenOpaco _geradorTokenOpaco;
    private readonly OpcoesAutenticacao _opcoes;
    private readonly TimeProvider _relogio;

    public OperadorAutenticacaoService(
        IOperadorPlataformaRepository operadorRepository,
        IRefreshTokenOperadorRepository refreshTokenRepository,
        IUnidadeTrabalho unidadeTrabalho,
        IHashSenhaService hashSenhaService,
        IGeradorTokenOperador geradorTokenOperador,
        IGeradorTokenOpaco geradorTokenOpaco,
        IOptions<OpcoesAutenticacao> opcoes,
        TimeProvider relogio)
    {
        _operadorRepository = operadorRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _unidadeTrabalho = unidadeTrabalho;
        _hashSenhaService = hashSenhaService;
        _geradorTokenOperador = geradorTokenOperador;
        _geradorTokenOpaco = geradorTokenOpaco;
        _opcoes = opcoes.Value;
        _relogio = relogio;
    }

    public async Task<ResultadoAutenticacaoOperador> EntrarAsync(EntrarOperadorRequest request, CancellationToken cancelamento)
    {
        var email = NormalizadorEmail.Normalizar(request.Email);
        var operador = await _operadorRepository.ObterPorEmailAsync(email, cancelamento);
        var agora = _relogio.GetUtcNow();

        if (operador is null || !operador.Ativo || operador.EstaBloqueado(agora))
        {
            _hashSenhaService.VerificarFicticio(request.Senha);
            throw new CredenciaisInvalidasException(MensagensAutenticacao.CredenciaisInvalidas);
        }

        var verificacao = _hashSenhaService.Verificar(operador.SenhaHash, request.Senha);
        if (verificacao == ResultadoVerificacaoSenha.Invalida)
        {
            operador.RegistrarFalhaLogin(agora);
            await _unidadeTrabalho.SalvarAsync(cancelamento);
            throw new CredenciaisInvalidasException(MensagensAutenticacao.CredenciaisInvalidas);
        }

        if (verificacao == ResultadoVerificacaoSenha.ValidaPrecisaAtualizar)
        {
            operador.AtualizarHashSenha(_hashSenhaService.GerarHash(request.Senha));
        }

        operador.RegistrarLoginBemSucedido();
        var refreshToken = EmitirRefreshToken(operador.Id, Guid.NewGuid(), agora);

        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return MontarResultado(operador, refreshToken);
    }

    public async Task<ResultadoAutenticacaoOperador> RenovarAsync(string? refreshToken, CancellationToken cancelamento)
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
            if (await PodeReapresentarAsync(tokenAtual, agora, cancelamento))
            {
                return await ReemitirNaFamiliaAsync(tokenAtual, agora, cancelamento);
            }

            await RevogarFamiliaAsync(tokenAtual.Familia, agora, cancelamento);
            throw new CredenciaisInvalidasException(MensagensAutenticacao.SessaoInvalida);
        }

        if (!tokenAtual.EstaAtivo(agora))
        {
            throw new CredenciaisInvalidasException(MensagensAutenticacao.SessaoInvalida);
        }

        var operador = await _operadorRepository.ObterPorIdAsync(tokenAtual.OperadorId, cancelamento);
        if (operador is null || !operador.Ativo)
        {
            tokenAtual.Revogar(agora);
            await _unidadeTrabalho.SalvarAsync(cancelamento);
            throw new CredenciaisInvalidasException(MensagensAutenticacao.SessaoInvalida);
        }

        tokenAtual.Substituir(agora);
        var novoRefreshToken = EmitirRefreshToken(operador.Id, tokenAtual.Familia, agora);

        try
        {
            await _unidadeTrabalho.SalvarAsync(cancelamento);
        }
        catch (ConcorrenciaException)
        {
            throw new CredenciaisInvalidasException(MensagensAutenticacao.SessaoInvalida);
        }

        return MontarResultado(operador, novoRefreshToken);
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
        }
    }

    public async Task<OperadorAutenticadoDto> ObterOperadorAsync(Guid operadorId, CancellationToken cancelamento)
    {
        var operador = await _operadorRepository.ObterPorIdAsync(operadorId, cancelamento);
        if (operador is null || !operador.Ativo)
        {
            throw new RecursoNaoEncontradoException(MensagensAutenticacao.UsuarioNaoEncontrado);
        }

        return Mapear(operador);
    }

    public async Task AlterarSenhaAsync(Guid operadorId, AlterarSenhaOperadorRequest request, CancellationToken cancelamento)
    {
        var operador = await _operadorRepository.ObterPorIdAsync(operadorId, cancelamento);
        if (operador is null || !operador.Ativo)
        {
            throw new RecursoNaoEncontradoException(MensagensAutenticacao.UsuarioNaoEncontrado);
        }

        if (_hashSenhaService.Verificar(operador.SenhaHash, request.SenhaAtual) == ResultadoVerificacaoSenha.Invalida)
        {
            throw new RegraNegocioException(MensagensOperador.SenhaAtualIncorreta);
        }

        var erroSenha = PoliticaSenha.Validar(request.NovaSenha, operador.Email);
        if (erroSenha is not null)
        {
            throw new RegraNegocioException(erroSenha);
        }

        operador.AlterarSenha(_hashSenhaService.GerarHash(request.NovaSenha), _relogio.GetUtcNow());
        await _unidadeTrabalho.SalvarAsync(cancelamento);
    }

    private async Task<bool> PodeReapresentarAsync(RefreshTokenOperador token, DateTimeOffset agora, CancellationToken cancelamento)
    {
        var janela = TimeSpan.FromSeconds(Math.Max(0, _opcoes.JanelaReusoRefreshTokenSegundos));
        if (!token.PodeSerReapresentado(agora, janela))
        {
            return false;
        }

        var naoUtilizados = await _refreshTokenRepository.ListarNaoUtilizadosDaFamiliaAsync(token.Familia, cancelamento);
        return naoUtilizados.Any(ativo => ativo.EstaAtivo(agora));
    }

    private async Task<ResultadoAutenticacaoOperador> ReemitirNaFamiliaAsync(RefreshTokenOperador token, DateTimeOffset agora, CancellationToken cancelamento)
    {
        var operador = await _operadorRepository.ObterPorIdAsync(token.OperadorId, cancelamento);
        if (operador is null || !operador.Ativo)
        {
            throw new CredenciaisInvalidasException(MensagensAutenticacao.SessaoInvalida);
        }

        var novoRefreshToken = EmitirRefreshToken(operador.Id, token.Familia, agora);
        await _unidadeTrabalho.SalvarAsync(cancelamento);
        return MontarResultado(operador, novoRefreshToken);
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
        }
    }

    private (RefreshTokenOperador Entidade, string Valor) EmitirRefreshToken(Guid operadorId, Guid familia, DateTimeOffset agora)
    {
        var valor = _geradorTokenOpaco.Gerar();
        var entidade = RefreshTokenOperador.Emitir(
            operadorId,
            familia,
            _geradorTokenOpaco.CalcularHash(valor),
            agora,
            agora.AddDays(_opcoes.ValidadeRefreshTokenDias));

        _refreshTokenRepository.Adicionar(entidade);
        return (entidade, valor);
    }

    private ResultadoAutenticacaoOperador MontarResultado(OperadorPlataforma operador, (RefreshTokenOperador Entidade, string Valor) refreshToken)
    {
        var tokenAcesso = _geradorTokenOperador.Gerar(operador);
        var sessao = new SessaoOperadorDto(tokenAcesso.Valor, tokenAcesso.ExpiraEm, Mapear(operador));
        return new ResultadoAutenticacaoOperador(sessao, refreshToken.Valor, refreshToken.Entidade.ExpiraEm);
    }

    private static OperadorAutenticadoDto Mapear(OperadorPlataforma operador)
    {
        return new OperadorAutenticadoDto(operador.Id, operador.Nome, operador.Email);
    }
}
