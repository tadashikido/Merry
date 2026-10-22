using Celebri.Aplicacao.Arquivos;
using Celebri.Aplicacao.Calendario;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Persistencia;
using Celebri.Aplicacao.UsuarioAtual;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Financeiro;
using Celebri.Dominio.Fornecedores;

namespace Celebri.Aplicacao.FornecedoresEvento;

public class FornecedorEventoService : IFornecedorEventoService
{
    private readonly IEventoRepository _eventoRepository;
    private readonly IFornecedorRepository _fornecedorRepository;
    private readonly IFornecedorEventoRepository _vinculoRepository;
    private readonly IParcelaFornecedorRepository _parcelaRepository;
    private readonly IArmazenamentoArquivos _armazenamento;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly TimeProvider _relogio;
    private readonly IUsuarioAtual _usuarioAtual;
    private readonly ICalendarioLocal _calendario;

    public FornecedorEventoService(
        IEventoRepository eventoRepository,
        IFornecedorRepository fornecedorRepository,
        IFornecedorEventoRepository vinculoRepository,
        IParcelaFornecedorRepository parcelaRepository,
        IArmazenamentoArquivos armazenamento,
        IUnidadeTrabalho unidadeTrabalho,
        TimeProvider relogio,
        ICalendarioLocal calendario,
        IUsuarioAtual usuarioAtual)
    {
        _parcelaRepository = parcelaRepository;
        _calendario = calendario;
        _eventoRepository = eventoRepository;
        _fornecedorRepository = fornecedorRepository;
        _vinculoRepository = vinculoRepository;
        _armazenamento = armazenamento;
        _unidadeTrabalho = unidadeTrabalho;
        _relogio = relogio;
        _usuarioAtual = usuarioAtual;
    }

    public async Task<ListaFornecedoresEventoDto> ListarAsync(Guid eventoId, CancellationToken cancelamento)
    {
        var evento = await ObterEventoAsync(eventoId, cancelamento);
        var vinculos = await _vinculoRepository.ListarPorEventoAsync(evento.Id, cancelamento);
        var parcelas = await _parcelaRepository.ListarPorEventoAsync(evento.Id, cancelamento);
        var parcelasPorVinculo = parcelas.ToLookup(parcela => parcela.FornecedorEventoId);
        var hoje = _calendario.Hoje();
        var exibirInternos = _usuarioAtual.EhAssessoria();

        var ordenados = vinculos
            .OrderBy(item => item.Fornecedor.Categoria)
            .ThenBy(item => item.Fornecedor.NomeEmpresa, StringComparer.CurrentCultureIgnoreCase)
            .ToList();

        return new ListaFornecedoresEventoDto(
            ordenados
                .Select(item => ParaDto(
                    item,
                    exibirInternos,
                    CalculadoraResumoOrcamento.ResumoParcelas(item.Vinculo, parcelasPorVinculo[item.Vinculo.Id].ToList(), hoje)))
                .ToList(),
            CalculadoraResumoOrcamento.Calcular(ordenados, parcelas, hoje),
            evento.Arquivado,
            !exibirInternos || evento.Arquivado);
    }

    public async Task<FornecedorEventoDto> ObterAsync(Guid eventoId, Guid vinculoId, CancellationToken cancelamento)
    {
        var evento = await ObterEventoAsync(eventoId, cancelamento);
        var vinculo = await ObterVinculoAsync(evento.Id, vinculoId, cancelamento);
        return ParaDto(vinculo, _usuarioAtual.EhAssessoria(), await ResumoParcelasAsync(vinculo.Vinculo, cancelamento));
    }

    public async Task<FornecedorEventoDto> VincularAsync(
        Guid eventoId,
        VincularFornecedorRequest request,
        CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var evento = await ObterEventoEditavelAsync(eventoId, cancelamento);
        var fornecedorId = request.FornecedorId
            ?? throw new RegraNegocioException(MensagensFornecedoresEvento.FornecedorObrigatorio, FornecedorEvento.CampoFornecedorId);
        var fornecedor = await _fornecedorRepository.ObterAsync(fornecedorId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensFornecedores.FornecedorNaoEncontrado);

        if (fornecedor.Arquivado)
        {
            throw new RegraNegocioException(MensagensFornecedoresEvento.FornecedorArquivado, FornecedorEvento.CampoFornecedorId);
        }

        var vinculados = await _vinculoRepository.ListarFornecedoresVinculadosAsync(evento.Id, cancelamento);

        if (vinculados.Contains(fornecedor.Id))
        {
            throw new RegraNegocioException(MensagensFornecedoresEvento.JaVinculado, FornecedorEvento.CampoFornecedorId);
        }

        if (vinculados.Count >= FornecedorEvento.LimitePorEvento)
        {
            throw new RegraNegocioException(MensagensFornecedoresEvento.LimitePorEvento);
        }

        var vinculo = FornecedorEvento.Criar(
            evento.Id,
            fornecedor.Id,
            request.ParaDados(),
            _usuarioAtual.UsuarioId,
            _relogio.GetUtcNow());

        _vinculoRepository.Adicionar(vinculo);
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return ParaDto(new VinculoFornecedor(vinculo, fornecedor), exibirInternos: true);
    }

