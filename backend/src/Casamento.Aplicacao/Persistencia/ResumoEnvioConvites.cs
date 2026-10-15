namespace Casamento.Aplicacao.Persistencia;

public sealed record ResumoEnvioConvites(bool PossuiConvites, bool PossuiEnviados)
{
    public static readonly ResumoEnvioConvites Vazio = new(false, false);
}
