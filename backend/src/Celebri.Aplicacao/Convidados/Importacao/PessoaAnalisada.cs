using Celebri.Dominio.Convidados;

namespace Celebri.Aplicacao.Convidados.Importacao;

public sealed record PessoaAnalisada(
    int Linha,
    string Nome,
    string? Telefone,
    string? Email,
    FaixaEtaria FaixaEtaria,
    RespostaRsvp Resposta,
    SituacaoPessoaImportada Situacao);
