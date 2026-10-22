using Celebri.Aplicacao.Autenticacao.Portas;
using Celebri.Aplicacao.Calendario;
using Celebri.Aplicacao.CronogramaPublico.Portas;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Casamentos;
using Celebri.Dominio.Cronogramas;
using Celebri.Dominio.Excecoes;

namespace Celebri.Aplicacao.CronogramaPublico;

public class LinkCronogramaService : ILinkCronogramaService
{
    private readonly ICasamentoRepository _casamentoRepository;
    private readonly IItemCronogramaRepository _itemRepository;
    private readonly IFornecedorCasamentoRepository _vinculoRepository;
    private readonly IAcessoCronogramaRepository _acessoRepository;
    private readonly IGeradorTokenOpaco _geradorToken;
    private readonly ICifradorTokenCronograma _cifrador;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly ICalendarioLocal _calendario;
    private readonly TimeProvider _relogio;

    public LinkCronogramaService(
        ICasamentoRepository casamentoRepository,
        IItemCronogramaRepository itemRepository,
        IFornecedorCasamentoRepository vinculoRepository,
        IAcessoCronogramaRepository acessoRepository,
        IGeradorTokenOpaco geradorToken,
        ICifradorTokenCronograma cifrador,
        IUnidadeTrabalho unidadeTrabalho,
        ICalendarioLocal calendario,
        TimeProvider relogio)
    {
        _casamentoRepository = casamentoRepository;
        _itemRepository = itemRepository;
        _vinculoRepository = vinculoRepository;
        _acessoRepository = acessoRepository;
        _geradorToken = geradorToken;
        _cifrador = cifrador;
        _unidadeTrabalho = unidadeTrabalho;
        _calendario = calendario;
        _relogio = relogio;
    }

    public async Task<LinksCronogramaDto> ListarAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        var casamento = await ObterCasamentoAsync(casamentoId, cancelamento);
        var itens = OrdenacaoCronograma.Ordenar(await _itemRepository.ListarPorCasamentoAsync(casamento.Id, cancelamento));
        var vinculos = await _vinculoRepository.ListarPorCasamentoAsync(casamento.Id, cancelamento);
        var acessos = await _acessoRepository.ListarPorCasamentoAsync(casamento.Id, cancelamento);

        var destinos = new List<DestinoLinkCronogramaDto>
        {
            new(
                nameof(TipoAcessoCronograma.Geral),
                null,
                null,
                null,
                null,
                null,
                false,
                itens.Count,
                ParaLinkDto(acessos.FirstOrDefault(acesso => acesso.Tipo == TipoAcessoCronograma.Geral))),
        };

        destinos.AddRange(vinculos
            .Select(vinculo => (Vinculo: vinculo, Acesso: acessos.FirstOrDefault(acesso => acesso.FornecedorCasamentoId == vinculo.Vinculo.Id)))
            .Where(par => !par.Vinculo.Vinculo.Cancelado || par.Acesso is not null)
            .OrderBy(par => par.Vinculo.Fornecedor.NomeEmpresa, StringComparer.CurrentCultureIgnoreCase)
            .Select(par => new DestinoLinkCronogramaDto(
                nameof(TipoAcessoCronograma.Fornecedor),
                par.Vinculo.Vinculo.Id,
                null,
                par.Vinculo.Fornecedor.NomeEmpresa,
                par.Vinculo.Fornecedor.Categoria.ToString(),
                par.Vinculo.Fornecedor.Telefone,
                par.Vinculo.Vinculo.Cancelado,
                itens.Count(item => item.FornecedorCasamentoId == par.Vinculo.Vinculo.Id),
                ParaLinkDto(par.Acesso))));

        var responsaveis = itens
            .Where(item => item.ResponsavelChave is not null)
            .GroupBy(item => item.ResponsavelChave!, StringComparer.Ordinal)
            .ToDictionary(grupo => grupo.Key, grupo => (Nome: grupo.First().Responsavel!, Quantidade: grupo.Count()), StringComparer.Ordinal);

        foreach (var acesso in acessos.Where(acesso => acesso.Tipo == TipoAcessoCronograma.Responsavel))
        {
            responsaveis.TryAdd(acesso.ResponsavelChave!, (acesso.ResponsavelChave!, 0));
        }

        destinos.AddRange(responsaveis
            .OrderBy(par => par.Value.Nome, StringComparer.CurrentCultureIgnoreCase)
            .Select(par => new DestinoLinkCronogramaDto(
                nameof(TipoAcessoCronograma.Responsavel),
                null,
                par.Value.Nome,
                par.Value.Nome,
                null,
                null,
                false,
                par.Value.Quantidade,
                ParaLinkDto(acessos.FirstOrDefault(acesso =>
                    acesso.Tipo == TipoAcessoCronograma.Responsavel
                    && string.Equals(acesso.ResponsavelChave, par.Key, StringComparison.Ordinal))))));

