using System.Globalization;
using Celebri.Aplicacao.Eventos;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Persistencia;
using Celebri.Aplicacao.UsuarioAtual;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Cronogramas;
using Celebri.Dominio.Excecoes;

namespace Celebri.Aplicacao.Cronogramas;

public class CronogramaService : ICronogramaService
{
    private readonly IEventoRepository _eventoRepository;
    private readonly IItemCronogramaRepository _itemRepository;
    private readonly IFornecedorEventoRepository _vinculoRepository;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly TimeProvider _relogio;
    private readonly IUsuarioAtual _usuarioAtual;

    public CronogramaService(
        IEventoRepository eventoRepository,
        IItemCronogramaRepository itemRepository,
        IFornecedorEventoRepository vinculoRepository,
        IUnidadeTrabalho unidadeTrabalho,
        TimeProvider relogio,
        IUsuarioAtual usuarioAtual)
    {
        _eventoRepository = eventoRepository;
        _itemRepository = itemRepository;
        _vinculoRepository = vinculoRepository;
        _unidadeTrabalho = unidadeTrabalho;
        _relogio = relogio;
        _usuarioAtual = usuarioAtual;
    }

    public async Task<CronogramaDto> ListarAsync(Guid eventoId, CancellationToken cancelamento)
    {
        var evento = await ObterEventoAsync(eventoId, cancelamento);
        var contexto = await MontarContextoAsync(evento, cancelamento);
        var ehAssessoria = _usuarioAtual.EhAssessoria();

        var disponiveis = ehAssessoria
            ? contexto.Vinculos
                .Where(vinculo => !vinculo.Vinculo.Cancelado)
                .OrderBy(vinculo => vinculo.Fornecedor.NomeEmpresa, StringComparer.CurrentCultureIgnoreCase)
                .Select(vinculo => ParaFornecedorDto(vinculo))
                .ToList()
            : [];

        return new CronogramaDto(
            evento.Id,
            evento.Data,
            FormatarHorario(evento.Horario),
            evento.LocalCerimonia,
            evento.LocalRecepcao,
            evento.Arquivado,
            !ehAssessoria || evento.Arquivado,
            contexto.Itens.Select(item => ParaDto(item, evento, contexto, ehAssessoria)).ToList(),
            contexto.Conflitos.Count,
            disponiveis,
            ehAssessoria ? contexto.Itens.Count(item => item.HorarioDesatualizado(evento.Horario)) : 0);
    }

    public async Task<ItemCronogramaDto> ObterAsync(Guid eventoId, Guid itemId, CancellationToken cancelamento)
    {
        var evento = await ObterEventoAsync(eventoId, cancelamento);
        await ObterItemAsync(evento.Id, itemId, cancelamento);
        return await MontarDtoAsync(evento, itemId, cancelamento);
    }

    public async Task<ItemCronogramaDto> CriarAsync(
        Guid eventoId,
        SalvarItemCronogramaRequest request,
        CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var evento = await ObterEventoEditavelAsync(eventoId, cancelamento);

        if (await _itemRepository.ContarPorEventoAsync(evento.Id, cancelamento) >= ItemCronograma.LimitePorEvento)
        {
            throw new RegraNegocioException(MensagensCronograma.LimitePorEvento);
        }

        var dados = request.ParaDados();
        await ValidarFornecedorAsync(evento.Id, dados.FornecedorEventoId, null, cancelamento);

        var item = ItemCronograma.Criar(evento.Id, dados, _usuarioAtual.UsuarioId, _relogio.GetUtcNow());
        _itemRepository.Adicionar(item);
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return await MontarDtoAsync(evento, item.Id, cancelamento);
    }

