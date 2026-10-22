using Casamento.Dominio.Convidados;

namespace Casamento.Aplicacao.Convidados;

public sealed record ContagemConvidados(FaixaEtaria FaixaEtaria, RespostaRsvp Resposta, int Quantidade);