    public async Task<FornecedorEventoDto> AtualizarAsync(
        Guid eventoId,
        Guid vinculoId,
        AtualizarFornecedorEventoRequest request,
        CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var evento = await ObterEventoEditavelAsync(eventoId, cancelamento);
        var item = await ObterVinculoAsync(evento.Id, vinculoId, cancelamento);
        var dados = request.ParaDados();
        var totais = await _parcelaRepository.ObterTotaisPorVinculoAsync(evento.Id, item.Vinculo.Id, cancelamento);

        item.Vinculo.GarantirCompativelComParcelas(dados, totais.Quantidade, totais.Soma);
        item.Vinculo.Atualizar(dados, _relogio.GetUtcNow());
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return ParaDto(item, exibirInternos: true, await ResumoParcelasAsync(item.Vinculo, cancelamento));
    }

    public async Task RemoverAsync(Guid eventoId, Guid vinculoId, CancellationToken cancelamento)
    {
        var evento = await ObterEventoEditavelAsync(eventoId, cancelamento);
        var item = await ObterVinculoAsync(evento.Id, vinculoId, cancelamento);
        var totais = await _parcelaRepository.ObterTotaisPorVinculoAsync(evento.Id, item.Vinculo.Id, cancelamento);

        if (totais.Quantidade > 0)
        {
            throw new RegraNegocioException(MensagensFinanceiro.VinculoComParcelas);
        }

        var contrato = ChaveContrato(item.Vinculo);

        _vinculoRepository.Remover(item.Vinculo);
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        if (contrato is not null)
        {
            await _armazenamento.RemoverAsync(contrato, CancellationToken.None);
        }
    }

    public async Task<FornecedorEventoDto> AnexarContratoAsync(
        Guid eventoId,
        Guid vinculoId,
        string? nomeArquivo,
        Stream conteudo,
        CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(conteudo);

        var evento = await ObterEventoEditavelAsync(eventoId, cancelamento);
        var item = await ObterVinculoAsync(evento.Id, vinculoId, cancelamento);
        var bytes = await ArquivoPdf.LerComLimiteAsync(conteudo, cancelamento);

        if (bytes.Length == 0)
        {
            throw new RegraNegocioException(MensagensFornecedoresEvento.ContratoVazio);
        }

        if (!ArquivoPdf.PossuiAssinaturaPdf(bytes))
        {
            throw new RegraNegocioException(MensagensFornecedoresEvento.ContratoFormatoInvalido);
        }

        var vinculo = item.Vinculo;
        var novaChave = new ChaveArquivo(vinculo.OrganizacaoId, vinculo.EventoId, Guid.NewGuid());
        await _armazenamento.SalvarAsync(novaChave, bytes, cancelamento);

        var anterior = vinculo.AnexarContrato(novaChave.ArquivoId, ArquivoPdf.SanitizarNome(nomeArquivo), bytes.Length, _relogio.GetUtcNow());

        try
        {
            await _unidadeTrabalho.SalvarAsync(cancelamento);
        }
        catch
        {
            await _armazenamento.RemoverAsync(novaChave, CancellationToken.None);
            throw;
        }

        if (anterior is { } arquivoAnterior)
        {
            await _armazenamento.RemoverAsync(novaChave with { ArquivoId = arquivoAnterior }, CancellationToken.None);
        }

        return ParaDto(item, exibirInternos: true, await ResumoParcelasAsync(item.Vinculo, cancelamento));
    }

    public async Task<ArquivoContrato> ObterContratoAsync(Guid eventoId, Guid vinculoId, CancellationToken cancelamento)
    {
        var evento = await ObterEventoAsync(eventoId, cancelamento);
        var item = await ObterVinculoAsync(evento.Id, vinculoId, cancelamento);
        var chave = ChaveContrato(item.Vinculo)
            ?? throw new RecursoNaoEncontradoException(MensagensFornecedoresEvento.ContratoNaoEncontrado);
        var conteudo = await _armazenamento.AbrirLeituraAsync(chave, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensFornecedoresEvento.ContratoNaoEncontrado);

        return new ArquivoContrato(conteudo, item.Vinculo.ContratoNomeArquivo ?? ArquivoPdf.NomePadrao);
    }

