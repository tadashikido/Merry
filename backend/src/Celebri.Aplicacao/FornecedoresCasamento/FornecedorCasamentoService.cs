using Celebri.Aplicacao.Arquivos;
using Celebri.Aplicacao.Calendario;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Persistencia;
using Celebri.Aplicacao.UsuarioAtual;
using Celebri.Dominio.Casamentos;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Financeiro;
using Celebri.Dominio.Fornecedores;

namespace Celebri.Aplicacao.FornecedoresCasamento;

public class FornecedorCasamentoService : IFornecedorCasamentoService
{
    private readonly ICasamentoRepository _casamentoRepository;
    private readonly IFornecedorRepository _fornecedorRepository;
    private readonly IFornecedorCasamentoRepository _vinculoRepository;
    private readonly IParcelaFornecedorRepository _parcelaRepository;
    private readonly IArmazenamentoArquivos _armazenamento;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly TimeProvider _relogio;
    private readonly IUsuarioAtual _usuarioAtual;
    private readonly ICalendarioLocal _calendario;

    public FornecedorCasamentoService(
        ICasamentoRepository casamentoRepository,
        IFornecedorRepository fornecedorRepository,
        IFornecedorCasamentoRepository vinculoRepository,
        IParcelaFornecedorRepository parcelaRepository,
        IArmazenamentoArquivos armazenamento,
        IUnidadeTrabalho unidadeTrabalho,
        TimeProvider relogio,
        ICalendarioLocal calendario,
        IUsuarioAtual usuarioAtual)
    {
        _parcelaRepository = parcelaRepository;
        _calendario = calendario;
        _casamentoRepository = casamentoRepository;
        _fornecedorRepository = fornecedorRepository;
        _vinculoRepository = vinculoRepository;
        _armazenamento = armazenamento;
        _unidadeTrabalho = unidadeTrabalho;
        _relogio = relogio;
        _usuarioAtual = usuarioAtual;
    }

    public async Task<ListaFornecedoresCasamentoDto> ListarAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        var casamento = await ObterCasamentoAsync(casamentoId, cancelamento);
        var vinculos = await _vinculoRepository.ListarPorCasamentoAsync(casamento.Id, cancelamento);
        var parcelas = await _parcelaRepository.ListarPorCasamentoAsync(casamento.Id, cancelamento);
        var parcelasPorVinculo = parcelas.ToLookup(parcela => parcela.FornecedorCasamentoId);
        var hoje = _calendario.Hoje();
        var exibirInternos = _usuarioAtual.EhAssessoria();

        var ordenados = vinculos
            .OrderBy(item => item.Fornecedor.Categoria)
            .ThenBy(item => item.Fornecedor.NomeEmpresa, StringComparer.CurrentCultureIgnoreCase)
            .ToList();

