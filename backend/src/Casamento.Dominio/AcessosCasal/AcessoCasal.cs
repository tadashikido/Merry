using Casamento.Dominio.Excecoes;
using Casamento.Dominio.Isolamento;
using Casamento.Dominio.Usuarios;

namespace Casamento.Dominio.AcessosCasal;

public class AcessoCasal : IPertenceCasamento
{
    public const int LimitePorCasamento = 2;
    public const int TamanhoMinimoNome = 2;
    public const int TamanhoMaximoNome = 120;

    private AcessoCasal()
    {
        Nome = string.Empty;
        Email = string.Empty;
    }

    public Guid Id { get; private set; }

    public Guid OrganizacaoId { get; private set; }

    public Guid CasamentoId { get; private set; }

    public string Nome { get; private set; }

    public string Email { get; private set; }

    public DateTimeOffset ConvidadoEm { get; private set; }

    public Guid ConvidadoPorUsuarioId { get; private set; }

    public DateTimeOffset ConviteExpiraEm { get; private set; }

    public DateTimeOffset? ReenviadoEm { get; private set; }

    public DateTimeOffset? AceitoEm { get; private set; }

    public Guid? UsuarioId { get; private set; }

    public DateTimeOffset? RevogadoEm { get; private set; }

    public Guid? RevogadoPorUsuarioId { get; private set; }

    public static AcessoCasal Convidar(
        Guid casamentoId,
        string nome,
        string email,
        Guid convidadoPorUsuarioId,
        DateTimeOffset agora,
        TimeSpan validade)
    {
        if (casamentoId == Guid.Empty)
        {
            throw new ArgumentException("O casamento do acesso é obrigatório.", nameof(casamentoId));
        }

        if (convidadoPorUsuarioId == Guid.Empty)
        {
            throw new ArgumentException("O usuário que convida é obrigatório.", nameof(convidadoPorUsuarioId));
        }

        ValidarValidade(validade);

        var nomeNormalizado = (nome ?? string.Empty).Trim();
        if (nomeNormalizado.Length is < TamanhoMinimoNome or > TamanhoMaximoNome)
        {
            throw new RegraNegocioException(MensagensAcessoCasal.NomeInvalido);
        }

        var emailNormalizado = NormalizadorEmail.Normalizar(email);
        if (emailNormalizado.Length == 0 || emailNormalizado.Length > NormalizadorEmail.TamanhoMaximo)
        {
            throw new RegraNegocioException(MensagensAcessoCasal.EmailInvalido);
        }

        return new AcessoCasal
        {
            Id = Guid.NewGuid(),
            CasamentoId = casamentoId,
            Nome = nomeNormalizado,
            Email = emailNormalizado,
            ConvidadoEm = agora,
            ConvidadoPorUsuarioId = convidadoPorUsuarioId,
            ConviteExpiraEm = agora.Add(validade),
        };
    }

    public SituacaoAcessoCasal Situacao(DateTimeOffset agora)
    {
        if (RevogadoEm is not null)
        {
            return SituacaoAcessoCasal.Revogado;
        }

        if (AceitoEm is not null)
        {
            return SituacaoAcessoCasal.Ativo;
        }

        return agora >= ConviteExpiraEm ? SituacaoAcessoCasal.Expirado : SituacaoAcessoCasal.Pendente;
    }

    public void Reenviar(DateTimeOffset agora, TimeSpan validade)
    {
        ValidarValidade(validade);

        var situacao = Situacao(agora);
        if (situacao == SituacaoAcessoCasal.Revogado)
        {
            throw new ConflitoException(MensagensAcessoCasal.AcessoRevogado);
        }

        if (situacao == SituacaoAcessoCasal.Ativo)
        {
            throw new ConflitoException(MensagensAcessoCasal.AcessoJaAtivo);
        }

        ReenviadoEm = agora;
        ConviteExpiraEm = agora.Add(validade);
    }

    public void Aceitar(Guid usuarioId, DateTimeOffset agora)
    {
        if (usuarioId == Guid.Empty)
        {
            throw new ArgumentException("O usuário do casal é obrigatório.", nameof(usuarioId));
        }

        if (Situacao(agora) != SituacaoAcessoCasal.Pendente)
        {
            throw new RegraNegocioException(MensagensAcessoCasal.ConviteInvalido);
        }

        AceitoEm = agora;
        UsuarioId = usuarioId;
    }

    public void Revogar(Guid revogadoPorUsuarioId, DateTimeOffset agora)
    {
        if (revogadoPorUsuarioId == Guid.Empty)
        {
            throw new ArgumentException("O usuário que revoga é obrigatório.", nameof(revogadoPorUsuarioId));
        }

        if (RevogadoEm is not null)
        {
            throw new ConflitoException(MensagensAcessoCasal.AcessoRevogado);
        }

        RevogadoEm = agora;
        RevogadoPorUsuarioId = revogadoPorUsuarioId;
    }

    private static void ValidarValidade(TimeSpan validade)
    {
        if (validade <= TimeSpan.Zero)
        {
            throw new ArgumentOutOfRangeException(nameof(validade), "A validade do convite deve ser positiva.");
        }
    }
}
