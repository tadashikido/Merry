namespace Casamento.Dominio.DadosSensiveis;

public sealed record ConsentimentoDadosSensiveis(
    DateTimeOffset ConsentidoEm,
    string VersaoTermo,
    OrigemConsentimento Origem,
    Guid? RegistradoPorUsuarioId);
