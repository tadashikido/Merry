using Celebri.Dominio.Excecoes;

namespace Celebri.Dominio.Usuarios;

public class Usuario
{
    public const int TamanhoMinimoNome = 2;
    public const int TamanhoMaximoNome = 120;
    public const int TamanhoMaximoSenhaHash = 512;
    public const int TamanhoMaximoPapel = 20;

    private Usuario()
    {
        Nome = string.Empty;
        Email = string.Empty;
        SenhaHash = string.Empty;
    }

    public Guid Id { get; private set; }

    public Guid OrganizacaoId { get; private set; }

    public Guid? EventoId { get; private set; }

    public string Nome { get; private set; }

    public string Email { get; private set; }

    public string SenhaHash { get; private set; }

    public PapelUsuario Papel { get; private set; }

    public bool Ativo { get; private set; }

    public int FalhasLoginConsecutivas { get; private set; }

    public DateTimeOffset? BloqueadoAte { get; private set; }

    public DateTimeOffset CriadoEm { get; private set; }

    public DateTimeOffset? SenhaAlteradaEm { get; private set; }

    public static Usuario CriarDono(Guid organizacaoId, string nome, string email, string senhaHash, DateTimeOffset agora)
    {
        return Criar(organizacaoId, null, PapelUsuario.Dono, nome, email, senhaHash, agora);
    }

    public static Usuario CriarAnfitriao(Guid organizacaoId, Guid eventoId, string nome, string email, string senhaHash, DateTimeOffset agora)
    {
        if (organizacaoId == Guid.Empty)
        {
            throw new ArgumentException("A organização do usuário dos anfitriões é obrigatória.", nameof(organizacaoId));
        }

        if (eventoId == Guid.Empty)
        {
            throw new ArgumentException("O evento do usuário dos anfitriões é obrigatório.", nameof(eventoId));
        }

        return Criar(organizacaoId, eventoId, PapelUsuario.Anfitriao, nome, email, senhaHash, agora);
    }

    public void Desativar()
    {
        Ativo = false;
    }

    public void ReativarAnfitriao(Guid eventoId, string nome, string senhaHash, DateTimeOffset agora)
    {
        if (Papel != PapelUsuario.Anfitriao || EventoId != eventoId)
        {
            throw new RegraNegocioException("Somente o acesso dos anfitriões deste evento pode ser reativado.");
        }

        if (Ativo)
        {
            throw new RegraNegocioException("Este acesso dos anfitriões já está ativo.");
        }

        Nome = NormalizarNome(nome);
        AlterarSenha(senhaHash, agora);
        Ativo = true;
    }

    private static Usuario Criar(
        Guid organizacaoId,
        Guid? eventoId,
        PapelUsuario papel,
        string nome,
        string email,
        string senhaHash,
        DateTimeOffset agora)
    {
        var nomeNormalizado = NormalizarNome(nome);
        var emailNormalizado = NormalizadorEmail.Normalizar(email);

        if (emailNormalizado.Length == 0 || emailNormalizado.Length > NormalizadorEmail.TamanhoMaximo)
        {
            throw new RegraNegocioException("Informe um e-mail válido.");
        }

        if (string.IsNullOrWhiteSpace(senhaHash))
        {
            throw new RegraNegocioException("A senha do usuário é obrigatória.");
        }

        return new Usuario
        {
            Id = Guid.NewGuid(),
            OrganizacaoId = organizacaoId,
            EventoId = eventoId,
            Nome = nomeNormalizado,
            Email = emailNormalizado,
            SenhaHash = senhaHash,
            Papel = papel,
            Ativo = true,
            CriadoEm = agora,
        };
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
            throw new RegraNegocioException("A senha do usuário é obrigatória.");
        }

        SenhaHash = senhaHash;
    }

    public void AlterarSenha(string senhaHash, DateTimeOffset agora)
    {
        AtualizarHashSenha(senhaHash);
        SenhaAlteradaEm = agora;
        RegistrarLoginBemSucedido();
    }
}
