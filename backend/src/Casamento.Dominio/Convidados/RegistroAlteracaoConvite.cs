using Casamento.Dominio.Isolamento;

namespace Casamento.Dominio.Convidados;

public class RegistroAlteracaoConvite : IPertenceCasamento
{
    public const int TamanhoMaximoPapel = 20;

    private RegistroAlteracaoConvite()
    {
    }

    public Guid Id { get; private set; }

    public Guid OrganizacaoId { get; private set; }

    public Guid CasamentoId { get; private set; }

    public Guid ConviteId { get; private set; }

    public AcaoAlteracaoConvite Acao { get; private set; }

    public Guid? UsuarioId { get; private set; }

    public string? PapelUsuario { get; private set; }

    public DateTimeOffset OcorridoEm { get; private set; }

    public static RegistroAlteracaoConvite Registrar(
        Guid organizacaoId,
        Guid casamentoId,
        Guid conviteId,
        AcaoAlteracaoConvite acao,
        Guid? usuarioId,
        string? papelUsuario,
        DateTimeOffset agora)
    {
        if (casamentoId == Guid.Empty || conviteId == Guid.Empty)
        {
            throw new ArgumentException("Casamento e convite são obrigatórios na trilha de alterações.");
        }

        var papel = usuarioId is null || string.IsNullOrWhiteSpace(papelUsuario) ? null : papelUsuario.Trim();
        if (papel is { Length: > TamanhoMaximoPapel })
        {
            papel = papel[..TamanhoMaximoPapel];
        }

        return new RegistroAlteracaoConvite
        {
            Id = Guid.NewGuid(),
            OrganizacaoId = organizacaoId,
            CasamentoId = casamentoId,
            ConviteId = conviteId,
            Acao = acao,
            UsuarioId = usuarioId,
            PapelUsuario = papel,
            OcorridoEm = agora,
        };
    }
}
