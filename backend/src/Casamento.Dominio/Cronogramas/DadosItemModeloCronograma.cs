using Casamento.Dominio.Fornecedores;

namespace Casamento.Dominio.Cronogramas;

public sealed record DadosItemModeloCronograma(
    int MinutosDesdeCerimonia,
    int? DuracaoMinutos,
    string? Atividade,
    ReferenciaLocalCronograma? ReferenciaLocal,
    string? Local,
    string? Responsavel,
    CategoriaFornecedor? CategoriaFornecedor,
    string? Instrucoes);
