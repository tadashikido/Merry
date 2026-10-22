using Celebri.Aplicacao.Convidados;
using Celebri.Dominio.Convidados;
using Celebri.Dominio.Mesas;

namespace Celebri.Aplicacao.Mesas;

public static class MontadorMapaMesas
{
    public static IReadOnlyList<Mesa> Ordenar(IEnumerable<Mesa> mesas)
    {
        ArgumentNullException.ThrowIfNull(mesas);

        return mesas
            .OrderByDescending(mesa => mesa.Especial)
            .ThenBy(mesa => mesa.Numero)
            .ThenBy(mesa => mesa.Id)
            .ToList();
    }

    public static MapaMesasDto Montar(IEnumerable<Mesa> mesas, IEnumerable<Convite> convites, bool eventoArquivado)
    {
        ArgumentNullException.ThrowIfNull(mesas);
        ArgumentNullException.ThrowIfNull(convites);

        var mesasOrdenadas = Ordenar(mesas);
        var porId = mesasOrdenadas.ToDictionary(mesa => mesa.Id);
        var pessoas = new List<PessoaMesaDto>();
        var avisos = new List<AvisoSaidaMesaDto>();

        foreach (var convite in OrdenacaoConvites.Ordenar(convites))
        {
            foreach (var convidado in convite.ConvidadosOrdenados())
            {
                if (convidado.Resposta == RespostaRsvp.Confirmado)
                {
                    var mesaId = convidado.MesaId is { } identificador && porId.ContainsKey(identificador) ? identificador : (Guid?)null;
                    pessoas.Add(new PessoaMesaDto(
                        convidado.Id,
                        convidado.Nome,
                        convidado.FaixaEtaria.ToString(),
                        convidado.Acompanhante,
                        convite.Id,
                        convite.Nome,
                        convite.Grupo,
                        mesaId));
                }

                if (convidado.SaiuDaMesaEm is { } saiuEm)
                {
                    var mesaAnterior = convidado.MesaSaidaId is { } anterior ? porId.GetValueOrDefault(anterior) : null;
                    avisos.Add(new AvisoSaidaMesaDto(
                        convidado.Id,
                        convidado.Nome,
                        convite.Nome,
                        convidado.Resposta.ToString(),
                        mesaAnterior?.Id,
                        mesaAnterior?.Numero,
                        mesaAnterior?.Nome,
                        mesaAnterior?.Especial,
                        saiuEm));
                }
            }
        }

        var ocupacao = pessoas
            .Where(pessoa => pessoa.MesaId is not null)
            .GroupBy(pessoa => pessoa.MesaId!.Value)
            .ToDictionary(grupo => grupo.Key, grupo => grupo.Count());

        var mesasDto = mesasOrdenadas
            .Select(mesa => ParaDto(mesa, ocupacao.GetValueOrDefault(mesa.Id)))
            .ToList();

        var acomodados = pessoas.Count(pessoa => pessoa.MesaId is not null);
        var totais = new TotaisMesasDto(
            mesasDto.Count,
            mesasDto.Sum(mesa => mesa.Capacidade),
            pessoas.Count,
            acomodados,
            mesasDto.Sum(mesa => Math.Max(mesa.Capacidade - mesa.Ocupacao, 0)),
            pessoas.Count - acomodados);

        var avisosOrdenados = avisos
            .OrderByDescending(aviso => aviso.SaiuEm)
            .ThenBy(aviso => aviso.ConvidadoId)
            .ToList();

        return new MapaMesasDto(mesasDto, pessoas, avisosOrdenados, totais, eventoArquivado);
    }

    public static MesaDto ParaDto(Mesa mesa, int ocupacao)
    {
        ArgumentNullException.ThrowIfNull(mesa);

        return new MesaDto(mesa.Id, mesa.Numero, mesa.Nome, mesa.Capacidade, mesa.Especial, ocupacao, mesa.CriadoEm, mesa.AtualizadoEm);
    }

    public static MesaResumoDto ParaResumo(Mesa mesa)
    {
        ArgumentNullException.ThrowIfNull(mesa);

        return new MesaResumoDto(mesa.Id, mesa.Numero, mesa.Nome, mesa.Especial);
    }
}
