using System.Globalization;
using Celebri.Aplicacao.Convidados;
using Celebri.Aplicacao.DadosSensiveis;
using Celebri.Aplicacao.Eventos;
using Celebri.Dominio.Convidados;
using Celebri.Dominio.Eventos;

namespace Celebri.Aplicacao.Confirmacoes;

public static class MontadorExportacaoBuffet
{
    private static readonly StringComparer ComparadorNome = CultureInfo.GetCultureInfo("pt-BR").CompareInfo.GetStringComparer(
        CompareOptions.IgnoreCase | CompareOptions.IgnoreNonSpace);

    public static ExportacaoBuffetDto Montar(
        Evento evento,
        IReadOnlyList<Convite> convites,
        RelatorioRestricoesAlimentaresDto relatorio,
        DateTimeOffset agora)
    {
        ArgumentNullException.ThrowIfNull(evento);
        ArgumentNullException.ThrowIfNull(convites);
        ArgumentNullException.ThrowIfNull(relatorio);

        var totais = CalculadoraTotaisConvidados.Calcular(CalculadoraTotaisConvidados.Resumir(convites));
        var nomesConvites = convites.ToDictionary(convite => convite.Id, convite => convite.Nome);
        var restricoesConfirmadas = relatorio.Pessoas
            .Where(pessoa => pessoa.Resposta == nameof(RespostaRsvp.Confirmado) && nomesConvites.ContainsKey(pessoa.ConviteId))
            .ToDictionary(pessoa => pessoa.ConvidadoId);

        var convitesBuffet = OrdenacaoConvites.Ordenar(convites)
            .Select(convite => new ConviteBuffetDto(
                convite.Nome,
                convite.ConvidadosOrdenados()
                    .Where(convidado => convidado.Resposta == RespostaRsvp.Confirmado)
                    .Select(convidado => ParaPessoa(convidado, restricoesConfirmadas.GetValueOrDefault(convidado.Id)))
                    .ToList()))
            .Where(convite => convite.Pessoas.Count > 0)
            .ToList();

        var pessoasRestricao = restricoesConfirmadas.Values
            .Select(pessoa => new PessoaRestricaoBuffetDto(
                pessoa.Nome,
                nomesConvites[pessoa.ConviteId],
                pessoa.Tipos,
                pessoa.OutraRestricao,
                pessoa.NecessidadeEspecial))
            .OrderBy(pessoa => pessoa.Nome, ComparadorNome)
            .ThenBy(pessoa => pessoa.Convite, ComparadorNome)
            .ToList();

        return new ExportacaoBuffetDto(
            new EventoExportacaoDto(
                evento.NomePrimeiraPessoa,
                evento.NomeSegundaPessoa,
                evento.Data,
                EventoService.FormatarHorario(evento.Horario),
                evento.LocalRecepcao),
            agora,
            new ContagemBuffetDto(totais.Confirmados.Adultos, totais.Confirmados.Criancas, totais.Confirmados.Total),
            totais.Pendentes.Total,
            convitesBuffet,
            new RestricoesBuffetDto(
                relatorio.PorTipo.Select(contagem => new ContagemRestricaoBuffetDto(contagem.Tipo, contagem.Quantidade)).ToList(),
                relatorio.OutrasRestricoes,
                relatorio.NecessidadesEspeciais,
                pessoasRestricao,
                relatorio.RegistrosIlegiveis,
                relatorio.DadosExcluidosEm));
    }

    public static int ContarPessoas(ExportacaoBuffetDto exportacao)
    {
        ArgumentNullException.ThrowIfNull(exportacao);
        return exportacao.Convites.Sum(convite => convite.Pessoas.Count);
    }

    private static PessoaBuffetDto ParaPessoa(Convidado convidado, PessoaRestricaoAlimentarDto? restricao)
    {
        return new PessoaBuffetDto(
            convidado.Nome,
            convidado.FaixaEtaria.ToString(),
            convidado.Acompanhante,
            restricao?.Tipos ?? [],
            restricao?.OutraRestricao,
            restricao?.NecessidadeEspecial);
    }
}
