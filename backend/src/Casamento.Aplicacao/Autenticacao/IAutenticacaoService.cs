using Casamento.Dominio.Organizacoes;
using Casamento.Dominio.Usuarios;

namespace Casamento.Aplicacao.Autenticacao;

public interface IAutenticacaoService
{
    Task<ResultadoAutenticacao> CadastrarAsync(CadastroOrganizacaoRequest request, CancellationToken cancelamento);

    Task<ResultadoAutenticacao> EntrarAsync(EntrarRequest request, CancellationToken cancelamento);

    Task<ResultadoAutenticacao> RenovarAsync(string? refreshToken, CancellationToken cancelamento);

    Task SairAsync(string? refreshToken, CancellationToken cancelamento);

    Task<UsuarioAutenticadoDto> ObterUsuarioAsync(Guid usuarioId, CancellationToken cancelamento);

    ResultadoAutenticacao IniciarSessao(Usuario usuario, Organizacao organizacao);
}
