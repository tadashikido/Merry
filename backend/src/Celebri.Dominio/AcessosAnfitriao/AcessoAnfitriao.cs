using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Isolamento;
using Celebri.Dominio.Usuarios;

namespace Celebri.Dominio.AcessosAnfitriao;

public class AcessoAnfitriao : IPertenceEvento
{
    public const int LimitePorEvento = 2;
    public const int TamanhoMinimoNome = 2;
    public const int TamanhoMaximoNome = 120;

    private AcessoAnfitriao()
    {
        Nome = string.Empty;
        Email = string.Empty;
    }

    public Guid Id { get; private set; }

    public Guid OrganizacaoId { get; private set; }

    public Guid EventoId { get; private set; }

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

    public static AcessoAnfitriao Convidar(
        Guid eventoId,
        string nome,
        string email,
        Guid convidadoPorUsuarioId,
        DateTimeOffset agora,
        TimeSpan validade)
    {
        if (eventoId == Guid.Empty)
        {
            throw new ArgumentException("O evento do acesso é obrigatório.", nameof(eventoId));
        }

        if (convidadoPorUsuarioId == Guid.Empty)
        {
            throw new ArgumentException("O usuário que convida é obrigatório.", nameof(convidadoPorUsuarioId));
        }

        ValidarValidade(validade);

        var nomeNormalizado = (nome ?? string.Empty).Trim();
        if (nomeNormalizado.Length is < TamanhoMinimoNome or > TamanhoMaximoNome)
        {
            throw new RegraNegocioException(MensagensAcessoAnfitriao.NomeInvalido);
        }

        var emailNormalizado = NormalizadorEmail.Normalizar(email);
        if (emailNormalizado.Length == 0 || emailNormalizado.Length > NormalizadorEmail.TamanhoMaximo)
        {
            throw new RegraNegocioException(MensagensAcessoAnfitriao.EmailInvalido);
        }

        return new AcessoAnfitriao
        {
            Id = Guid.NewGuid(),
            EventoId = eventoId,
            Nome = nomeNormalizado,
            Email = emailNormalizado,
            ConvidadoEm = agora,
            ConvidadoPorUsuarioId = convidadoPorUsuarioId,
            ConviteExpiraEm = agora.Add(validade),
        };
    }

    public SituacaoAcessoAnfitriao Situacao(DateTimeOffset agora)
    {
        if (RevogadoEm is not null)
        {
            return SituacaoAcessoAnfitriao.Revogado;
        }

        if (AceitoEm is not null)
        {
            return SituacaoAcessoAnfitriao.Ativo;
        }

        return agora >= ConviteExpiraEm ? SituacaoAcessoAnfitriao.Expirado : SituacaoAcessoAnfitriao.Pendente;
    }

    public void Reenviar(DateTimeOffset agora, TimeSpan validade)
    {
        ValidarValidade(validade);

        var situacao = Situacao(agora);
        if (situacao == SituacaoAcessoAnfitriao.Revogado)
        {
            throw new ConflitoException(MensagensAcessoAnfitriao.AcessoRevogado);
        }

        if (situacao == SituacaoAcessoAnfitriao.Ativo)
        {
            throw new ConflitoException(MensagensAcessoAnfitriao.AcessoJaAtivo);
        }

        ReenviadoEm = agora;
        ConviteExpiraEm = agora.Add(validade);
    }

    public void Aceitar(Guid usuarioId, DateTimeOffset agora)
    {
        if (usuarioId == Guid.Empty)
        {
            throw new ArgumentException("O usuário dos anfitriões é obrigatório.", nameof(usuarioId));
        }

        if (Situacao(agora) != SituacaoAcessoAnfitriao.Pendente)
        {
            throw new RegraNegocioException(MensagensAcessoAnfitriao.ConviteInvalido);
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
            throw new ConflitoException(MensagensAcessoAnfitriao.AcessoRevogado);
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
