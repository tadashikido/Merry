namespace Celebri.Aplicacao.Autenticacao.Portas;

public enum ResultadoVerificacaoSenha
{
    Invalida = 0,
    Valida = 1,
    ValidaPrecisaAtualizar = 2,
}

public interface IHashSenhaService
{
    string GerarHash(string senha);

    ResultadoVerificacaoSenha Verificar(string senhaHash, string senha);

    void VerificarFicticio(string senha);
}
