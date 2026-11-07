using Celebri.Dominio.Excecoes;

namespace Celebri.Dominio.Impersonacao;

public class SessaoImpersonacao
{
    public const int TamanhoMaximoMotivo = 500;

    private SessaoImpersonacao()
    {
        Motivo = string.Empty;
    }

    public Guid Id { get; private set; }

    public Guid OperadorId { get; private set; }

    public Guid OrganizacaoId { get; private set; }

    public string Motivo { get; private set; }

    public DateTimeOffset IniciadaEm { get; private set; }

    public DateTimeOffset ExpiraEm { get; private set; }

    public DateTimeOffset? EncerradaEm { get; private set; }

    public static SessaoImpersonacao Criar(Guid operadorId, Guid organizacaoId, string motivo, DateTimeOffset agora, TimeSpan validade)
    {
        if (operadorId == Guid.Empty || organizacaoId == Guid.Empty)
        {
            throw new RegraNegocioException("Operador e assessoria são obrigatórios para a visualização.");
        }

        var motivoNormalizado = (motivo ?? string.Empty).Trim();

        if (motivoNormalizado.Length == 0)
        {
            throw new RegraNegocioException("Informe o motivo da visualização.");
        }

        if (motivoNormalizado.Length > TamanhoMaximoMotivo)
        {
            throw new RegraNegocioException($"O motivo deve ter no máximo {TamanhoMaximoMotivo} caracteres.");
        }

        return new SessaoImpersonacao
        {
            Id = Guid.NewGuid(),
            OperadorId = operadorId,
            OrganizacaoId = organizacaoId,
            Motivo = motivoNormalizado,
            IniciadaEm = agora,
            ExpiraEm = agora.Add(validade),
        };
    }

    public bool EstaAtiva(DateTimeOffset agora)
    {
        return EncerradaEm is null && ExpiraEm > agora;
    }

    public void Encerrar(DateTimeOffset agora)
    {
        EncerradaEm ??= agora;
    }
}