        return new ListaFornecedoresCasamentoDto(
            ordenados
                .Select(item => ParaDto(
                    item,
                    exibirInternos,
                    CalculadoraResumoOrcamento.ResumoParcelas(item.Vinculo, parcelasPorVinculo[item.Vinculo.Id].ToList(), hoje)))
                .ToList(),
            CalculadoraResumoOrcamento.Calcular(ordenados, parcelas, hoje),
            casamento.Arquivado,
            !exibirInternos || casamento.Arquivado);
    }

    public async Task<FornecedorCasamentoDto> ObterAsync(Guid casamentoId, Guid vinculoId, CancellationToken cancelamento)
    {
        var casamento = await ObterCasamentoAsync(casamentoId, cancelamento);
        var vinculo = await ObterVinculoAsync(casamento.Id, vinculoId, cancelamento);
        return ParaDto(vinculo, _usuarioAtual.EhAssessoria(), await ResumoParcelasAsync(vinculo.Vinculo, cancelamento));
    }

    public async Task<FornecedorCasamentoDto> VincularAsync(
        Guid casamentoId,
        VincularFornecedorRequest request,
        CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var casamento = await ObterCasamentoEditavelAsync(casamentoId, cancelamento);
        var fornecedorId = request.FornecedorId
            ?? throw new RegraNegocioException(MensagensFornecedoresCasamento.FornecedorObrigatorio, FornecedorCasamento.CampoFornecedorId);
        var fornecedor = await _fornecedorRepository.ObterAsync(fornecedorId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensFornecedores.FornecedorNaoEncontrado);

        if (fornecedor.Arquivado)
        {
            throw new RegraNegocioException(MensagensFornecedoresCasamento.FornecedorArquivado, FornecedorCasamento.CampoFornecedorId);
        }

        var vinculados = await _vinculoRepository.ListarFornecedoresVinculadosAsync(casamento.Id, cancelamento);

        if (vinculados.Contains(fornecedor.Id))
        {
            throw new RegraNegocioException(MensagensFornecedoresCasamento.JaVinculado, FornecedorCasamento.CampoFornecedorId);
        }

        if (vinculados.Count >= FornecedorCasamento.LimitePorCasamento)
        {
            throw new RegraNegocioException(MensagensFornecedoresCasamento.LimitePorCasamento);
        }

        var vinculo = FornecedorCasamento.Criar(
            casamento.Id,
            fornecedor.Id,
            request.ParaDados(),
            _usuarioAtual.UsuarioId,
            _relogio.GetUtcNow());

        _vinculoRepository.Adicionar(vinculo);
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return ParaDto(new VinculoFornecedor(vinculo, fornecedor), exibirInternos: true);
    }

    public async Task<FornecedorCasamentoDto> AtualizarAsync(
        Guid casamentoId,
        Guid vinculoId,
        AtualizarFornecedorCasamentoRequest request,
        CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var casamento = await ObterCasamentoEditavelAsync(casamentoId, cancelamento);
        var item = await ObterVinculoAsync(casamento.Id, vinculoId, cancelamento);
        var dados = request.ParaDados();
        var totais = await _parcelaRepository.ObterTotaisPorVinculoAsync(casamento.Id, item.Vinculo.Id, cancelamento);

        item.Vinculo.GarantirCompativelComParcelas(dados, totais.Quantidade, totais.Soma);
        item.Vinculo.Atualizar(dados, _relogio.GetUtcNow());
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return ParaDto(item, exibirInternos: true, await ResumoParcelasAsync(item.Vinculo, cancelamento));
    }

    public async Task RemoverAsync(Guid casamentoId, Guid vinculoId, CancellationToken cancelamento)
    {
        var casamento = await ObterCasamentoEditavelAsync(casamentoId, cancelamento);
        var item = await ObterVinculoAsync(casamento.Id, vinculoId, cancelamento);
        var totais = await _parcelaRepository.ObterTotaisPorVinculoAsync(casamento.Id, item.Vinculo.Id, cancelamento);

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

    public async Task<FornecedorCasamentoDto> AnexarContratoAsync(
        Guid casamentoId,
        Guid vinculoId,
        string? nomeArquivo,
        Stream conteudo,
        CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(conteudo);

        var casamento = await ObterCasamentoEditavelAsync(casamentoId, cancelamento);
        var item = await ObterVinculoAsync(casamento.Id, vinculoId, cancelamento);
        var bytes = await ArquivoPdf.LerComLimiteAsync(conteudo, cancelamento);

        if (bytes.Length == 0)
        {
            throw new RegraNegocioException(MensagensFornecedoresCasamento.ContratoVazio);
        }

        if (!ArquivoPdf.PossuiAssinaturaPdf(bytes))
        {
            throw new RegraNegocioException(MensagensFornecedoresCasamento.ContratoFormatoInvalido);
        }

        var vinculo = item.Vinculo;
        var novaChave = new ChaveArquivo(vinculo.OrganizacaoId, vinculo.CasamentoId, Guid.NewGuid());
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

    public async Task<ArquivoContrato> ObterContratoAsync(Guid casamentoId, Guid vinculoId, CancellationToken cancelamento)
    {
        var casamento = await ObterCasamentoAsync(casamentoId, cancelamento);
        var item = await ObterVinculoAsync(casamento.Id, vinculoId, cancelamento);
        var chave = ChaveContrato(item.Vinculo)
            ?? throw new RecursoNaoEncontradoException(MensagensFornecedoresCasamento.ContratoNaoEncontrado);
        var conteudo = await _armazenamento.AbrirLeituraAsync(chave, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensFornecedoresCasamento.ContratoNaoEncontrado);

        return new ArquivoContrato(conteudo, item.Vinculo.ContratoNomeArquivo ?? ArquivoPdf.NomePadrao);
    }

    public async Task<FornecedorCasamentoDto> RemoverContratoAsync(Guid casamentoId, Guid vinculoId, CancellationToken cancelamento)
    {
        var casamento = await ObterCasamentoEditavelAsync(casamentoId, cancelamento);
        var item = await ObterVinculoAsync(casamento.Id, vinculoId, cancelamento);
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
        Guid casamentoId,
        ImportarFornecedoresRequest request,
        CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var destino = await ObterCasamentoEditavelAsync(casamentoId, cancelamento);
        var origemId = request.CasamentoOrigemId
            ?? throw new RegraNegocioException(MensagensFornecedoresCasamento.CasamentoOrigemObrigatorio);

        if (origemId == destino.Id)
        {
            throw new RegraNegocioException(MensagensFornecedoresCasamento.ImportarMesmoCasamento);
        }

        var origem = await ObterCasamentoAsync(origemId, cancelamento);
        var daOrigem = await _vinculoRepository.ListarPorCasamentoAsync(origem.Id, cancelamento);
        var vinculados = (await _vinculoRepository.ListarFornecedoresVinculadosAsync(destino.Id, cancelamento)).ToHashSet();
        var agora = _relogio.GetUtcNow();
        var importados = 0;
        var ignorados = 0;

        foreach (var item in daOrigem)
        {
            var elegivel = item.Vinculo.ElegivelParaCopia(item.Fornecedor.Arquivado)
                && !vinculados.Contains(item.Fornecedor.Id)
                && vinculados.Count < FornecedorCasamento.LimitePorCasamento;

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

    public static FornecedorCasamentoDto ParaDto(
        VinculoFornecedor item,
        bool exibirInternos,
        ResumoParcelasVinculoDto? parcelas = null)
    {
        ArgumentNullException.ThrowIfNull(item);

        var vinculo = item.Vinculo;
        var fornecedor = item.Fornecedor;

        return new FornecedorCasamentoDto(
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

    private async Task<ResumoParcelasVinculoDto?> ResumoParcelasAsync(FornecedorCasamento vinculo, CancellationToken cancelamento)
    {
        var parcelas = await _parcelaRepository.ListarPorVinculoAsync(vinculo.CasamentoId, vinculo.Id, cancelamento);
        return CalculadoraResumoOrcamento.ResumoParcelas(vinculo, parcelas, _calendario.Hoje());
    }

    private static ChaveArquivo? ChaveContrato(FornecedorCasamento vinculo)
    {
        return vinculo.ContratoArquivoId is { } arquivoId
            ? new ChaveArquivo(vinculo.OrganizacaoId, vinculo.CasamentoId, arquivoId)
            : null;
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

    private async Task<VinculoFornecedor> ObterVinculoAsync(Guid casamentoId, Guid vinculoId, CancellationToken cancelamento)
    {
        return await _vinculoRepository.ObterAsync(casamentoId, vinculoId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensFornecedoresCasamento.NaoEncontrado);
    }
}
