using System.Security.Cryptography;
using Casamento.Aplicacao.Autenticacao.Portas;
using Microsoft.AspNetCore.Identity;

namespace Casamento.Infraestrutura.Seguranca;

public class HashSenhaService : IHashSenhaService
{
    private static readonly ContaSenha Conta = new();

    private readonly PasswordHasher<ContaSenha> _hasher = new();
    private readonly Lazy<string> _hashFicticio;

    public HashSenhaService()
    {
        _hashFicticio = new Lazy<string>(() => _hasher.HashPassword(Conta, Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))));
    }

    public string GerarHash(string senha)
    {
        return _hasher.HashPassword(Conta, senha);
    }

    public ResultadoVerificacaoSenha Verificar(string senhaHash, string senha)
    {
        return _hasher.VerifyHashedPassword(Conta, senhaHash, senha) switch
        {
            PasswordVerificationResult.Success => ResultadoVerificacaoSenha.Valida,
            PasswordVerificationResult.SuccessRehashNeeded => ResultadoVerificacaoSenha.ValidaPrecisaAtualizar,
            _ => ResultadoVerificacaoSenha.Invalida,
        };
    }

    public void VerificarFicticio(string senha)
    {
        _hasher.VerifyHashedPassword(Conta, _hashFicticio.Value, senha ?? string.Empty);
    }

    private sealed class ContaSenha
    {
    }
}
