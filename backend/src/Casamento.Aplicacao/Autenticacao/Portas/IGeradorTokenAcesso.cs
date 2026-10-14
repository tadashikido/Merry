using Casamento.Dominio.Organizacoes;
using Casamento.Dominio.Usuarios;

namespace Casamento.Aplicacao.Autenticacao.Portas;

public sealed record TokenAcessoGerado(string Valor, DateTimeOffset ExpiraEm);

public interface IGeradorTokenAcesso
{
    TokenAcessoGerado Gerar(Usuario usuario, Organizacao organizacao);
}
