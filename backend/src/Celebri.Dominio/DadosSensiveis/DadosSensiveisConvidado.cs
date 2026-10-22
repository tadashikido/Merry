using Celebri.Dominio.Isolamento;

namespace Celebri.Dominio.DadosSensiveis;

public class DadosSensiveisConvidado : IPertenceCasamento
{
    public const int TamanhoMaximoConteudoCifrado = 1024;
    public const int TamanhoMaximoVersaoTermo = 20;

    private DadosSensiveisConvidado()
    {
        VersaoTermo = string.Empty;
    }

    public Guid ConvidadoId { get; private set; }

    public Guid OrganizacaoId { get; private set; }

    public Guid CasamentoId { get; private set; }

    public string? ConteudoCifrado { get; private set; }

    public DateTimeOffset ConsentidoEm { get; private set; }

    public string VersaoTermo { get; private set; }

    public OrigemConsentimento OrigemConsentimento { get; private set; }

    public Guid? RegistradoPorUsuarioId { get; private set; }

    public DateTimeOffset AtualizadoEm { get; private set; }

    public DateTimeOffset? ExcluidoEm { get; private set; }

    public bool Vigente => ConteudoCifrado is not null;

    internal static DadosSensiveisConvidado Criar(
        Guid convidadoId,
        Guid casamentoId,
        string conteudoCifrado,
        ConsentimentoDadosSensiveis consentimento,
        DateTimeOffset agora)
    {
        var dados = new DadosSensiveisConvidado
        {
            ConvidadoId = convidadoId,
            CasamentoId = casamentoId,
        };

        dados.Substituir(conteudoCifrado, consentimento, agora);
        return dados;
    }

    internal void Substituir(string conteudoCifrado, ConsentimentoDadosSensiveis consentimento, DateTimeOffset agora)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(conteudoCifrado);
        ArgumentNullException.ThrowIfNull(consentimento);

        if (string.IsNullOrWhiteSpace(consentimento.VersaoTermo) || consentimento.VersaoTermo.Length > TamanhoMaximoVersaoTermo)
        {
            throw new ArgumentException("A versão do texto de privacidade é inválida.", nameof(consentimento));
        }

        if (conteudoCifrado.Length > TamanhoMaximoConteudoCifrado)
        {
            throw new ArgumentException("O conteúdo cifrado excede o tamanho permitido.", nameof(conteudoCifrado));
        }

        if (consentimento.Origem == OrigemConsentimento.Cerimonialista && consentimento.RegistradoPorUsuarioId is null)
        {
            throw new ArgumentException(MensagensDadosSensiveis.UsuarioObrigatorio, nameof(consentimento));
        }

        ConteudoCifrado = conteudoCifrado;
        ConsentidoEm = consentimento.ConsentidoEm;
        VersaoTermo = consentimento.VersaoTermo;
        OrigemConsentimento = consentimento.Origem;
        RegistradoPorUsuarioId = consentimento.Origem == OrigemConsentimento.Cerimonialista ? consentimento.RegistradoPorUsuarioId : null;
        AtualizadoEm = agora;
        ExcluidoEm = null;
    }
}
