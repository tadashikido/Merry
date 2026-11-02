using Celebri.Aplicacao.Autenticacao.Portas;
using Celebri.Dominio.Operadores;

namespace Celebri.Aplicacao.Operadores.Portas;

public interface IGeradorTokenOperador
{
    TokenAcessoGerado Gerar(OperadorPlataforma operador);
}