        return new LinksCronogramaDto(
            ValidadeAcessoCronograma.ValidoAte(casamento.Data),
            ValidadeAcessoCronograma.Expirado(casamento.Data, _calendario.Hoje()),
            casamento.Arquivado,
            destinos);
    }

    public async Task<LinkCronogramaDto> GerarAsync(Guid casamentoId, GerarLinkCronogramaRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var casamento = await ObterCasamentoAtivoAsync(casamentoId, cancelamento);
        var destino = request.ParaDestino();
        await ValidarDestinoAsync(casamento.Id, destino, cancelamento);

        var existente = (await _acessoRepository.ListarPorCasamentoAsync(casamento.Id, cancelamento))
            .FirstOrDefault(acesso => acesso.MesmoDestino(destino));

        if (existente is not null)
        {
            var tokenExistente = _cifrador.Decifrar(existente.TokenCifrado, existente.CasamentoId)
                ?? throw new ConflitoException(MensagensAcessoCronograma.LinkIrrecuperavel);

            return new LinkCronogramaDto(existente.Id, tokenExistente, existente.GeradoEm);
        }

        var token = _geradorToken.Gerar();
        var acesso = AcessoCronograma.Gerar(
            casamento,
            destino,
            _geradorToken.CalcularHash(token),
            _cifrador.Cifrar(token, casamento.Id),
            _relogio.GetUtcNow());
        _acessoRepository.Adicionar(acesso);
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return new LinkCronogramaDto(acesso.Id, token, acesso.GeradoEm);
    }

    public async Task<LinkCronogramaDto> RegenerarAsync(Guid casamentoId, Guid linkId, CancellationToken cancelamento)
    {
        var casamento = await ObterCasamentoAtivoAsync(casamentoId, cancelamento);
        var acesso = await ObterAcessoAsync(casamento.Id, linkId, cancelamento);
        var token = _geradorToken.Gerar();

        acesso.Renovar(_geradorToken.CalcularHash(token), _cifrador.Cifrar(token, casamento.Id), _relogio.GetUtcNow());
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return new LinkCronogramaDto(acesso.Id, token, acesso.GeradoEm);
    }

    public async Task RevogarAsync(Guid casamentoId, Guid linkId, CancellationToken cancelamento)
    {
        var casamento = await ObterCasamentoAsync(casamentoId, cancelamento);
        var acesso = await ObterAcessoAsync(casamento.Id, linkId, cancelamento);

        _acessoRepository.Remover(acesso);
        await _unidadeTrabalho.SalvarAsync(cancelamento);
    }

    private async Task ValidarDestinoAsync(Guid casamentoId, DestinoAcessoCronograma destino, CancellationToken cancelamento)
    {
        if (destino.Tipo == TipoAcessoCronograma.Fornecedor)
        {
            var vinculo = await _vinculoRepository.ObterAsync(casamentoId, destino.FornecedorCasamentoId!.Value, cancelamento);

            if (vinculo is null || vinculo.Vinculo.CasamentoId != casamentoId || vinculo.Vinculo.Cancelado)
            {
                throw new RegraNegocioException(MensagensAcessoCronograma.FornecedorInvalido, DestinoAcessoCronograma.CampoFornecedor);
            }
        }

        if (destino.Tipo == TipoAcessoCronograma.Responsavel)
        {
            var itens = await _itemRepository.ListarPorCasamentoAsync(casamentoId, cancelamento);

            if (!itens.Any(destino.AtendeItem))
            {
                throw new RegraNegocioException(MensagensAcessoCronograma.ResponsavelSemItens, DestinoAcessoCronograma.CampoResponsavel);
            }
        }
    }

    private LinkCronogramaDto? ParaLinkDto(AcessoCronograma? acesso)
    {
        return acesso is null
            ? null
            : new LinkCronogramaDto(acesso.Id, _cifrador.Decifrar(acesso.TokenCifrado, acesso.CasamentoId), acesso.GeradoEm);
    }

    private async Task<CasamentoAssessorado> ObterCasamentoAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        return await _casamentoRepository.ObterPorIdAsync(casamentoId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensCasamento.NaoEncontrado);
    }

    private async Task<CasamentoAssessorado> ObterCasamentoAtivoAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        var casamento = await ObterCasamentoAsync(casamentoId, cancelamento);

        if (casamento.Arquivado)
        {
            throw new RegraNegocioException(MensagensAcessoCronograma.CasamentoArquivado);
        }

        if (ValidadeAcessoCronograma.Expirado(casamento.Data, _calendario.Hoje()))
        {
            throw new RegraNegocioException(MensagensAcessoCronograma.LinksExpirados);
        }

        return casamento;
    }

    private async Task<AcessoCronograma> ObterAcessoAsync(Guid casamentoId, Guid linkId, CancellationToken cancelamento)
    {
        return await _acessoRepository.ObterAsync(casamentoId, linkId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensAcessoCronograma.LinkNaoEncontrado);
    }
}
