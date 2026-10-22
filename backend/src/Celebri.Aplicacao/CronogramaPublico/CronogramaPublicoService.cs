using Celebri.Aplicacao.Autenticacao.Portas;
using Celebri.Aplicacao.Calendario;
using Celebri.Aplicacao.Cronogramas;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.GrandeDia;
using Celebri.Aplicacao.Isolamento;
using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Cronogramas;

namespace Celebri.Aplicacao.CronogramaPublico;

public class CronogramaPublicoService : ICronogramaPublicoService
{
    private readonly IAcessoCronogramaRepository _acessoRepository;
    private readonly IEventoRepository _eventoRepository;
    private readonly IItemCronogramaRepository _itemRepository;
    private readonly IFornecedorEventoRepository _vinculoRepository;
    private readonly EscopoIsolamentoCronogramaPublico _escopo;
    private readonly IGeradorTokenOpaco _geradorToken;
    private readonly ICalendarioLocal _calendario;

    public CronogramaPublicoService(
        IAcessoCronogramaRepository acessoRepository,
        IEventoRepository eventoRepository,
        IItemCronogramaRepository itemRepository,
        IFornecedorEventoRepository vinculoRepository,
        EscopoIsolamentoCronogramaPublico escopo,
        IGeradorTokenOpaco geradorToken,
        ICalendarioLocal calendario)
    {
        _acessoRepository = acessoRepository;
        _eventoRepository = eventoRepository;
        _itemRepository = itemRepository;
        _vinculoRepository = vinculoRepository;
        _escopo = escopo;
        _geradorToken = geradorToken;
        _calendario = calendario;
    }

    public async Task<CronogramaPublicoDto> ConsultarAsync(ConsultarCronogramaPublicoRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (!FormatoTokenCronograma.Valido(request.Token))
        {
            throw LinkInvalido();
        }

        var acesso = await _acessoRepository.ObterPorHashAsync(_geradorToken.CalcularHash(request.Token!), cancelamento)
            ?? throw LinkInvalido();

        _escopo.Restringir(acesso.OrganizacaoId, acesso.EventoId);

        var evento = await _eventoRepository.ObterPorIdAsync(acesso.EventoId, cancelamento)
            ?? throw LinkInvalido();

        if (!ValidadeAcessoCronograma.Ativo(evento, _calendario.Hoje()))
        {
            throw LinkInvalido();
        }

        var vinculos = (await _vinculoRepository.ListarPorEventoAsync(evento.Id, cancelamento))
            .ToDictionary(vinculo => vinculo.Vinculo.Id);
        var itens = OrdenacaoCronograma.Ordenar(await _itemRepository.ListarPorEventoAsync(evento.Id, cancelamento))
            .Where(acesso.AtendeItem)
            .ToList();
        var agora = _calendario.Agora();
        var retrato = MomentoGrandeDia.Calcular(itens, evento.Data, agora);

        return new CronogramaPublicoDto(
            new EventoCronogramaPublicoDto(
                evento.NomePrimeiraPessoa,
                evento.NomeSegundaPessoa,
                evento.Data,
                CronogramaService.FormatarHorario(evento.Horario),
                evento.LocalCerimonia,
                evento.LocalRecepcao,
                evento.Tipo.ToString()),
            ParaFiltroDto(acesso, itens, vinculos),
            itens.Select(item => ParaItemDto(item, evento, vinculos, retrato)).ToList(),
            ValidadeAcessoCronograma.ValidoAte(evento.Data),
            MomentoGrandeDiaDto.De(retrato, agora));
    }

    private static RecursoNaoEncontradoException LinkInvalido()
    {
        return new RecursoNaoEncontradoException(MensagensAcessoCronograma.LinkInvalido);
    }

    private static FiltroCronogramaPublicoDto ParaFiltroDto(
        AcessoCronograma acesso,
        IReadOnlyList<ItemCronograma> itens,
        IReadOnlyDictionary<Guid, VinculoFornecedor> vinculos)
    {
        return acesso.Tipo switch
        {
            TipoAcessoCronograma.Fornecedor when acesso.FornecedorEventoId is { } id && vinculos.TryGetValue(id, out var vinculo) =>
                new FiltroCronogramaPublicoDto(acesso.Tipo.ToString(), vinculo.Fornecedor.NomeEmpresa, vinculo.Fornecedor.Categoria.ToString()),
            TipoAcessoCronograma.Responsavel => new FiltroCronogramaPublicoDto(
                acesso.Tipo.ToString(),
                itens.Select(item => item.Responsavel).FirstOrDefault(nome => nome is not null) ?? acesso.ResponsavelChave,
                null),
            _ => new FiltroCronogramaPublicoDto(acesso.Tipo.ToString(), null, null),
        };
    }

    private static ItemCronogramaPublicoDto ParaItemDto(
        ItemCronograma item,
        Evento evento,
        IReadOnlyDictionary<Guid, VinculoFornecedor> vinculos,
        RetratoGrandeDia retrato)
    {
        var fornecedor = item.FornecedorEventoId is { } vinculoId && vinculos.TryGetValue(vinculoId, out var vinculo)
            ? new FornecedorCronogramaPublicoDto(vinculo.Fornecedor.NomeEmpresa, vinculo.Fornecedor.Categoria.ToString())
            : null;

        return new ItemCronogramaPublicoDto(
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
            item.Status.ToString(),
            item.ConcluidoEm,
            retrato.SituacaoDe(item).ToString());
    }
}
