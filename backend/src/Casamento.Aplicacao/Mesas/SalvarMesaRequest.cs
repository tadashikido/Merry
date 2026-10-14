using System.ComponentModel.DataAnnotations;
using Casamento.Dominio.Mesas;

namespace Casamento.Aplicacao.Mesas;

public sealed record SalvarMesaRequest(
    [Required(ErrorMessage = MensagensMesas.NumeroObrigatorio)]
    [Range(Mesa.NumeroMinimo, Mesa.NumeroMaximo, ErrorMessage = MensagensMesas.NumeroForaDaFaixa)]
    int? Numero,
    [StringLength(Mesa.TamanhoMaximoNome, ErrorMessage = MensagensMesas.TamanhoNome)]
    string? Nome,
    [Required(ErrorMessage = MensagensMesas.CapacidadeObrigatoria)]
    [Range(Mesa.CapacidadeMinima, Mesa.CapacidadeMaxima, ErrorMessage = MensagensMesas.CapacidadeForaDaFaixa)]
    int? Capacidade,
    bool? Especial)
{
    public DadosMesa ParaDados()
    {
        return new DadosMesa(Numero ?? 0, Nome, Capacidade ?? 0, Especial ?? false);
    }
}
