using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Autenticacao;
using Celebri.Dominio.Organizacoes;
using Celebri.Dominio.Usuarios;

namespace Celebri.Testes.Unidade.Autenticacao.Fakes;

public class BancoMemoria : IUsuarioRepository, IOrganizacaoRepository, IRefreshTokenRepository, ITokenRedefinicaoSenhaRepository, IUnidadeTrabalho
{
    public List<Usuario> Usuarios { get; } = [];

    public List<Organizacao> Organizacoes { get; } = [];

    public List<RefreshToken> RefreshTokens { get; } = [];

    public List<TokenRedefinicaoSenha> TokensRedefinicao { get; } = [];

    public int Salvamentos { get; private set; }

    public Exception? ExcecaoAoSalvar { get; set; }

    public Task<Usuario?> ObterPorEmailAsync(string emailNormalizado, CancellationToken cancelamento)
    {
        return Task.FromResult(Usuarios.FirstOrDefault(usuario => usuario.Email == emailNormalizado));
    }

    public Task<Usuario?> ObterPorIdAsync(Guid id, CancellationToken cancelamento)
    {
        return Task.FromResult(Usuarios.FirstOrDefault(usuario => usuario.Id == id));
    }

    public Task<bool> ExisteEmailAsync(string emailNormalizado, CancellationToken cancelamento)
    {
        return Task.FromResult(Usuarios.Any(usuario => usuario.Email == emailNormalizado));
    }

    public void Adicionar(Usuario usuario)
    {
        Usuarios.Add(usuario);
    }

    Task<Organizacao?> IOrganizacaoRepository.ObterPorIdAsync(Guid id, CancellationToken cancelamento)
    {
        return Task.FromResult(Organizacoes.FirstOrDefault(organizacao => organizacao.Id == id));
    }

    public Task<IReadOnlyList<Guid>> ListarIdsAsync(CancellationToken cancelamento)
    {
        return Task.FromResult<IReadOnlyList<Guid>>(Organizacoes.Select(organizacao => organizacao.Id).ToList());
    }

    public void Adicionar(Organizacao organizacao)
    {
        Organizacoes.Add(organizacao);
    }

    Task<RefreshToken?> IRefreshTokenRepository.ObterPorHashAsync(string tokenHash, CancellationToken cancelamento)
    {
        return Task.FromResult(RefreshTokens.FirstOrDefault(token => token.TokenHash == tokenHash));
    }

    public Task<IReadOnlyList<RefreshToken>> ListarNaoUtilizadosDaFamiliaAsync(Guid familia, CancellationToken cancelamento)
    {
        return Task.FromResult<IReadOnlyList<RefreshToken>>(RefreshTokens.Where(token => token.Familia == familia && !token.FoiUtilizado).ToList());
    }

    public Task<IReadOnlyList<RefreshToken>> ListarNaoUtilizadosDoUsuarioAsync(Guid usuarioId, CancellationToken cancelamento)
    {
        return Task.FromResult<IReadOnlyList<RefreshToken>>(RefreshTokens.Where(token => token.UsuarioId == usuarioId && !token.FoiUtilizado).ToList());
    }

    public void Adicionar(RefreshToken refreshToken)
    {
        RefreshTokens.Add(refreshToken);
    }

    Task<TokenRedefinicaoSenha?> ITokenRedefinicaoSenhaRepository.ObterPorHashAsync(string tokenHash, CancellationToken cancelamento)
    {
        return Task.FromResult(TokensRedefinicao.FirstOrDefault(token => token.TokenHash == tokenHash));
    }

    public Task<IReadOnlyList<TokenRedefinicaoSenha>> ListarPendentesDoUsuarioAsync(Guid usuarioId, CancellationToken cancelamento)
    {
        return Task.FromResult<IReadOnlyList<TokenRedefinicaoSenha>>(
            TokensRedefinicao.Where(token => token.UsuarioId == usuarioId && token.UsadoEm is null && token.InvalidadoEm is null).ToList());
    }

    public void Adicionar(TokenRedefinicaoSenha token)
    {
        TokensRedefinicao.Add(token);
    }

    public Task SalvarAsync(CancellationToken cancelamento)
    {
        if (ExcecaoAoSalvar is not null)
        {
            var excecao = ExcecaoAoSalvar;
            ExcecaoAoSalvar = null;
            throw excecao;
        }

        Salvamentos++;
        return Task.CompletedTask;
    }
}
