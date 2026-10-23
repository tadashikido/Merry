using Celebri.Aplicacao.Cronogramas;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Persistencia;
using Celebri.Aplicacao.UsuarioAtual;
using Celebri.Dominio.Cronogramas;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Fornecedores;

namespace Celebri.Aplicacao.ModelosCronograma;

public class AplicacaoModeloCronogramaService : IAplicacaoModeloCronogramaService
{
    public const string CampoHorarioCerimonia = "horario";

    private readonly IEventoRepository _eventoRepository;
    private readonly IModeloCronogramaRepository _modeloRepository;
    private readonly IItemCronogramaRepository _itemRepository;
    private readonly IAplicacaoModeloCronogramaRepository _aplicacaoRepository;
    private readonly IFornecedorEventoRepository _vinculoRepository;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly TimeProvider _relogio;
    private readonly IUsuarioAtual _usuarioAtual;

    public AplicacaoModeloCronogramaService(
        IEventoRepository eventoRepository,
        IModeloCronogramaRepository modeloRepository,
        IItemCronogramaRepository itemRepository,
        IAplicacaoModeloCronogramaRepository aplicacaoRepository,
        IFornecedorEventoRepository vinculoRepository,
        IUnidadeTrabalho unidadeTrabalho,
        TimeProvider relogio,
        IUsuarioAtual usuarioAtual)
    {
        _eventoRepository = eventoRepository;
        _modeloRepository = modeloRepository;
        _itemRepository = itemRepository;
        _aplicacaoRepository = aplicacaoRepository;
        _vinculoRepository = vinculoRepository;
        _unidadeTrabalho = unidadeTrabalho;
        _relogio = relogio;
        _usuarioAtual = usuarioAtual;
    }

    public async Task<AplicacaoModeloCronogramaDto> PreverAsync(Guid eventoId, Guid modeloId, CancellationToken cancelamento)
    {
        var evento = await ObterEventoAsync(eventoId, cancelamento);
        var plano = await PlanejarAsync(evento, modeloId, cancelamento);
        return plano.ParaDto(plano.Pendentes.Count);
    }

    public async Task<AplicacaoModeloCronogramaDto> AplicarAsync(
        Guid eventoId,
        AplicarModeloCronogramaRequest request,
        CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var modeloId = request.ModeloId ?? throw new RegraNegocioException(MensagensModeloCronograma.ModeloObrigatorio);
        var evento = await ObterEventoEditavelAsync(eventoId, cancelamento);
        var cerimonia = ExigirHorarioCerimonia(evento);
        var plano = await PlanejarAsync(evento, modeloId, cancelamento);

        if (plano.ExcedeLimite)
        {
            throw new RegraNegocioException(
                MensagensModeloCronograma.LimiteItensCronograma(plano.ItensNoCronograma, plano.Pendentes.Count));
        }

        var itens = GeradorItensCronograma.Gerar(
            evento,
            cerimonia,
            plano.Pendentes,
            plano.VinculoPorCategoria,
            _usuarioAtual.UsuarioId,
            _relogio.GetUtcNow());

        foreach (var item in itens)
        {
            _itemRepository.Adicionar(item);
        }

        if (itens.Count > 0)
        {
            await _unidadeTrabalho.SalvarAsync(cancelamento);
        }

        return plano.ParaDto(itens.Count);
    }

    public async Task<RecalculoHorariosDto> ConsultarRecalculoAsync(Guid eventoId, CancellationToken cancelamento)
    {
        var evento = await ObterEventoAsync(eventoId, cancelamento);

        if (evento.Horario is null)
        {
            return new RecalculoHorariosDto(0);
        }

        var ancorados = await _aplicacaoRepository.ListarAncoradosAsync(evento.Id, rastrear: false, cancelamento);
        return new RecalculoHorariosDto(ancorados.Count(item => item.HorarioDesatualizado(evento.Horario)));
    }

    public async Task<RecalculoHorariosDto> RecalcularAsync(Guid eventoId, CancellationToken cancelamento)
    {
        var evento = await ObterEventoEditavelAsync(eventoId, cancelamento);
        var cerimonia = ExigirHorarioCerimonia(evento);
        var ancorados = await _aplicacaoRepository.ListarAncoradosAsync(evento.Id, rastrear: true, cancelamento);
        var agora = _relogio.GetUtcNow();
        var recalculados = ancorados.Count(item => item.RecalcularPelaCerimonia(cerimonia, agora));

        if (recalculados > 0)
        {
            await _unidadeTrabalho.SalvarAsync(cancelamento);
        }

        return new RecalculoHorariosDto(recalculados);
    }

