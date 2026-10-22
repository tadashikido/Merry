using Celebri.Aplicacao.Calendario;
using Celebri.Aplicacao.Casamentos;
using Celebri.Aplicacao.Cronogramas;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Persistencia;
using Celebri.Aplicacao.UsuarioAtual;
using Celebri.Dominio.Casamentos;
using Celebri.Dominio.Cronogramas;
using Celebri.Dominio.Excecoes;

namespace Celebri.Aplicacao.GrandeDia;

public class GrandeDiaService : IGrandeDiaService
{
    private readonly ICasamentoRepository _casamentoRepository;
    private readonly IItemCronogramaRepository _itemRepository;
    private readonly IFornecedorCasamentoRepository _vinculoRepository;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly ICalendarioLocal _calendario;
    private readonly TimeProvider _relogio;
    private readonly IUsuarioAtual _usuarioAtual;

    public GrandeDiaService(
        ICasamentoRepository casamentoRepository,
        IItemCronogramaRepository itemRepository,
        IFornecedorCasamentoRepository vinculoRepository,
        IUnidadeTrabalho unidadeTrabalho,
        ICalendarioLocal calendario,
        TimeProvider relogio,
        IUsuarioAtual usuarioAtual)
    {
        _casamentoRepository = casamentoRepository;
        _itemRepository = itemRepository;
        _vinculoRepository = vinculoRepository;
        _unidadeTrabalho = unidadeTrabalho;
        _calendario = calendario;
        _relogio = relogio;
        _usuarioAtual = usuarioAtual;
    }

    public async Task<GrandeDiaDto> ConsultarAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        var casamento = await ObterCasamentoAsync(casamentoId, cancelamento);
        return await MontarAsync(casamento, cancelamento);
    }

    public Task<GrandeDiaDto> ConcluirItemAsync(Guid casamentoId, Guid itemId, CancellationToken cancelamento)
    {
        return AlterarStatusAsync(
            casamentoId,
            itemId,
            StatusItemCronograma.Concluido,
            (item, agora) => item.MarcarConcluido(agora),
            cancelamento);
    }

    public Task<GrandeDiaDto> ReabrirItemAsync(Guid casamentoId, Guid itemId, CancellationToken cancelamento)
    {
        return AlterarStatusAsync(
            casamentoId,
            itemId,
            StatusItemCronograma.Previsto,
            (item, agora) => item.Reabrir(agora),
            cancelamento);
    }

    private async Task<GrandeDiaDto> AlterarStatusAsync(
        Guid casamentoId,
        Guid itemId,
        StatusItemCronograma desejado,
        Action<ItemCronograma, DateTimeOffset> alterar,
        CancellationToken cancelamento)
    {
        var casamento = await ObterCasamentoAsync(casamentoId, cancelamento);

        if (casamento.Arquivado)
        {
            throw new RegraNegocioException(MensagensCasamento.ArquivadoSemEdicao);
        }

        var item = await ObterItemAsync(casamento.Id, itemId, cancelamento);

        if (item.Status != desejado)
        {
            alterar(item, _relogio.GetUtcNow());

            try
            {
                await _unidadeTrabalho.SalvarAsync(cancelamento);
            }
            catch (ConcorrenciaException excecao)
            {
                _unidadeTrabalho.DescartarAlteracoes();
                var atual = await ObterItemAsync(casamento.Id, itemId, cancelamento);

                if (atual.Status != desejado)
                {
                    throw new ConcorrenciaException(MensagensGrandeDia.AtualizadoEmOutroAparelho, excecao);
                }
            }
        }

        return await MontarAsync(casamento, cancelamento);
    }

    private async Task<GrandeDiaDto> MontarAsync(CasamentoAssessorado casamento, CancellationToken cancelamento)
    {
        var itens = OrdenacaoCronograma.Ordenar(await _itemRepository.ListarPorCasamentoAsync(casamento.Id, cancelamento));
        var vinculos = (await _vinculoRepository.ListarPorCasamentoAsync(casamento.Id, cancelamento))
            .ToDictionary(vinculo => vinculo.Vinculo.Id);
        var agora = _calendario.Agora();
        var retrato = MomentoGrandeDia.Calcular(itens, casamento.Data, agora);
        var ehAssessoria = _usuarioAtual.EhAssessoria();

        return new GrandeDiaDto(
            casamento.Id,
            casamento.NomePrimeiraPessoa,
            casamento.NomeSegundaPessoa,
            casamento.Data,
            CronogramaService.FormatarHorario(casamento.Horario),
            casamento.LocalCerimonia,
            casamento.LocalRecepcao,
            casamento.Arquivado,
            !ehAssessoria || casamento.Arquivado,
            MomentoGrandeDiaDto.De(retrato, agora),
            itens.Select(item => ParaDto(item, casamento, vinculos, retrato, ehAssessoria)).ToList());
    }

    private static ItemGrandeDiaDto ParaDto(
        ItemCronograma item,
        CasamentoAssessorado casamento,
        IReadOnlyDictionary<Guid, VinculoFornecedor> vinculos,
        RetratoGrandeDia retrato,
        bool exibirInternos)
    {
        var fornecedor = item.FornecedorCasamentoId is { } vinculoId && vinculos.TryGetValue(vinculoId, out var vinculo)
            ? new FornecedorGrandeDiaDto(
                vinculo.Fornecedor.NomeEmpresa,
                vinculo.Fornecedor.Categoria.ToString(),
                vinculo.Fornecedor.Responsavel,
                vinculo.Fornecedor.Telefone)
            : null;

        return new ItemGrandeDiaDto(
            item.Id,
            item.Dia.ToString(),
            item.CalcularData(casamento.Data),
            CronogramaService.FormatarHorario(item.Inicio)!,
            item.DuracaoMinutos,
            CronogramaService.FormatarHorario(item.Termino),
            item.TerminaEmOutroDia,
            item.Atividade,
            item.Local,
            item.Responsavel,
            fornecedor,
            item.Instrucoes,
            exibirInternos ? item.NotasInternas : null,
            item.Status.ToString(),
            item.ConcluidoEm,
            retrato.SituacaoDe(item).ToString());
    }

    private async Task<CasamentoAssessorado> ObterCasamentoAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        return await _casamentoRepository.ObterPorIdAsync(casamentoId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensCasamento.NaoEncontrado);
    }

    private async Task<ItemCronograma> ObterItemAsync(Guid casamentoId, Guid itemId, CancellationToken cancelamento)
    {
        return await _itemRepository.ObterPorIdAsync(casamentoId, itemId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensCronograma.NaoEncontrado);
    }
}
