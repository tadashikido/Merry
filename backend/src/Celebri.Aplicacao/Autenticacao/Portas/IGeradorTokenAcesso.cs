using Celebri.Dominio.Organizacoes;
using Celebri.Dominio.Usuarios;

namespace Celebri.Aplicacao.Autenticacao.Portas;

public sealed record TokenAcessoGerado(string Valor, DateTimeOffset ExpiraEm);

public interface IGeradorTokenAcesso
{
    TokenAcessoGerado Gerar(Usuario usuario, Organizacao organizacao);
}
