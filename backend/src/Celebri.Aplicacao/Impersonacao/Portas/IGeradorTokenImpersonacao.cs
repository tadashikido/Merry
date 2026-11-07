using Celebri.Aplicacao.Autenticacao.Portas;
using Celebri.Dominio.Organizacoes;
using Celebri.Dominio.Usuarios;

namespace Celebri.Aplicacao.Impersonacao.Portas;

public interface IGeradorTokenImpersonacao
{
    TokenAcessoGerado Gerar(Usuario dono, Organizacao organizacao, Guid sessaoId);
}
