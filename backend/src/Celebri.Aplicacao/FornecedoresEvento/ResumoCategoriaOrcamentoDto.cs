namespace Celebri.Aplicacao.FornecedoresEvento;

public sealed record ResumoCategoriaOrcamentoDto(
    string Categoria,
    int Quantidade,
    int Contratados,
    decimal Orcado,
    decimal Contratado,
    decimal Pago,
    decimal Pendente,
    decimal Vencido,
    decimal Parcelado);
