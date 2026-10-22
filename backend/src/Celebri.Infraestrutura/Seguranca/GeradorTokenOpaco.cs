using System.Security.Cryptography;
using System.Text;
using Casamento.Aplicacao.Autenticacao.Portas;
using Microsoft.AspNetCore.WebUtilities;

namespace Casamento.Infraestrutura.Seguranca;

public class GeradorTokenOpaco : IGeradorTokenOpaco
{
    public const int TamanhoBytes = 32;

    public string Gerar()
    {
        return WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(TamanhoBytes));
    }

    public string CalcularHash(string valor)
    {
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(valor))).ToLowerInvariant();
    }
}
