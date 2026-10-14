using Casamento.Aplicacao.Persistencia;
using Casamento.Dominio.Usuarios;
using Microsoft.EntityFrameworkCore;

namespace Casamento.Infraestrutura.Persistencia.Repositorios;

public class UsuarioRepository : IUsuarioRepository
{
    private readonly CasamentoDbContext _contexto;

    public UsuarioRepository(CasamentoDbContext contexto)
    {
        _contexto = contexto;
    }

    public Task<Usuario?> ObterPorEmailAsync(string emailNormalizado, CancellationToken cancelamento)
    {
        return _contexto.Usuarios.FirstOrDefaultAsync(usuario => usuario.Email == emailNormalizado, cancelamento);
    }

    public Task<Usuario?> ObterPorIdAsync(Guid id, CancellationToken cancelamento)
    {
        return _contexto.Usuarios.FirstOrDefaultAsync(usuario => usuario.Id == id, cancelamento);
    }

    public Task<bool> ExisteEmailAsync(string emailNormalizado, CancellationToken cancelamento)
    {
        return _contexto.Usuarios.AnyAsync(usuario => usuario.Email == emailNormalizado, cancelamento);
    }

    public void Adicionar(Usuario usuario)
    {
        _contexto.Usuarios.Add(usuario);
    }
}
