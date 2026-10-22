using Celebri.Aplicacao.Autenticacao.Portas;
using Celebri.Aplicacao.Calendario;
using Celebri.Aplicacao.CronogramaPublico.Portas;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Cronogramas;
using Celebri.Dominio.Excecoes;

namespace Celebri.Aplicacao.CronogramaPublico;

public class LinkCronogramaService : ILinkCronogramaService
{
    private readonly IEventoRepository _eventoRepository;
    private readonly IItemCronogramaRepository _itemRepository;
    private readonly IFornecedorEventoRepository _vinculoRepository;
    private readonly IAcessoCronogramaRepository _acessoRepository;
    private readonly IGeradorTokenOpaco _geradorToken;
    private readonly ICifradorTokenCronograma _cifrador;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly ICalendarioLocal _calendario;
    private readonly TimeProvider _relogio;

    public LinkCronogramaService(
        IEventoRepository eventoRepository,
        IItemCronogramaRepository itemRepository,
        IFornecedorEventoRepository vinculoRepository,
        IAcessoCronogramaRepository acessoRepository,
        IGeradorTokenOpaco geradorToken,
        ICifradorTokenCronograma cifrador,
        IUnidadeTrabalho unidadeTrabalho,
        ICalendarioLocal calendario,
        TimeProvider relogio)
    {
        _eventoRepository = eventoRepository;
        _itemRepository = itemRepository;
        _vinculoRepository = vinculoRepository;
        _acessoRepository = acessoRepository;
        _geradorToken = geradorToken;
        _cifrador = cifrador;
        _unidadeTrabalho = unidadeTrabalho;
        _calendario = calendario;
        _relogio = relogio;
    }

    public async Task<LinksCronogramaDto> ListarAsync(Guid eventoId, CancellationToken cancelamento)
    {
        var evento = await ObterEventoAsync(eventoId, cancelamento);
        var itens = OrdenacaoCronograma.Ordenar(await _itemRepository.ListarPorEventoAsync(evento.Id, cancelamento));
        var vinculos = await _vinculoRepository.ListarPorEventoAsync(evento.Id, cancelamento);
        var acessos = await _acessoRepository.ListarPorEventoAsync(evento.Id, cancelamento);

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
            .Select(vinculo => (Vinculo: vinculo, Acesso: acessos.FirstOrDefault(acesso => acesso.FornecedorEventoId == vinculo.Vinculo.Id)))
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
                itens.Count(item => item.FornecedorEventoId == par.Vinculo.Vinculo.Id),
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
            ValidadeAcessoCronograma.ValidoAte(evento.Data),
            ValidadeAcessoCronograma.Expirado(evento.Data, _calendario.Hoje()),
            evento.Arquivado,
            destinos);
    }

    public async Task<LinkCronogramaDto> GerarAsync(Guid eventoId, GerarLinkCronogramaRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var evento = await ObterEventoAtivoAsync(eventoId, cancelamento);
        var destino = request.ParaDestino();
        await ValidarDestinoAsync(evento.Id, destino, cancelamento);

        var existente = (await _acessoRepository.ListarPorEventoAsync(evento.Id, cancelamento))
            .FirstOrDefault(acesso => acesso.MesmoDestino(destino));

        if (existente is not null)
        {
            var tokenExistente = _cifrador.Decifrar(existente.TokenCifrado, existente.EventoId)
                ?? throw new ConflitoException(MensagensAcessoCronograma.LinkIrrecuperavel);

            return new LinkCronogramaDto(existente.Id, tokenExistente, existente.GeradoEm);
        }

        var token = _geradorToken.Gerar();
        var acesso = AcessoCronograma.Gerar(
            evento,
            destino,
            _geradorToken.CalcularHash(token),
            _cifrador.Cifrar(token, evento.Id),
            _relogio.GetUtcNow());
        _acessoRepository.Adicionar(acesso);
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return new LinkCronogramaDto(acesso.Id, token, acesso.GeradoEm);
    }

    public async Task<LinkCronogramaDto> RegenerarAsync(Guid eventoId, Guid linkId, CancellationToken cancelamento)
    {
        var evento = await ObterEventoAtivoAsync(eventoId, cancelamento);
        var acesso = await ObterAcessoAsync(evento.Id, linkId, cancelamento);
        var token = _geradorToken.Gerar();

        acesso.Renovar(_geradorToken.CalcularHash(token), _cifrador.Cifrar(token, evento.Id), _relogio.GetUtcNow());
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return new LinkCronogramaDto(acesso.Id, token, acesso.GeradoEm);
    }

    public async Task RevogarAsync(Guid eventoId, Guid linkId, CancellationToken cancelamento)
    {
        var evento = await ObterEventoAsync(eventoId, cancelamento);
        var acesso = await ObterAcessoAsync(evento.Id, linkId, cancelamento);

        _acessoRepository.Remover(acesso);
        await _unidadeTrabalho.SalvarAsync(cancelamento);
    }

    private async Task ValidarDestinoAsync(Guid eventoId, DestinoAcessoCronograma destino, CancellationToken cancelamento)
    {
        if (destino.Tipo == TipoAcessoCronograma.Fornecedor)
        {
            var vinculo = await _vinculoRepository.ObterAsync(eventoId, destino.FornecedorEventoId!.Value, cancelamento);

            if (vinculo is null || vinculo.Vinculo.EventoId != eventoId || vinculo.Vinculo.Cancelado)
            {
                throw new RegraNegocioException(MensagensAcessoCronograma.FornecedorInvalido, DestinoAcessoCronograma.CampoFornecedor);
            }
        }

        if (destino.Tipo == TipoAcessoCronograma.Responsavel)
        {
            var itens = await _itemRepository.ListarPorEventoAsync(eventoId, cancelamento);

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
            : new LinkCronogramaDto(acesso.Id, _cifrador.Decifrar(acesso.TokenCifrado, acesso.EventoId), acesso.GeradoEm);
    }

    private async Task<Evento> ObterEventoAsync(Guid eventoId, CancellationToken cancelamento)
    {
        return await _eventoRepository.ObterPorIdAsync(eventoId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensEvento.NaoEncontrado);
    }

    private async Task<Evento> ObterEventoAtivoAsync(Guid eventoId, CancellationToken cancelamento)
    {
        var evento = await ObterEventoAsync(eventoId, cancelamento);

        if (evento.Arquivado)
        {
            throw new RegraNegocioException(MensagensAcessoCronograma.EventoArquivado);
        }

        if (ValidadeAcessoCronograma.Expirado(evento.Data, _calendario.Hoje()))
        {
            throw new RegraNegocioException(MensagensAcessoCronograma.LinksExpirados);
        }

        return evento;
    }

    private async Task<AcessoCronograma> ObterAcessoAsync(Guid eventoId, Guid linkId, CancellationToken cancelamento)
    {
        return await _acessoRepository.ObterAsync(eventoId, linkId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensAcessoCronograma.LinkNaoEncontrado);
    }
}
