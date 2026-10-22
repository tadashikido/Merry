using Celebri.Aplicacao.Cronogramas;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Isolamento;
using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Casamentos;
using Celebri.Dominio.Cronogramas;
using Celebri.Dominio.Excecoes;

namespace Celebri.Aplicacao.ModelosCronograma;

public class ModeloCronogramaService : IModeloCronogramaService
{
    private readonly IModeloCronogramaRepository _modeloRepository;
    private readonly IOrganizacaoRepository _organizacaoRepository;
    private readonly ICasamentoRepository _casamentoRepository;
    private readonly IItemCronogramaRepository _itemCronogramaRepository;
    private readonly IFornecedorCasamentoRepository _vinculoRepository;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly IContextoIsolamento _contextoIsolamento;
    private readonly TimeProvider _relogio;

    public ModeloCronogramaService(
        IModeloCronogramaRepository modeloRepository,
        IOrganizacaoRepository organizacaoRepository,
        ICasamentoRepository casamentoRepository,
        IItemCronogramaRepository itemCronogramaRepository,
        IFornecedorCasamentoRepository vinculoRepository,
        IUnidadeTrabalho unidadeTrabalho,
        IContextoIsolamento contextoIsolamento,
        TimeProvider relogio)
    {
        _modeloRepository = modeloRepository;
        _organizacaoRepository = organizacaoRepository;
        _casamentoRepository = casamentoRepository;
        _itemCronogramaRepository = itemCronogramaRepository;
        _vinculoRepository = vinculoRepository;
        _unidadeTrabalho = unidadeTrabalho;
        _contextoIsolamento = contextoIsolamento;
        _relogio = relogio;
    }

    public async Task<IReadOnlyList<ModeloCronogramaResumoDto>> ListarAsync(CancellationToken cancelamento)
    {
        await GarantirModeloSugeridoAsync(cancelamento);

        var modelos = await _modeloRepository.ListarAsync(cancelamento);

        return modelos
            .OrderByDescending(modelo => modelo.Sugerido)
            .ThenBy(modelo => modelo.Nome, StringComparer.CurrentCultureIgnoreCase)
            .Select(modelo => new ModeloCronogramaResumoDto(
                modelo.Id,
                modelo.Nome,
                modelo.Descricao,
                CronogramaService.FormatarHorario(modelo.HorarioReferencia)!,
                modelo.Sugerido,
                modelo.QuantidadeItens,
                modelo.AtualizadoEm))
            .ToList();
    }

    public async Task<ModeloCronogramaDto> ObterAsync(Guid modeloId, CancellationToken cancelamento)
    {
        return ParaDto(await ObterModeloAsync(modeloId, cancelamento));
    }

    public async Task<ModeloCronogramaDto> CriarAsync(SalvarModeloCronogramaRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var horarioReferencia = request.InterpretarHorarioReferencia();
        await GarantirPodeCriarAsync(request.Nome, cancelamento);

        var modelo = ModeloCronograma.Criar(request.Nome, request.Descricao, horarioReferencia, _relogio.GetUtcNow());
        _modeloRepository.Adicionar(modelo);
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return ParaDto(modelo);
    }

    public async Task<ModeloCronogramaDto> CriarDoCasamentoAsync(
        Guid casamentoId,
        SalvarModeloCronogramaRequest request,
        CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var casamento = await _casamentoRepository.ObterPorIdAsync(casamentoId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensCasamento.NaoEncontrado);

        if (casamento.Horario is null)
        {
            throw new RegraNegocioException(MensagensModeloCronograma.HorarioCerimoniaObrigatorio, AplicacaoModeloCronogramaService.CampoHorarioCerimonia);
        }

        var itens = await _itemCronogramaRepository.ListarPorCasamentoAsync(casamento.Id, cancelamento);

        if (itens.Count == 0)
        {
            throw new RegraNegocioException(MensagensModeloCronograma.CronogramaVazio);
        }

        await GarantirPodeCriarAsync(request.Nome, cancelamento);

        var vinculos = await _vinculoRepository.ListarPorCasamentoAsync(casamento.Id, cancelamento);
        var categorias = vinculos.ToDictionary(vinculo => vinculo.Vinculo.Id, vinculo => vinculo.Fornecedor.Categoria);

        var modelo = ModeloCronograma.CriarDeCronograma(
            request.Nome,
            request.Descricao,
            casamento,
            itens,
            categorias,
            _relogio.GetUtcNow());
        _modeloRepository.Adicionar(modelo);
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return ParaDto(modelo);
    }

    public async Task<ModeloCronogramaDto> AtualizarAsync(
        Guid modeloId,
        SalvarModeloCronogramaRequest request,
        CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var horarioReferencia = request.InterpretarHorarioReferencia();
        var modelo = await ObterModeloAsync(modeloId, cancelamento);
        await GarantirNomeDisponivelAsync(request.Nome, modelo.Id, cancelamento);

        modelo.Atualizar(request.Nome, request.Descricao, horarioReferencia, _relogio.GetUtcNow());
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return ParaDto(modelo);
    }

    public async Task RemoverAsync(Guid modeloId, CancellationToken cancelamento)
    {
        var modelo = await ObterModeloAsync(modeloId, cancelamento);
        _modeloRepository.Remover(modelo);
        await _unidadeTrabalho.SalvarAsync(cancelamento);
    }