    private async Task<PlanoAplicacao> PlanejarAsync(Evento evento, Guid modeloId, CancellationToken cancelamento)
    {
        var modelo = await _modeloRepository.ObterComItensAsync(modeloId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensModeloCronograma.ModeloNaoEncontrado);

        var itens = modelo.ItensOrdenados();
        var aplicadas = await _aplicacaoRepository.ListarOrigensAplicadasAsync(
            evento.Id,
            itens.Select(item => item.Id).ToList(),
            cancelamento);
        var pendentes = GeradorItensCronograma.ItensPendentes(itens, aplicadas);
        var existentes = await _itemRepository.ContarPorEventoAsync(evento.Id, cancelamento);
        var vinculos = await _vinculoRepository.ListarPorEventoAsync(evento.Id, cancelamento);
        var vinculoPorCategoria = GeradorItensCronograma.VinculoUnicoPorCategoria(
            vinculos
                .Where(vinculo => !vinculo.Vinculo.Cancelado)
                .Select(vinculo => (vinculo.Vinculo.Id, vinculo.Fornecedor.Categoria)));

        return new PlanoAplicacao(
            evento.Horario,
            itens.Count,
            pendentes,
            itens.Count - pendentes.Count,
            existentes,
            existentes + pendentes.Count > ItemCronograma.LimitePorEvento,
            vinculoPorCategoria);
    }

    private static TimeOnly ExigirHorarioCerimonia(Evento evento)
    {
        return evento.Horario
            ?? throw new RegraNegocioException(MensagensModeloCronograma.HorarioCerimoniaObrigatorio, CampoHorarioCerimonia);
    }

    private async Task<Evento> ObterEventoAsync(Guid eventoId, CancellationToken cancelamento)
    {
        return await _eventoRepository.ObterPorIdAsync(eventoId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensEvento.NaoEncontrado);
    }

    private async Task<Evento> ObterEventoEditavelAsync(Guid eventoId, CancellationToken cancelamento)
    {
        var evento = await ObterEventoAsync(eventoId, cancelamento);

        if (evento.Arquivado)
        {
            throw new RegraNegocioException(MensagensEvento.ArquivadoSemEdicao);
        }

        return evento;
    }

    private sealed record PlanoAplicacao(
        TimeOnly? HorarioCerimonia,
        int ItensNoModelo,
        IReadOnlyList<ItemModeloCronograma> Pendentes,
        int JaAplicados,
        int ItensNoCronograma,
        bool ExcedeLimite,
        IReadOnlyDictionary<CategoriaFornecedor, Guid> VinculoPorCategoria)
    {
        public AplicacaoModeloCronogramaDto ParaDto(int itensCriados)
        {
            var fornecedores = Pendentes.Count(item => GeradorItensCronograma.FornecedorDoItem(item, VinculoPorCategoria) is not null);

            if (HorarioCerimonia is not { } cerimonia)
            {
                return new AplicacaoModeloCronogramaDto(
                    ItensNoModelo,
                    itensCriados,
                    JaAplicados,
                    fornecedores,
                    0,
                    ItensNoCronograma,
                    ExcedeLimite,
                    true,
                    null,
                    null,
                    null);
            }

            var previstos = Pendentes
                .Select(item => (Item: item, Posicao: item.PosicaoNaCerimonia(cerimonia)))
                .OrderBy(previsto => previsto.Posicao)
                .ThenBy(previsto => previsto.Item.Atividade, StringComparer.CurrentCultureIgnoreCase)
                .ToList();

            return new AplicacaoModeloCronogramaDto(
                ItensNoModelo,
                itensCriados,
                JaAplicados,
                fornecedores,
                Pendentes.Count(item => item.ForaDaJanela(cerimonia)),
                ItensNoCronograma,
                ExcedeLimite,
                false,
                CronogramaService.FormatarHorario(cerimonia),
                previstos.Count > 0 ? ParaPrevisto(previstos[0].Item, previstos[0].Posicao) : null,
                previstos.Count > 0 ? ParaPrevisto(previstos[^1].Item, previstos[^1].Posicao) : null);
        }

        private static ItemPrevistoCronogramaDto ParaPrevisto(ItemModeloCronograma item, int posicao)
        {
            var (dia, inicio) = ItemCronograma.DePosicao(posicao);
            return new ItemPrevistoCronogramaDto(dia.ToString(), CronogramaService.FormatarHorario(inicio)!, item.Atividade);
        }
    }
}
