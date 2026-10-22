using Celebri.Dominio.Convidados;

namespace Celebri.Aplicacao.Convidados;

public sealed record ContagemConvidados(FaixaEtaria FaixaEtaria, RespostaRsvp Resposta, int Quantidade);
