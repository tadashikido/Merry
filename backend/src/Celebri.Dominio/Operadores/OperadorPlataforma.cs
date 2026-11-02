using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Usuarios;

namespace Celebri.Dominio.Operadores;

public class OperadorPlataforma
{
    public const int TamanhoMinimoNome = 2;
    public const int TamanhoMaximoNome = 120;
    public const int TamanhoMaximoSenhaHash = 512;

    private OperadorPlataforma()
    {
        Nome = string.Empty;
        Email = string.Empty;
        SenhaHash = string.Empty;
    }

    public Guid Id { get; private set; }

    public string Nome { get; private set; }

    public string Email { get; private set; }

    public string SenhaHash { get; private set; }

    public bool Ativo { get; private set; }

    public int FalhasLoginConsecutivas { get; private set; }

    public DateTimeOffset? BloqueadoAte { get; private set; }

    public DateTimeOffset CriadoEm { get; private set; }

    public DateTimeOffset? SenhaAlteradaEm { get; private set; }

    public static OperadorPlataforma Criar(string nome, string email, string senhaHash, DateTimeOffset agora)
    {
        var nomeNormalizado = NormalizarNome(nome);
        var emailNormalizado = NormalizadorEmail.Normalizar(email);

        if (emailNormalizado.Length == 0 || emailNormalizado.Length > NormalizadorEmail.TamanhoMaximo)
        {
            throw new RegraNegocioException("Informe um e-mail válido.");
        }

        if (string.IsNullOrWhiteSpace(senhaHash))
        {
            throw new RegraNegocioException("A senha do operador é obrigatória.");
        }

        return new OperadorPlataforma
        {
            Id = Guid.NewGuid(),
            Nome = nomeNormalizado,
            Email = emailNormalizado,
            SenhaHash = senhaHash,
            Ativo = true,
            CriadoEm = agora,
        };
    }

    public void Desativar()
    {
        Ativo = false;
    }

    public bool EstaBloqueado(DateTimeOffset agora)
    {
        return BloqueadoAte.HasValue && BloqueadoAte.Value > agora;
    }

    public void RegistrarFalhaLogin(DateTimeOffset agora)
    {
        if (EstaBloqueado(agora))
        {
            return;
        }

        FalhasLoginConsecutivas++;

        if (FalhasLoginConsecutivas >= PoliticaBloqueio.FalhasPermitidas)
        {
            BloqueadoAte = agora.Add(PoliticaBloqueio.DuracaoBloqueio);
            FalhasLoginConsecutivas = 0;
        }
    }

    public void RegistrarLoginBemSucedido()
    {
        FalhasLoginConsecutivas = 0;
        BloqueadoAte = null;
    }

    public void AtualizarHashSenha(string senhaHash)
    {
        if (string.IsNullOrWhiteSpace(senhaHash))
        {
            throw new RegraNegocioException("A senha do operador é obrigatória.");
        }

        SenhaHash = senhaHash;
    }

    public void AlterarSenha(string senhaHash, DateTimeOffset agora)
    {
        AtualizarHashSenha(senhaHash);
        SenhaAlteradaEm = agora;
        RegistrarLoginBemSucedido();
    }

    private static string NormalizarNome(string? nome)
    {
        var nomeNormalizado = (nome ?? string.Empty).Trim();

        if (nomeNormalizado.Length is < TamanhoMinimoNome or > TamanhoMaximoNome)
        {
            throw new RegraNegocioException($"O nome deve ter entre {TamanhoMinimoNome} e {TamanhoMaximoNome} caracteres.");
        }

        return nomeNormalizado;
    }
}
