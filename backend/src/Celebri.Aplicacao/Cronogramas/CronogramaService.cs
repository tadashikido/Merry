using System.Globalization;
using Celebri.Aplicacao.Casamentos;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Persistencia;
using Celebri.Aplicacao.UsuarioAtual;
using Celebri.Dominio.Casamentos;
using Celebri.Dominio.Cronogramas;
using Celebri.Dominio.Excecoes;

namespace Celebri.Aplicacao.Cronogramas;

public class CronogramaService : ICronogramaService
{
    private readonly ICasamentoRepository _casamentoRepository;
    private readonly IItemCronogramaRepository _itemRepository;
    private readonly IFornecedorCasamentoRepository _vinculoRepository;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly TimeProvider _relogio;
    private readonly IUsuarioAtual _usuarioAtual;

    public CronogramaService(
        ICasamentoRepository casamentoRepository,
        IItemCronogramaRepository itemRepository,
        IFornecedorCasamentoRepository vinculoRepository,
        IUnidadeTrabalho unidadeTrabalho,
        TimeProvider relogio,
        IUsuarioAtual usuarioAtual)
    {
        _casamentoRepository = casamentoRepository;
        _itemRepository = itemRepository;
        _vinculoRepository = vinculoRepository;
        _unidadeTrabalho = unidadeTrabalho;
        _relogio = relogio;
        _usuarioAtual = usuarioAtual;
    }

    public async Task<CronogramaDto> ListarAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        var casamento = await ObterCasamentoAsync(casamentoId, cancelamento);
        var contexto = await MontarContextoAsync(casamento, cancelamento);
        var ehAssessoria = _usuarioAtual.EhAssessoria();

        var disponiveis = ehAssessoria
            ? contexto.Vinculos
                .Where(vinculo => !vinculo.Vinculo.Cancelado)
                .OrderBy(vinculo => vinculo.Fornecedor.NomeEmpresa, StringComparer.CurrentCultureIgnoreCase)
                .Select(vinculo => ParaFornecedorDto(vinculo))
                .ToList()
            : [];