    public async Task<ItemModeloCronogramaDto> CriarItemAsync(
        Guid modeloId,
        SalvarItemModeloCronogramaRequest request,
        CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var modelo = await ObterModeloAsync(modeloId, cancelamento);
        var item = modelo.AdicionarItem(request.ParaDados(), _relogio.GetUtcNow());
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return ParaDto(item, modelo.HorarioReferencia);
    }

    public async Task<ItemModeloCronogramaDto> AtualizarItemAsync(
        Guid modeloId,
        Guid itemId,
        SalvarItemModeloCronogramaRequest request,
        CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var modelo = await ObterModeloAsync(modeloId, cancelamento);
        var item = ObterItem(modelo, itemId);
        modelo.AtualizarItem(item, request.ParaDados(), _relogio.GetUtcNow());
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return ParaDto(item, modelo.HorarioReferencia);
    }

    public async Task RemoverItemAsync(Guid modeloId, Guid itemId, CancellationToken cancelamento)
    {
        var modelo = await ObterModeloAsync(modeloId, cancelamento);
        var item = ObterItem(modelo, itemId);
        modelo.RemoverItem(item, _relogio.GetUtcNow());
        await _unidadeTrabalho.SalvarAsync(cancelamento);
    }

    public async Task GarantirModeloSugeridoAsync(CancellationToken cancelamento)
    {
        if (_contextoIsolamento.OrganizacaoId is not { } organizacaoId || organizacaoId == Guid.Empty)
        {
            return;
        }

        var organizacao = await _organizacaoRepository.ObterPorIdAsync(organizacaoId, cancelamento);

        if (organizacao is null || organizacao.PossuiModeloCronogramaSugerido)
        {
            return;
        }

        var agora = _relogio.GetUtcNow();
        _modeloRepository.Adicionar(ModeloCronogramaSugerido.Criar(agora));
        organizacao.RegistrarModeloCronogramaSugerido(agora);

        try
        {
            await _unidadeTrabalho.SalvarAsync(cancelamento);
        }
        catch (ConcorrenciaException)
        {
            _unidadeTrabalho.DescartarAlteracoes();
        }
    }

    public static ModeloCronogramaDto ParaDto(ModeloCronograma modelo)
    {
        ArgumentNullException.ThrowIfNull(modelo);

        return new ModeloCronogramaDto(
            modelo.Id,
            modelo.Nome,
            modelo.Descricao,
            CronogramaService.FormatarHorario(modelo.HorarioReferencia)!,
            modelo.Sugerido,
            modelo.ItensOrdenados().Select(item => ParaDto(item, modelo.HorarioReferencia)).ToList(),
            modelo.CriadoEm,
            modelo.AtualizadoEm);
    }

    public static ItemModeloCronogramaDto ParaDto(ItemModeloCronograma item, TimeOnly horarioReferencia)
    {
        ArgumentNullException.ThrowIfNull(item);

        var (dia, inicio) = ItemCronograma.DePosicao(item.PosicaoNaCerimonia(horarioReferencia));
        var minutoDoDia = ItemCronograma.MinutoDoDia(inicio);

        return new ItemModeloCronogramaDto(
            item.Id,
            item.MinutosDesdeCerimonia,
            dia.ToString(),
            CronogramaService.FormatarHorario(inicio)!,
            item.DuracaoMinutos,
            item.DuracaoMinutos is { } duracao ? CronogramaService.FormatarHorario(inicio.AddMinutes(duracao)) : null,
            item.DuracaoMinutos is { } duracaoTotal && minutoDoDia + duracaoTotal >= ItemCronograma.MinutosPorDia,
            item.Atividade,
            item.ReferenciaLocal?.ToString(),
            item.Local,
            item.Responsavel,
            item.CategoriaFornecedor?.ToString(),
            item.Instrucoes);
    }

    private async Task<ModeloCronograma> ObterModeloAsync(Guid modeloId, CancellationToken cancelamento)
    {
        return await _modeloRepository.ObterComItensAsync(modeloId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensModeloCronograma.ModeloNaoEncontrado);
    }

    private static ItemModeloCronograma ObterItem(ModeloCronograma modelo, Guid itemId)
    {
        return modelo.BuscarItem(itemId)
            ?? throw new RecursoNaoEncontradoException(MensagensModeloCronograma.ItemNaoEncontrado);
    }

    private async Task GarantirPodeCriarAsync(string? nome, CancellationToken cancelamento)
    {
        if (await _modeloRepository.ContarAsync(cancelamento) >= ModeloCronograma.LimitePorOrganizacao)
        {
            throw new RegraNegocioException(MensagensModeloCronograma.LimiteModelos);
        }

        await GarantirNomeDisponivelAsync(nome, null, cancelamento);
    }

    private async Task GarantirNomeDisponivelAsync(string? nome, Guid? modeloAtual, CancellationToken cancelamento)
    {
        var normalizado = ModeloCronograma.NormalizarNome(nome);

        if (await _modeloRepository.ExisteNomeAsync(normalizado, modeloAtual, cancelamento))
        {
            throw new RegraNegocioException(MensagensModeloCronograma.NomeRepetido, ModeloCronograma.CampoNome);
        }
    }
}
