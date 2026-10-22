using System.ComponentModel.DataAnnotations;
using Celebri.Aplicacao.Autenticacao;
using Celebri.Aplicacao.DadosSensiveis;
using Celebri.Dominio.Convidados;
using Celebri.Dominio.DadosSensiveis;

namespace Celebri.Aplicacao.Rsvp;

public sealed record ResponderRsvpRequest(
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    [StringLength(FormatoTokenRsvp.TamanhoMaximoEntrada, ErrorMessage = MensagensValidacao.Obrigatorio)]
    string? Token,
    [Required(ErrorMessage = MensagensConvidados.RespostaIncompleta)]
    [MaxLength(Convite.ConvidadosMaximo, ErrorMessage = MensagensConvidados.QuantidadeConvidados)]
    IReadOnlyList<RespostaPessoaRsvpRequest>? Pessoas,
    [MaxLength(Convite.LimiteAcompanhantesMaximo, ErrorMessage = MensagensConvidados.LimiteAcompanhantesExcedido)]
    IReadOnlyList<AcompanhanteRsvpRequest>? Acompanhantes,
    ConsentimentoRsvpRequest? Consentimento = null)
{
    public IReadOnlyList<RespostaPessoaRsvp> ParaRespostas()
    {
        return (Pessoas ?? [])
            .Select(pessoa => new RespostaPessoaRsvp(
                pessoa.Id ?? Guid.Empty,
                pessoa.Resposta ?? RespostaRsvp.Pendente,
                pessoa.Restricao?.ParaAlteracao()))
            .ToList();
    }

    public IReadOnlyList<DadosAcompanhanteRsvp> ParaAcompanhantes()
    {
        return (Acompanhantes ?? [])
            .Select(acompanhante => new DadosAcompanhanteRsvp(
                acompanhante.Id,
                acompanhante.Nome,
                acompanhante.FaixaEtaria ?? FaixaEtaria.Adulto,
                acompanhante.Restricao?.ParaAlteracao()))
            .ToList();
    }

    public ConsentimentoDadosSensiveis? ParaConsentimento(DateTimeOffset agora)
    {
        if (Consentimento?.Aceito != true)
        {
            return null;
        }

        if (!string.Equals(Consentimento.VersaoTermo, TermoPrivacidadeRsvp.VersaoVigente, StringComparison.Ordinal))
        {
            throw new Dominio.Excecoes.RegraNegocioException(MensagensDadosSensiveis.TermoDesatualizado);
        }

        return new ConsentimentoDadosSensiveis(agora, TermoPrivacidadeRsvp.VersaoVigente, OrigemConsentimento.Convidado, null);
    }
}