    public async Task<ItemCronogramaDto> AtualizarAsync(
        Guid eventoId,
        Guid itemId,
        SalvarItemCronogramaRequest request,
        CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var evento = await ObterEventoEditavelAsync(eventoId, cancelamento);
        var item = await ObterItemAsync(evento.Id, itemId, cancelamento);
        var dados = request.ParaDados();
        await ValidarFornecedorAsync(evento.Id, dados.FornecedorEventoId, item.FornecedorEventoId, cancelamento);

        item.Atualizar(dados, evento.Horario, _relogio.GetUtcNow());
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return await MontarDtoAsync(evento, item.Id, cancelamento);
    }

    public async Task RemoverAsync(Guid eventoId, Guid itemId, CancellationToken cancelamento)
    {
        var evento = await ObterEventoEditavelAsync(eventoId, cancelamento);
        var item = await ObterItemAsync(evento.Id, itemId, cancelamento);

        _itemRepository.Remover(item);
        await _unidadeTrabalho.SalvarAsync(cancelamento);
    }

    public static string? FormatarHorario(TimeOnly? horario)
    {
        return horario?.ToString(SalvarEventoRequest.FormatoHorario, CultureInfo.InvariantCulture);
    }

    private async Task<ItemCronogramaDto> MontarDtoAsync(Evento evento, Guid itemId, CancellationToken cancelamento)
    {
        var contexto = await MontarContextoAsync(evento, cancelamento);
        var item = contexto.Itens.FirstOrDefault(atual => atual.Id == itemId)
            ?? throw new RecursoNaoEncontradoException(MensagensCronograma.NaoEncontrado);

        return ParaDto(item, evento, contexto, _usuarioAtual.EhAssessoria());
    }

    private async Task<ContextoCronograma> MontarContextoAsync(Evento evento, CancellationToken cancelamento)
    {
        var itens = OrdenacaoCronograma.Ordenar(await _itemRepository.ListarPorEventoAsync(evento.Id, cancelamento));
        var vinculos = await _vinculoRepository.ListarPorEventoAsync(evento.Id, cancelamento);

        return new ContextoCronograma(
            itens,
            vinculos,
            itens.ToDictionary(item => item.Id),
            DetectorConflitosCronograma.Detectar(itens),
            vinculos.ToDictionary(vinculo => vinculo.Vinculo.Id));
    }

    private static ItemCronogramaDto ParaDto(
        ItemCronograma item,
        Evento evento,
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

        var fornecedor = item.FornecedorEventoId is { } vinculoId && contexto.VinculosPorId.TryGetValue(vinculoId, out var vinculo)
            ? ParaFornecedorDto(vinculo)
            : null;

        return new ItemCronogramaDto(
            item.Id,
            item.Dia.ToString(),
            item.CalcularData(evento.Data),
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
            item.MinutosDesdeCerimonia(evento.Horario),
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
        Guid eventoId,
        Guid? fornecedorEventoId,
        Guid? fornecedorAtual,
        CancellationToken cancelamento)
    {
        if (fornecedorEventoId is not { } vinculoId)
        {
            return;
        }

        var vinculo = await _vinculoRepository.ObterAsync(eventoId, vinculoId, cancelamento);

        if (vinculo is null || vinculo.Vinculo.EventoId != eventoId
            || (vinculo.Vinculo.Cancelado && vinculoId != fornecedorAtual))
        {
            throw new RegraNegocioException(MensagensCronograma.FornecedorInvalido, ItemCronograma.CampoFornecedor);
        }
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

    private async Task<ItemCronograma> ObterItemAsync(Guid eventoId, Guid itemId, CancellationToken cancelamento)
    {
        return await _itemRepository.ObterPorIdAsync(eventoId, itemId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensCronograma.NaoEncontrado);
    }

    private sealed record ContextoCronograma(
        IReadOnlyList<ItemCronograma> Itens,
        IReadOnlyList<VinculoFornecedor> Vinculos,
        IReadOnlyDictionary<Guid, ItemCronograma> ItensPorId,
        IReadOnlyDictionary<Guid, IReadOnlyList<ConflitoItem>> Conflitos,
        IReadOnlyDictionary<Guid, VinculoFornecedor> VinculosPorId);
}
