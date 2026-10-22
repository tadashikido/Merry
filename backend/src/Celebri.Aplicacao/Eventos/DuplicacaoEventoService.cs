using Celebri.Aplicacao.Calendario;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Persistencia;
using Celebri.Aplicacao.UsuarioAtual;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Cronogramas;
using Celebri.Dominio.Excecoes;

namespace Celebri.Aplicacao.Eventos;

public class DuplicacaoEventoService : IDuplicacaoEventoService
{
    public const string CampoData = "data";

    private readonly IEventoRepository _eventoRepository;
    private readonly IDuplicacaoEventoRepository _duplicacaoRepository;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly ICalendarioLocal _calendario;
    private readonly TimeProvider _relogio;
    private readonly IUsuarioAtual _usuarioAtual;

    public DuplicacaoEventoService(
        IEventoRepository eventoRepository,
        IDuplicacaoEventoRepository duplicacaoRepository,
        IUnidadeTrabalho unidadeTrabalho,
        ICalendarioLocal calendario,
        TimeProvider relogio,
        IUsuarioAtual usuarioAtual)
    {
        _eventoRepository = eventoRepository;
        _duplicacaoRepository = duplicacaoRepository;
        _unidadeTrabalho = unidadeTrabalho;
        _calendario = calendario;
        _relogio = relogio;
        _usuarioAtual = usuarioAtual;
    }

    public async Task<PreviaDuplicacaoDto> PreverAsync(Guid eventoOrigemId, DateOnly? novaData, CancellationToken cancelamento)
    {
        if (novaData is { } data && (data < Evento.DataMinima || data > Evento.DataMaxima))
        {
            throw new RegraNegocioException(MensagensEvento.DataForaDaFaixa, CampoData);
        }

        var origem = await ObterOrigemAsync(eventoOrigemId, cancelamento);
        var hoje = _calendario.Hoje();
        var plano = await MontarPlanoAsync(
            origem,
            novaData,
            hoje,
            new OpcoesCopia(Tarefas: true, Fornecedores: true, Cronograma: true),
            cancelamento);

        return new PreviaDuplicacaoDto(
            EventoService.ParaResumo(origem, hoje),
            plano.Tarefas.Count,
            plano.TarefasDoChecklist,
            plano.NascemAtrasadas,
            plano.TarefasCanceladasIgnoradas,
            plano.Vinculos.Count,
            plano.FornecedoresIgnorados,
            plano.ItensCronograma.Count);
    }

    public async Task<DuplicacaoEventoDto> DuplicarAsync(
        Guid eventoOrigemId,
        DuplicarEventoRequest request,
        CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var origem = await ObterOrigemAsync(eventoOrigemId, cancelamento);
        var agora = _relogio.GetUtcNow();
        var hoje = _calendario.Hoje();
        var evento = Evento.Criar(request.ParaDados(), agora);
        var plano = await MontarPlanoAsync(
            origem,
            evento.Data,
            hoje,
            new OpcoesCopia(request.CopiarTarefas, request.CopiarFornecedores, request.CopiarCronograma),
            cancelamento);

        var usuarioId = _usuarioAtual.UsuarioId;
        var tarefas = plano.GerarTarefas(evento.Id, usuarioId, agora);
        var vinculos = plano.GerarVinculos(evento.Id, usuarioId, agora);
        var itensCronograma = plano.GerarItensCronograma(origem, evento, vinculos, usuarioId, agora);

        _eventoRepository.Adicionar(evento);
        _duplicacaoRepository.AdicionarTarefas(tarefas);
        _duplicacaoRepository.AdicionarVinculos(vinculos);
        _duplicacaoRepository.AdicionarItensCronograma(itensCronograma);
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        var dto = EventoService.ParaDto(evento, hoje, exibirDadosInternos: true) with
        {
            PercentualChecklist = plano.TarefasDoChecklist > 0 ? 0 : null,
        };

        return new DuplicacaoEventoDto(dto, tarefas.Count, vinculos.Count, itensCronograma.Count);
    }

    private async Task<PlanoDuplicacaoEvento> MontarPlanoAsync(
        Evento origem,
        DateOnly? novaData,
        DateOnly hoje,
        OpcoesCopia opcoes,
        CancellationToken cancelamento)
    {
        IReadOnlyList<TarefaParaDuplicar> tarefas = opcoes.Tarefas
            ? await _duplicacaoRepository.ListarTarefasAsync(origem.Id, cancelamento)
            : [];
        IReadOnlyList<VinculoParaDuplicar> vinculos = opcoes.Fornecedores
            ? await _duplicacaoRepository.ListarVinculosAsync(origem.Id, cancelamento)
            : [];
        IReadOnlyList<ItemCronograma> itensCronograma = opcoes.Cronograma
            ? await _duplicacaoRepository.ListarItensCronogramaAsync(origem.Id, cancelamento)
            : [];

        return PlanoDuplicacaoEvento.Montar(origem.Data, novaData, hoje, tarefas, vinculos, itensCronograma);
    }

    private async Task<Evento> ObterOrigemAsync(Guid id, CancellationToken cancelamento)
    {
        return await _eventoRepository.ObterPorIdAsync(id, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensEvento.NaoEncontrado);
    }

    private sealed record OpcoesCopia(bool Tarefas, bool Fornecedores, bool Cronograma);
}
