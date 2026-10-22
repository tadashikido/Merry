using System.Globalization;
using Casamento.Aplicacao.Casamentos;
using Casamento.Aplicacao.Convidados;
using Casamento.Aplicacao.DadosSensiveis;
using Casamento.Dominio.Casamentos;
using Casamento.Dominio.Convidados;

namespace Casamento.Aplicacao.Confirmacoes;

public static class MontadorExportacaoBuffet
{
    private static readonly StringComparer ComparadorNome = CultureInfo.GetCultureInfo("pt-BR").CompareInfo.GetStringComparer(
        CompareOptions.IgnoreCase | CompareOptions.IgnoreNonSpace);

    public static ExportacaoBuffetDto Montar(
        CasamentoAssessorado casamento,
        IReadOnlyList<Convite> convites,
        RelatorioRestricoesAlimentaresDto relatorio,
        DateTimeOffset agora)
    {
        ArgumentNullException.ThrowIfNull(casamento);
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
            new CasamentoExportacaoDto(
                casamento.NomePrimeiraPessoa,
                casamento.NomeSegundaPessoa,
                casamento.Data,
                CasamentoService.FormatarHorario(casamento.Horario),
                casamento.LocalRecepcao),
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
