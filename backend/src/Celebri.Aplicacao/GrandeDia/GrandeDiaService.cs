using Celebri.Aplicacao.Calendario;
using Celebri.Aplicacao.Cronogramas;
using Celebri.Aplicacao.Eventos;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Persistencia;
using Celebri.Aplicacao.UsuarioAtual;
using Celebri.Dominio.Cronogramas;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Excecoes;

namespace Celebri.Aplicacao.GrandeDia;

public class GrandeDiaService : IGrandeDiaService
{
    private readonly IEventoRepository _eventoRepository;
    private readonly IItemCronogramaRepository _itemRepository;
    private readonly IFornecedorEventoRepository _vinculoRepository;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly ICalendarioLocal _calendario;
    private readonly TimeProvider _relogio;
    private readonly IUsuarioAtual _usuarioAtual;

    public GrandeDiaService(
        IEventoRepository eventoRepository,
        IItemCronogramaRepository itemRepository,
        IFornecedorEventoRepository vinculoRepository,
        IUnidadeTrabalho unidadeTrabalho,
        ICalendarioLocal calendario,
        TimeProvider relogio,
        IUsuarioAtual usuarioAtual)
    {
        _eventoRepository = eventoRepository;
        _itemRepository = itemRepository;
        _vinculoRepository = vinculoRepository;
        _unidadeTrabalho = unidadeTrabalho;
        _calendario = calendario;
        _relogio = relogio;
        _usuarioAtual = usuarioAtual;
    }

    public async Task<GrandeDiaDto> ConsultarAsync(Guid eventoId, CancellationToken cancelamento)
    {
        var evento = await ObterEventoAsync(eventoId, cancelamento);
        return await MontarAsync(evento, cancelamento);
    }

    public Task<GrandeDiaDto> ConcluirItemAsync(Guid eventoId, Guid itemId, CancellationToken cancelamento)
    {
        return AlterarStatusAsync(
            eventoId,
            itemId,
            StatusItemCronograma.Concluido,
            (item, agora) => item.MarcarConcluido(agora),
            cancelamento);
    }

    public Task<GrandeDiaDto> ReabrirItemAsync(Guid eventoId, Guid itemId, CancellationToken cancelamento)
    {
        return AlterarStatusAsync(
            eventoId,
            itemId,
            StatusItemCronograma.Previsto,
            (item, agora) => item.Reabrir(agora),
            cancelamento);
    }

    private async Task<GrandeDiaDto> AlterarStatusAsync(
        Guid eventoId,
        Guid itemId,
        StatusItemCronograma desejado,
        Action<ItemCronograma, DateTimeOffset> alterar,
        CancellationToken cancelamento)
    {
        var evento = await ObterEventoAsync(eventoId, cancelamento);

        if (evento.Arquivado)
        {
            throw new RegraNegocioException(MensagensEvento.ArquivadoSemEdicao);
        }

        var item = await ObterItemAsync(evento.Id, itemId, cancelamento);

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
                var atual = await ObterItemAsync(evento.Id, itemId, cancelamento);

                if (atual.Status != desejado)
                {
                    throw new ConcorrenciaException(MensagensGrandeDia.AtualizadoEmOutroAparelho, excecao);
                }
            }
        }

        return await MontarAsync(evento, cancelamento);
    }

    private async Task<GrandeDiaDto> MontarAsync(Evento evento, CancellationToken cancelamento)
    {
        var itens = OrdenacaoCronograma.Ordenar(await _itemRepository.ListarPorEventoAsync(evento.Id, cancelamento));
        var vinculos = (await _vinculoRepository.ListarPorEventoAsync(evento.Id, cancelamento))
            .ToDictionary(vinculo => vinculo.Vinculo.Id);
        var agora = _calendario.Agora();
        var retrato = MomentoGrandeDia.Calcular(itens, evento.Data, agora);
        var ehAssessoria = _usuarioAtual.EhAssessoria();

        return new GrandeDiaDto(
            evento.Id,
            evento.NomePrimeiraPessoa,
            evento.NomeSegundaPessoa,
            evento.Data,
            CronogramaService.FormatarHorario(evento.Horario),
            evento.LocalCerimonia,
            evento.LocalRecepcao,
            evento.Arquivado,
            !ehAssessoria || evento.Arquivado,
            MomentoGrandeDiaDto.De(retrato, agora),
            itens.Select(item => ParaDto(item, evento, vinculos, retrato, ehAssessoria)).ToList(),
            evento.Tipo.ToString());
    }

    private static ItemGrandeDiaDto ParaDto(
        ItemCronograma item,
        Evento evento,
        IReadOnlyDictionary<Guid, VinculoFornecedor> vinculos,
        RetratoGrandeDia retrato,
        bool exibirInternos)
    {
        var fornecedor = item.FornecedorEventoId is { } vinculoId && vinculos.TryGetValue(vinculoId, out var vinculo)
            ? new FornecedorGrandeDiaDto(
                vinculo.Fornecedor.NomeEmpresa,
                vinculo.Fornecedor.Categoria.ToString(),
                vinculo.Fornecedor.Responsavel,
                vinculo.Fornecedor.Telefone)
            : null;

        return new ItemGrandeDiaDto(
            item.Id,
            item.Dia.ToString(),
            item.CalcularData(evento.Data),
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

    private async Task<Evento> ObterEventoAsync(Guid eventoId, CancellationToken cancelamento)
    {
        return await _eventoRepository.ObterPorIdAsync(eventoId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensEvento.NaoEncontrado);
    }

    private async Task<ItemCronograma> ObterItemAsync(Guid eventoId, Guid itemId, CancellationToken cancelamento)
    {
        return await _itemRepository.ObterPorIdAsync(eventoId, itemId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensCronograma.NaoEncontrado);
    }
}