        return new CronogramaDto(
            casamento.Id,
            casamento.Data,
            FormatarHorario(casamento.Horario),
            casamento.LocalCerimonia,
            casamento.LocalRecepcao,
            casamento.Arquivado,
            !ehAssessoria || casamento.Arquivado,
            contexto.Itens.Select(item => ParaDto(item, casamento, contexto, ehAssessoria)).ToList(),
            contexto.Conflitos.Count,
            disponiveis,
            ehAssessoria ? contexto.Itens.Count(item => item.HorarioDesatualizado(casamento.Horario)) : 0);
    }

    public async Task<ItemCronogramaDto> ObterAsync(Guid casamentoId, Guid itemId, CancellationToken cancelamento)
    {
        var casamento = await ObterCasamentoAsync(casamentoId, cancelamento);
        await ObterItemAsync(casamento.Id, itemId, cancelamento);
        return await MontarDtoAsync(casamento, itemId, cancelamento);
    }

    public async Task<ItemCronogramaDto> CriarAsync(
        Guid casamentoId,
        SalvarItemCronogramaRequest request,
        CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var casamento = await ObterCasamentoEditavelAsync(casamentoId, cancelamento);

        if (await _itemRepository.ContarPorCasamentoAsync(casamento.Id, cancelamento) >= ItemCronograma.LimitePorCasamento)
        {
            throw new RegraNegocioException(MensagensCronograma.LimitePorCasamento);
        }

        var dados = request.ParaDados();
        await ValidarFornecedorAsync(casamento.Id, dados.FornecedorCasamentoId, null, cancelamento);

        var item = ItemCronograma.Criar(casamento.Id, dados, _usuarioAtual.UsuarioId, _relogio.GetUtcNow());
        _itemRepository.Adicionar(item);
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return await MontarDtoAsync(casamento, item.Id, cancelamento);
    }

    public async Task<ItemCronogramaDto> AtualizarAsync(
        Guid casamentoId,
        Guid itemId,
        SalvarItemCronogramaRequest request,
        CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var casamento = await ObterCasamentoEditavelAsync(casamentoId, cancelamento);
        var item = await ObterItemAsync(casamento.Id, itemId, cancelamento);
        var dados = request.ParaDados();
        await ValidarFornecedorAsync(casamento.Id, dados.FornecedorCasamentoId, item.FornecedorCasamentoId, cancelamento);

        item.Atualizar(dados, casamento.Horario, _relogio.GetUtcNow());
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return await MontarDtoAsync(casamento, item.Id, cancelamento);
    }

    public async Task RemoverAsync(Guid casamentoId, Guid itemId, CancellationToken cancelamento)
    {
        var casamento = await ObterCasamentoEditavelAsync(casamentoId, cancelamento);
        var item = await ObterItemAsync(casamento.Id, itemId, cancelamento);

        _itemRepository.Remover(item);
        await _unidadeTrabalho.SalvarAsync(cancelamento);
    }

    public static string? FormatarHorario(TimeOnly? horario)
    {
        return horario?.ToString(SalvarCasamentoRequest.FormatoHorario, CultureInfo.InvariantCulture);
    }

    private async Task<ItemCronogramaDto> MontarDtoAsync(CasamentoAssessorado casamento, Guid itemId, CancellationToken cancelamento)
    {
        var contexto = await MontarContextoAsync(casamento, cancelamento);
        var item = contexto.Itens.FirstOrDefault(atual => atual.Id == itemId)
            ?? throw new RecursoNaoEncontradoException(MensagensCronograma.NaoEncontrado);

        return ParaDto(item, casamento, contexto, _usuarioAtual.EhAssessoria());
    }

    private async Task<ContextoCronograma> MontarContextoAsync(CasamentoAssessorado casamento, CancellationToken cancelamento)
    {
        var itens = OrdenacaoCronograma.Ordenar(await _itemRepository.ListarPorCasamentoAsync(casamento.Id, cancelamento));
        var vinculos = await _vinculoRepository.ListarPorCasamentoAsync(casamento.Id, cancelamento);

        return new ContextoCronograma(
            itens,
            vinculos,
            itens.ToDictionary(item => item.Id),
            DetectorConflitosCronograma.Detectar(itens),
            vinculos.ToDictionary(vinculo => vinculo.Vinculo.Id));
    }

    private static ItemCronogramaDto ParaDto(
        ItemCronograma item,
        CasamentoAssessorado casamento,
        ContextoCronograma contexto,
        bool exibirInternos)
    {
        var porId = contexto.ItensPorId;
        var conflitos = contexto.Conflitos.TryGetValue(item.Id, out var encontrados)
            ? encontrados
                .Where(conflito => porId.ContainsKey(conflito.OutroItemId))
                .Select(conflito =>
                {
                    var outro = porId[conflito.OutroItemId];
                    return new ConflitoItemCronogramaDto(
                        outro.Id,
                        outro.Atividade,
                        FormatarHorario(outro.Inicio)!,
                        outro.Dia.ToString(),
                        conflito.Motivo.ToString());
                })
                .ToList()
            : [];

        var fornecedor = item.FornecedorCasamentoId is { } vinculoId && contexto.VinculosPorId.TryGetValue(vinculoId, out var vinculo)
            ? ParaFornecedorDto(vinculo)
            : null;

        return new ItemCronogramaDto(
            item.Id,
            item.Dia.ToString(),
            item.CalcularData(casamento.Data),
            FormatarHorario(item.Inicio)!,
            item.DuracaoMinutos,
            FormatarHorario(item.Termino),
            item.TerminaEmOutroDia,
            item.Atividade,
            item.Local,
            item.Responsavel,
            fornecedor,
            item.Instrucoes,
            exibirInternos ? item.NotasInternas : null,
            item.Status.ToString(),
            item.ConcluidoEm,
            item.MinutosDesdeCerimonia(casamento.Horario),
            conflitos,
            item.CriadoEm,
            item.AtualizadoEm);
    }

    private static FornecedorItemCronogramaDto ParaFornecedorDto(VinculoFornecedor vinculo)
    {
        return new FornecedorItemCronogramaDto(
            vinculo.Vinculo.Id,
            vinculo.Fornecedor.NomeEmpresa,
            vinculo.Fornecedor.Categoria.ToString());
    }

    private async Task ValidarFornecedorAsync(
        Guid casamentoId,
        Guid? fornecedorCasamentoId,
        Guid? fornecedorAtual,
        CancellationToken cancelamento)
    {
        if (fornecedorCasamentoId is not { } vinculoId)
        {
            return;
        }

        var vinculo = await _vinculoRepository.ObterAsync(casamentoId, vinculoId, cancelamento);

        if (vinculo is null || vinculo.Vinculo.CasamentoId != casamentoId
            || (vinculo.Vinculo.Cancelado && vinculoId != fornecedorAtual))
        {
            throw new RegraNegocioException(MensagensCronograma.FornecedorInvalido, ItemCronograma.CampoFornecedor);
        }
    }

    private async Task<CasamentoAssessorado> ObterCasamentoAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        return await _casamentoRepository.ObterPorIdAsync(casamentoId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensCasamento.NaoEncontrado);
    }

    private async Task<CasamentoAssessorado> ObterCasamentoEditavelAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        var casamento = await ObterCasamentoAsync(casamentoId, cancelamento);

        if (casamento.Arquivado)
        {
            throw new RegraNegocioException(MensagensCasamento.ArquivadoSemEdicao);
        }

        return casamento;
    }

    private async Task<ItemCronograma> ObterItemAsync(Guid casamentoId, Guid itemId, CancellationToken cancelamento)
    {
        return await _itemRepository.ObterPorIdAsync(casamentoId, itemId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensCronograma.NaoEncontrado);
    }

    private sealed record ContextoCronograma(
        IReadOnlyList<ItemCronograma> Itens,
        IReadOnlyList<VinculoFornecedor> Vinculos,
        IReadOnlyDictionary<Guid, ItemCronograma> ItensPorId,
        IReadOnlyDictionary<Guid, IReadOnlyList<ConflitoItem>> Conflitos,
        IReadOnlyDictionary<Guid, VinculoFornecedor> VinculosPorId);
}
