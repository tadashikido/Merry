using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Convidados;
using Celebri.Dominio.Excecoes;

namespace Celebri.Aplicacao.Convidados.Importacao;

public class ImportacaoConvidadosService : IImportacaoConvidadosService
{
    private readonly IConviteRepository _conviteRepository;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly TimeProvider _relogio;
    private readonly VerificadorCasamentoConvidados _verificador;

    public ImportacaoConvidadosService(
        ICasamentoRepository casamentoRepository,
        IConviteRepository conviteRepository,
        IUnidadeTrabalho unidadeTrabalho,
        TimeProvider relogio)
    {
        _conviteRepository = conviteRepository;
        _unidadeTrabalho = unidadeTrabalho;
        _relogio = relogio;
        _verificador = new VerificadorCasamentoConvidados(casamentoRepository, conviteRepository);
    }

    public async Task<PreVisualizacaoImportacaoDto> PreVisualizarAsync(Guid casamentoId, Stream conteudo, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(conteudo);

        var casamento = await _verificador.ObterEditavelAsync(casamentoId, cancelamento);
        var (analise, existentes) = await AnalisarAsync(casamento.Id, conteudo, cancelamento);

        return MontarPreVisualizacao(analise, existentes);
    }

    public async Task<ResultadoImportacaoDto> ImportarAsync(
        Guid casamentoId,
        Stream conteudo,
        ConfirmarImportacaoRequest request,
        CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(conteudo);
        ArgumentNullException.ThrowIfNull(request);

        var casamento = await _verificador.ObterEditavelAsync(casamentoId, cancelamento);
        var (analise, _) = await AnalisarAsync(casamento.Id, conteudo, cancelamento);
        var validos = analise.ConvitesValidos;

        if (validos.Count == 0)
        {
            throw new RegraNegocioException(MensagensImportacaoConvidados.NenhumConviteValido);
        }

        if (analise.PossuiConvitesComProblema && !request.SomenteValidos)
        {
            throw new RegraNegocioException(MensagensImportacaoConvidados.ImportacaoComProblemas);
        }

        var pessoas = validos.Sum(convite => convite.Pessoas.Count);

        if (validos.Count != request.ConvitesEsperados || pessoas != request.PessoasEsperadas)
        {
            throw new RegraNegocioException(MensagensImportacaoConvidados.PlanilhaAlterada);
        }

        await _verificador.GarantirLimiteAsync(casamento.Id, pessoas, 0, cancelamento);

        var agora = _relogio.GetUtcNow();
        var convites = validos
            .Select(convite => Convite.Criar(casamento.Id, AnalisadorImportacaoConvidados.ParaRequest(convite).ParaDados(), agora))
            .ToList();

        _conviteRepository.AdicionarVarios(convites);
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return new ResultadoImportacaoDto(convites.Count, pessoas);
    }

    public static async Task<byte[]> LerConteudoAsync(Stream conteudo, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(conteudo);

        var buffer = new byte[LimitesImportacao.TamanhoMaximoBytes + 1];
        var total = 0;

        while (total < buffer.Length)
        {
            var lidos = await conteudo.ReadAsync(buffer.AsMemory(total), cancelamento);

            if (lidos == 0)
            {
                break;
            }

            total += lidos;
        }

        if (total > LimitesImportacao.TamanhoMaximoBytes)
        {
            throw new RegraNegocioException(MensagensImportacaoConvidados.ArquivoGrandeDemais);
        }

        return buffer[..total];
    }

    public static PreVisualizacaoImportacaoDto MontarPreVisualizacao(AnaliseImportacao analise, int convidadosExistentes)
    {
        ArgumentNullException.ThrowIfNull(analise);

        var problemasPorLinha = analise.Problemas.ToLookup(problema => problema.Linha);
        var validos = analise.ConvitesValidos;
        var pessoasValidas = validos.SelectMany(convite => convite.Pessoas).ToList();

        var resumo = new ResumoImportacaoDto(
            analise.Linhas.Count,
            analise.Convites.Count,
            analise.Convites.Sum(convite => convite.Pessoas.Count),
            validos.Count,
            pessoasValidas.Count,
            pessoasValidas.Count(pessoa => pessoa.FaixaEtaria == FaixaEtaria.Adulto),
            pessoasValidas.Count(pessoa => pessoa.FaixaEtaria == FaixaEtaria.Crianca),
            ContarLinhas(analise, TipoProblemaLinha.Erro),
            ContarLinhas(analise, TipoProblemaLinha.Duplicado),
            ContarLinhas(analise, TipoProblemaLinha.Aviso),
            convidadosExistentes,
            Convite.ConvidadosMaximoPorCasamento);

        var convites = analise.Convites
            .Select(convite => new ConvitePreVisualizadoDto(
                convite.NomeExibicao,
                convite.Grupo,
                convite.LimiteAcompanhantes,
                convite.Valido,
                convite.Pessoas
                    .Select(pessoa => new PessoaPreVisualizadaDto(
                        pessoa.Linha,
                        pessoa.Nome,
                        pessoa.FaixaEtaria.ToString(),
                        pessoa.Resposta.ToString(),
                        pessoa.Situacao.ToString()))
                    .ToList()))
            .ToList();

        var linhasComProblema = analise.Linhas
            .Where(linha => problemasPorLinha.Contains(linha.Numero))
            .Select(linha => new LinhaComProblemaDto(
                linha.Numero,
                MontarValores(linha),
                problemasPorLinha[linha.Numero]
                    .Select(problema => new ProblemaLinhaDto(problema.Tipo.ToString(), problema.Coluna?.ToString(), problema.Mensagem))
                    .ToList()))
            .ToList();

        return new PreVisualizacaoImportacaoDto(
            resumo,
            analise.Colunas.Reconhecidas.Select(coluna => coluna.ToString()).ToList(),
            analise.Colunas.Ignoradas,
            convites,
            linhasComProblema);
    }

    private async Task<(AnaliseImportacao Analise, int Existentes)> AnalisarAsync(Guid casamentoId, Stream conteudo, CancellationToken cancelamento)
    {
        var bytes = await LerConteudoAsync(conteudo, cancelamento);
        var planilha = LeitorCsv.Ler(bytes);
        var existentes = await _conviteRepository.ListarIdentificacoesAsync(casamentoId, cancelamento);

        return (AnalisadorImportacaoConvidados.Analisar(planilha, existentes), existentes.Count);
    }

    private static int ContarLinhas(AnaliseImportacao analise, TipoProblemaLinha tipo)
    {
        return analise.Problemas.Where(problema => problema.Tipo == tipo).Select(problema => problema.Linha).Distinct().Count();
    }

    private static ValoresLinhaImportacaoDto MontarValores(LinhaImportacao linha)
    {
        return new ValoresLinhaImportacaoDto(
            linha.Valor(ColunaImportacao.Convite) ?? string.Empty,
            linha.Valor(ColunaImportacao.Grupo) ?? string.Empty,
            linha.Valor(ColunaImportacao.Nome) ?? string.Empty,
            linha.Valor(ColunaImportacao.Telefone) ?? string.Empty,
            linha.Valor(ColunaImportacao.Email) ?? string.Empty,
            linha.Valor(ColunaImportacao.FaixaEtaria) ?? string.Empty,
            linha.Valor(ColunaImportacao.Acompanhantes) ?? string.Empty,
            linha.Valor(ColunaImportacao.Resposta) ?? string.Empty);
    }
}
