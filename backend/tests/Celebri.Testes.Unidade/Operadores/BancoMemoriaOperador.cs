using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Operadores;

namespace Celebri.Testes.Unidade.Operadores;

public class BancoMemoriaOperador : IOperadorPlataformaRepository, IRefreshTokenOperadorRepository, IUnidadeTrabalho
{
    public List<OperadorPlataforma> Operadores { get; } = [];

    public List<RefreshTokenOperador> RefreshTokens { get; } = [];

    public int Salvamentos { get; private set; }

    public Exception? ExcecaoAoSalvar { get; set; }

    public Task<OperadorPlataforma?> ObterPorEmailAsync(string emailNormalizado, CancellationToken cancelamento)
    {
        return Task.FromResult(Operadores.FirstOrDefault(operador => operador.Email == emailNormalizado));
    }

    public Task<OperadorPlataforma?> ObterPorIdAsync(Guid id, CancellationToken cancelamento)
    {
        return Task.FromResult(Operadores.FirstOrDefault(operador => operador.Id == id));
    }

    public Task<bool> ExisteEmailAsync(string emailNormalizado, CancellationToken cancelamento)
    {
        return Task.FromResult(Operadores.Any(operador => operador.Email == emailNormalizado));
    }

    public void Adicionar(OperadorPlataforma operador)
    {
        Operadores.Add(operador);
    }

    public Task<RefreshTokenOperador?> ObterPorHashAsync(string tokenHash, CancellationToken cancelamento)
    {
        return Task.FromResult(RefreshTokens.FirstOrDefault(token => token.TokenHash == tokenHash));
    }

    public Task<IReadOnlyList<RefreshTokenOperador>> ListarNaoUtilizadosDaFamiliaAsync(Guid familia, CancellationToken cancelamento)
    {
        return Task.FromResult<IReadOnlyList<RefreshTokenOperador>>(
            RefreshTokens.Where(token => token.Familia == familia && !token.FoiUtilizado).ToList());
    }

    public void Adicionar(RefreshTokenOperador refreshToken)
    {
        RefreshTokens.Add(refreshToken);
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
