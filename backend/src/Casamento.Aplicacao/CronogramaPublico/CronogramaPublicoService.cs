using Casamento.Aplicacao.Autenticacao.Portas;
using Casamento.Aplicacao.Calendario;
using Casamento.Aplicacao.Cronogramas;
using Casamento.Aplicacao.Excecoes;
using Casamento.Aplicacao.GrandeDia;
using Casamento.Aplicacao.Isolamento;
using Casamento.Aplicacao.Persistencia;
using Casamento.Dominio.Casamentos;
using Casamento.Dominio.Cronogramas;

namespace Casamento.Aplicacao.CronogramaPublico;

public class CronogramaPublicoService : ICronogramaPublicoService
{
    private readonly IAcessoCronogramaRepository _acessoRepository;
    private readonly ICasamentoRepository _casamentoRepository;
    private readonly IItemCronogramaRepository _itemRepository;
    private readonly IFornecedorCasamentoRepository _vinculoRepository;
    private readonly EscopoIsolamentoCronogramaPublico _escopo;
    private readonly IGeradorTokenOpaco _geradorToken;
    private readonly ICalendarioLocal _calendario;

    public CronogramaPublicoService(
        IAcessoCronogramaRepository acessoRepository,
        ICasamentoRepository casamentoRepository,
        IItemCronogramaRepository itemRepository,
        IFornecedorCasamentoRepository vinculoRepository,
        EscopoIsolamentoCronogramaPublico escopo,
        IGeradorTokenOpaco geradorToken,
        ICalendarioLocal calendario)
    {
        _acessoRepository = acessoRepository;
        _casamentoRepository = casamentoRepository;
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

        _escopo.Restringir(acesso.OrganizacaoId, acesso.CasamentoId);

        var casamento = await _casamentoRepository.ObterPorIdAsync(acesso.CasamentoId, cancelamento)
            ?? throw LinkInvalido();

        if (!ValidadeAcessoCronograma.Ativo(casamento, _calendario.Hoje()))
        {
            throw LinkInvalido();
        }

        var vinculos = (await _vinculoRepository.ListarPorCasamentoAsync(casamento.Id, cancelamento))
            .ToDictionary(vinculo => vinculo.Vinculo.Id);
        var itens = OrdenacaoCronograma.Ordenar(await _itemRepository.ListarPorCasamentoAsync(casamento.Id, cancelamento))
            .Where(acesso.AtendeItem)
            .ToList();
        var agora = _calendario.Agora();
        var retrato = MomentoGrandeDia.Calcular(itens, casamento.Data, agora);

        return new CronogramaPublicoDto(
            new CasamentoCronogramaPublicoDto(
                casamento.NomePrimeiraPessoa,
                casamento.NomeSegundaPessoa,
                casamento.Data,
                CronogramaService.FormatarHorario(casamento.Horario),
                casamento.LocalCerimonia,
                casamento.LocalRecepcao),
            ParaFiltroDto(acesso, itens, vinculos),
            itens.Select(item => ParaItemDto(item, casamento, vinculos, retrato)).ToList(),
            ValidadeAcessoCronograma.ValidoAte(casamento.Data),
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
            TipoAcessoCronograma.Fornecedor when acesso.FornecedorCasamentoId is { } id && vinculos.TryGetValue(id, out var vinculo) =>
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
        CasamentoAssessorado casamento,
        IReadOnlyDictionary<Guid, VinculoFornecedor> vinculos,
        RetratoGrandeDia retrato)
    {
        var fornecedor = item.FornecedorCasamentoId is { } vinculoId && vinculos.TryGetValue(vinculoId, out var vinculo)
            ? new FornecedorCronogramaPublicoDto(vinculo.Fornecedor.NomeEmpresa, vinculo.Fornecedor.Categoria.ToString())
            : null;

        return new ItemCronogramaPublicoDto(
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
            item.Status.ToString(),
            item.ConcluidoEm,
            retrato.SituacaoDe(item).ToString());
    }
}
