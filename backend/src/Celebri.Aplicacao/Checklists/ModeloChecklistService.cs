using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Isolamento;
using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Checklists;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Excecoes;

namespace Celebri.Aplicacao.Checklists;

public class ModeloChecklistService : IModeloChecklistService
{
    private readonly IModeloChecklistRepository _modeloRepository;
    private readonly IOrganizacaoRepository _organizacaoRepository;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly IContextoIsolamento _contextoIsolamento;
    private readonly TimeProvider _relogio;

    public ModeloChecklistService(
        IModeloChecklistRepository modeloRepository,
        IOrganizacaoRepository organizacaoRepository,
        IUnidadeTrabalho unidadeTrabalho,
        IContextoIsolamento contextoIsolamento,
        TimeProvider relogio)
    {
        _modeloRepository = modeloRepository;
        _organizacaoRepository = organizacaoRepository;
        _unidadeTrabalho = unidadeTrabalho;
        _contextoIsolamento = contextoIsolamento;
        _relogio = relogio;
    }

    public async Task<IReadOnlyList<ModeloChecklistResumoDto>> ListarAsync(CancellationToken cancelamento)
    {
        await GarantirModeloSugeridoAsync(cancelamento);

        var modelos = await _modeloRepository.ListarAsync(cancelamento);

        return modelos
            .OrderByDescending(modelo => modelo.Sugerido)
            .ThenBy(modelo => modelo.Nome, StringComparer.CurrentCultureIgnoreCase)
            .Select(modelo => new ModeloChecklistResumoDto(
                modelo.Id,
                modelo.Nome,
                modelo.Descricao,
                modelo.Sugerido,
                modelo.QuantidadeItens,
                modelo.AtualizadoEm,
                modelo.TipoEvento?.ToString()))
            .ToList();
    }

    public async Task<ModeloChecklistDto> ObterAsync(Guid modeloId, CancellationToken cancelamento)
    {
        return ParaDto(await ObterModeloAsync(modeloId, cancelamento));
    }

    public async Task<ModeloChecklistDto> CriarAsync(SalvarModeloChecklistRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (await _modeloRepository.ContarAsync(cancelamento) >= ModeloChecklist.LimitePorOrganizacao)
        {
            throw new RegraNegocioException(MensagensChecklist.LimiteModelos);
        }

        await GarantirNomeDisponivelAsync(request.Nome, null, cancelamento);

        var modelo = ModeloChecklist.Criar(request.Nome, request.Descricao, _relogio.GetUtcNow());
        _modeloRepository.Adicionar(modelo);
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return ParaDto(modelo);
    }

    public async Task<ModeloChecklistDto> AtualizarAsync(Guid modeloId, SalvarModeloChecklistRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var modelo = await ObterModeloAsync(modeloId, cancelamento);
        await GarantirNomeDisponivelAsync(request.Nome, modelo.Id, cancelamento);

        modelo.Atualizar(request.Nome, request.Descricao, _relogio.GetUtcNow());
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return ParaDto(modelo);
    }

    public async Task RemoverAsync(Guid modeloId, CancellationToken cancelamento)
    {
        var modelo = await ObterModeloAsync(modeloId, cancelamento);
        _modeloRepository.Remover(modelo);
        await _unidadeTrabalho.SalvarAsync(cancelamento);
    }

    public async Task<ItemModeloChecklistDto> CriarItemAsync(
        Guid modeloId,
        SalvarItemModeloChecklistRequest request,
        CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var modelo = await ObterModeloAsync(modeloId, cancelamento);
        var item = modelo.AdicionarItem(request.ParaDados(), _relogio.GetUtcNow());
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return ParaDto(item);
    }

    public async Task<ItemModeloChecklistDto> AtualizarItemAsync(
        Guid modeloId,
        Guid itemId,
        SalvarItemModeloChecklistRequest request,
        CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var modelo = await ObterModeloAsync(modeloId, cancelamento);
        var item = ObterItem(modelo, itemId);
        modelo.AtualizarItem(item, request.ParaDados(), _relogio.GetUtcNow());
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return ParaDto(item);
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

        if (organizacao is null || (organizacao.PossuiModeloChecklistSugerido && organizacao.PossuiModelosChecklistPorTipo))
        {
            return;
        }

        var agora = _relogio.GetUtcNow();

        if (!organizacao.PossuiModeloChecklistSugerido)
        {
            _modeloRepository.Adicionar(ModeloChecklistSugerido.Criar(TipoEvento.Casamento, agora));
            organizacao.RegistrarModeloChecklistSugerido(agora);
        }

        if (!organizacao.PossuiModelosChecklistPorTipo)
        {
            foreach (var conteudo in ModeloChecklistSugerido.Conteudos.Where(conteudo => conteudo.Tipo != TipoEvento.Casamento))
            {
                if (!await _modeloRepository.ExisteNomeAsync(conteudo.Nome, null, cancelamento))
                {
                    _modeloRepository.Adicionar(ModeloChecklistSugerido.Criar(conteudo.Tipo, agora));
                }
            }

            organizacao.RegistrarModelosChecklistPorTipo(agora);
        }

        try
        {
            await _unidadeTrabalho.SalvarAsync(cancelamento);
        }
        catch (ConcorrenciaException)
        {
            _unidadeTrabalho.DescartarAlteracoes();
        }
    }

    public static ModeloChecklistDto ParaDto(ModeloChecklist modelo)
    {
        ArgumentNullException.ThrowIfNull(modelo);

        return new ModeloChecklistDto(
            modelo.Id,
            modelo.Nome,
            modelo.Descricao,
            modelo.Sugerido,
            modelo.ItensOrdenados().Select(ParaDto).ToList(),
            modelo.CriadoEm,
            modelo.AtualizadoEm,
            modelo.TipoEvento?.ToString());
    }

    public static ItemModeloChecklistDto ParaDto(ItemModeloChecklist item)
    {
        ArgumentNullException.ThrowIfNull(item);

        return new ItemModeloChecklistDto(
            item.Id,
            item.Titulo,
            item.Descricao,
            item.Responsavel.ToString(),
            item.Categoria.ToString(),
            item.DiasAntesDoEvento);
    }

    private async Task<ModeloChecklist> ObterModeloAsync(Guid modeloId, CancellationToken cancelamento)
    {
        return await _modeloRepository.ObterComItensAsync(modeloId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensChecklist.ModeloNaoEncontrado);
    }

    private static ItemModeloChecklist ObterItem(ModeloChecklist modelo, Guid itemId)
    {
        return modelo.BuscarItem(itemId)
            ?? throw new RecursoNaoEncontradoException(MensagensChecklist.ItemNaoEncontrado);
    }

    private async Task GarantirNomeDisponivelAsync(string? nome, Guid? modeloAtual, CancellationToken cancelamento)
    {
        var normalizado = ModeloChecklist.NormalizarNome(nome);

        if (await _modeloRepository.ExisteNomeAsync(normalizado, modeloAtual, cancelamento))
        {
            throw new RegraNegocioException(MensagensChecklist.NomeRepetido);
        }
    }
}