    public async Task<FornecedorEventoDto> RemoverContratoAsync(Guid eventoId, Guid vinculoId, CancellationToken cancelamento)
    {
        var evento = await ObterEventoEditavelAsync(eventoId, cancelamento);
        var item = await ObterVinculoAsync(evento.Id, vinculoId, cancelamento);
        var chave = ChaveContrato(item.Vinculo);

        if (chave is null)
        {
            return ParaDto(item, exibirInternos: true, await ResumoParcelasAsync(item.Vinculo, cancelamento));
        }

        item.Vinculo.RemoverContrato(_relogio.GetUtcNow());
        await _unidadeTrabalho.SalvarAsync(cancelamento);
        await _armazenamento.RemoverAsync(chave, CancellationToken.None);

        return ParaDto(item, exibirInternos: true, await ResumoParcelasAsync(item.Vinculo, cancelamento));
    }

    public async Task<ResultadoImportacaoFornecedoresDto> ImportarAsync(
        Guid eventoId,
        ImportarFornecedoresRequest request,
        CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var destino = await ObterEventoEditavelAsync(eventoId, cancelamento);
        var origemId = request.EventoOrigemId
            ?? throw new RegraNegocioException(MensagensFornecedoresEvento.EventoOrigemObrigatorio);

        if (origemId == destino.Id)
        {
            throw new RegraNegocioException(MensagensFornecedoresEvento.ImportarMesmoEvento);
        }

        var origem = await ObterEventoAsync(origemId, cancelamento);
        var daOrigem = await _vinculoRepository.ListarPorEventoAsync(origem.Id, cancelamento);
        var vinculados = (await _vinculoRepository.ListarFornecedoresVinculadosAsync(destino.Id, cancelamento)).ToHashSet();
        var agora = _relogio.GetUtcNow();
        var importados = 0;
        var ignorados = 0;

        foreach (var item in daOrigem)
        {
            var elegivel = item.Vinculo.ElegivelParaCopia(item.Fornecedor.Arquivado)
                && !vinculados.Contains(item.Fornecedor.Id)
                && vinculados.Count < FornecedorEvento.LimitePorEvento;

            if (!elegivel)
            {
                ignorados++;
                continue;
            }

            _vinculoRepository.Adicionar(item.Vinculo.CopiarPara(destino.Id, _usuarioAtual.UsuarioId, agora));
            vinculados.Add(item.Fornecedor.Id);
            importados++;
        }

        if (importados > 0)
        {
            await _unidadeTrabalho.SalvarAsync(cancelamento);
        }

        return new ResultadoImportacaoFornecedoresDto(importados, ignorados);
    }

    public static FornecedorEventoDto ParaDto(
        VinculoFornecedor item,
        bool exibirInternos,
        ResumoParcelasVinculoDto? parcelas = null)
    {
        ArgumentNullException.ThrowIfNull(item);

        var vinculo = item.Vinculo;
        var fornecedor = item.Fornecedor;

        return new FornecedorEventoDto(
            vinculo.Id,
            new FornecedorVinculadoDto(
                fornecedor.Id,
                fornecedor.Categoria.ToString(),
                fornecedor.NomeEmpresa,
                fornecedor.Responsavel,
                fornecedor.Telefone,
                fornecedor.Email,
                fornecedor.Site,
                fornecedor.Instagram,
                fornecedor.Arquivado),
            vinculo.Servico,
            vinculo.ValorOrcado,
            vinculo.ValorContratado,
            vinculo.Status.ToString(),
            exibirInternos ? vinculo.NotasInternas : null,
            vinculo.PossuiContrato
                ? new ContratoFornecedorDto(vinculo.ContratoNomeArquivo!, vinculo.ContratoTamanhoBytes!.Value, vinculo.ContratoEnviadoEm!.Value)
                : null,
            vinculo.CriadoEm,
            vinculo.AtualizadoEm,
            parcelas);
    }

    private async Task<ResumoParcelasVinculoDto?> ResumoParcelasAsync(FornecedorEvento vinculo, CancellationToken cancelamento)
    {
        var parcelas = await _parcelaRepository.ListarPorVinculoAsync(vinculo.EventoId, vinculo.Id, cancelamento);
        return CalculadoraResumoOrcamento.ResumoParcelas(vinculo, parcelas, _calendario.Hoje());
    }

    private static ChaveArquivo? ChaveContrato(FornecedorEvento vinculo)
    {
        return vinculo.ContratoArquivoId is { } arquivoId
            ? new ChaveArquivo(vinculo.OrganizacaoId, vinculo.EventoId, arquivoId)
            : null;
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

    private async Task<VinculoFornecedor> ObterVinculoAsync(Guid eventoId, Guid vinculoId, CancellationToken cancelamento)
    {
        return await _vinculoRepository.ObterAsync(eventoId, vinculoId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensFornecedoresEvento.NaoEncontrado);
    }
}
