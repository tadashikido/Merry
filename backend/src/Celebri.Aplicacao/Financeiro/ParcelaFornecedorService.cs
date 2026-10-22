using Celebri.Aplicacao.Arquivos;
using Celebri.Aplicacao.Calendario;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.FornecedoresEvento;
using Celebri.Aplicacao.Persistencia;
using Celebri.Aplicacao.UsuarioAtual;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Financeiro;
using Celebri.Dominio.Fornecedores;

namespace Celebri.Aplicacao.Financeiro;

public class ParcelaFornecedorService : IParcelaFornecedorService
{
    public const int LimiteAlertasOrganizacao = 10;
    public const int LimiteAlertasEvento = 5;

    private readonly IEventoRepository _eventoRepository;
    private readonly IFornecedorEventoRepository _vinculoRepository;
    private readonly IParcelaFornecedorRepository _parcelaRepository;
    private readonly IArmazenamentoArquivos _armazenamento;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly TimeProvider _relogio;
    private readonly ICalendarioLocal _calendario;
    private readonly IUsuarioAtual _usuarioAtual;

    public ParcelaFornecedorService(
        IEventoRepository eventoRepository,
        IFornecedorEventoRepository vinculoRepository,
        IParcelaFornecedorRepository parcelaRepository,
        IArmazenamentoArquivos armazenamento,
        IUnidadeTrabalho unidadeTrabalho,
        TimeProvider relogio,
        ICalendarioLocal calendario,
        IUsuarioAtual usuarioAtual)
    {
        _eventoRepository = eventoRepository;
        _vinculoRepository = vinculoRepository;
        _parcelaRepository = parcelaRepository;
        _armazenamento = armazenamento;
        _unidadeTrabalho = unidadeTrabalho;
        _relogio = relogio;
        _calendario = calendario;
        _usuarioAtual = usuarioAtual;
    }

    public async Task<FinanceiroEventoDto> ObterFinanceiroAsync(Guid eventoId, CancellationToken cancelamento)
    {
        var evento = await ObterEventoAsync(eventoId, cancelamento);
        var vinculos = await _vinculoRepository.ListarPorEventoAsync(evento.Id, cancelamento);
        var parcelas = await _parcelaRepository.ListarPorEventoAsync(evento.Id, cancelamento);
        var hoje = _calendario.Hoje();
        var numeracao = NumeracaoParcelas.Numerar(parcelas);
        var parcelasPorVinculo = parcelas.ToLookup(parcela => parcela.FornecedorEventoId);

        var fornecedores = vinculos
            .Where(item => item.Vinculo.Status == StatusFornecedorEvento.Contratado
                || (item.Vinculo.Cancelado && parcelasPorVinculo[item.Vinculo.Id].Any()))
            .OrderBy(item => item.Vinculo.Cancelado)
            .ThenBy(item => item.Fornecedor.Categoria)
            .ThenBy(item => item.Fornecedor.NomeEmpresa, StringComparer.CurrentCultureIgnoreCase)
            .Select(item => ParaFornecedorDto(item, parcelasPorVinculo[item.Vinculo.Id].ToList(), numeracao, hoje))
            .ToList();

        var contratados = vinculos
            .Where(item => item.Vinculo.Status == StatusFornecedorEvento.Contratado)
            .Select(item => item.Vinculo.Id)
            .ToHashSet();
        var consideradas = evento.Arquivado
            ? []
            : parcelas.Where(parcela => contratados.Contains(parcela.FornecedorEventoId)).ToList();
        var exibirAcoes = _usuarioAtual.EhAssessoria();

        return new FinanceiroEventoDto(
            CalculadoraResumoOrcamento.Calcular(vinculos, parcelas, hoje),
            CalculadoraAlertasPagamentos.Calcular(consideradas, hoje),
            fornecedores,
            hoje,
            evento.Arquivado,
            !exibirAcoes || evento.Arquivado);
    }

    public async Task<AlertasPagamentosDto> ObterAlertasEventoAsync(Guid eventoId, CancellationToken cancelamento)
    {
        var evento = await ObterEventoAsync(eventoId, cancelamento);
        return await MontarAlertasAsync(evento.Id, LimiteAlertasEvento, cancelamento);
    }

    public Task<AlertasPagamentosDto> ObterAlertasOrganizacaoAsync(CancellationToken cancelamento)
    {
        return MontarAlertasAsync(null, LimiteAlertasOrganizacao, cancelamento);
    }

    public async Task<CronogramaParcelasDto> ListarAsync(Guid eventoId, Guid vinculoId, CancellationToken cancelamento)
    {
        var evento = await ObterEventoAsync(eventoId, cancelamento);
        var vinculo = await ObterVinculoAsync(evento.Id, vinculoId, cancelamento);
        var parcelas = await _parcelaRepository.ListarPorVinculoAsync(evento.Id, vinculo.Id, cancelamento);
        return ParaCronograma(vinculo, parcelas, _calendario.Hoje());
    }

    public async Task<ParcelaDto> CriarAsync(
        Guid eventoId,
        Guid vinculoId,
        SalvarParcelaRequest request,
        CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var contexto = await ObterContextoEditavelAsync(eventoId, vinculoId, cancelamento);
        var dados = request.ParaDados();

        if (contexto.Parcelas.Count >= ParcelaFornecedor.LimitePorVinculo)
        {
            throw new RegraNegocioException(MensagensFinanceiro.LimiteParcelas);
        }

        RegrasSomaParcelas.GarantirDentroDoContratado(
            contexto.Vinculo.ValorContratado!.Value,
            contexto.Parcelas.Sum(parcela => parcela.Valor) + dados.Valor,
            ParcelaFornecedor.CampoValor);

        var agora = _relogio.GetUtcNow();
        var parcela = ParcelaFornecedor.Criar(contexto.Vinculo, dados, _usuarioAtual.UsuarioId, agora);
        _parcelaRepository.Adicionar(parcela);
        await SalvarComVinculoAsync(contexto.Vinculo, agora, cancelamento);

        return ParaDto(parcela, [.. contexto.Parcelas, parcela], _calendario.Hoje());
    }

    public async Task<CronogramaParcelasDto> GerarAsync(
        Guid eventoId,
        Guid vinculoId,
        GerarParcelasRequest request,
        CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var contexto = await ObterContextoEditavelAsync(eventoId, vinculoId, cancelamento);
        var quantidade = request.Quantidade
            ?? throw new RegraNegocioException(MensagensFinanceiro.QuantidadeObrigatoria, ParcelaFornecedor.CampoQuantidade);
        var primeiroVencimento = request.PrimeiroVencimento
            ?? throw new RegraNegocioException(MensagensFinanceiro.PrimeiroVencimentoObrigatorio, ParcelaFornecedor.CampoPrimeiroVencimento);
        var contratado = contexto.Vinculo.ValorContratado!.Value;
        var somaAtual = contexto.Parcelas.Sum(parcela => parcela.Valor);
        var saldo = RegrasSomaParcelas.SaldoAParcelar(contratado, somaAtual);
        var total = request.ValorTotal ?? saldo;

        if (total <= 0m)
        {
            throw new RegraNegocioException(MensagensFinanceiro.SemSaldoParaGerar, ParcelaFornecedor.CampoValorTotal);
        }

        if (contexto.Parcelas.Count + quantidade > ParcelaFornecedor.LimitePorVinculo)
        {
            throw new RegraNegocioException(MensagensFinanceiro.LimiteParcelas, ParcelaFornecedor.CampoQuantidade);
        }

        RegrasSomaParcelas.GarantirDentroDoContratado(contratado, somaAtual + total, ParcelaFornecedor.CampoValorTotal);

        var agora = _relogio.GetUtcNow();
        var novas = GeradorParcelas.Gerar(total, quantidade, primeiroVencimento, request.Observacao)
            .Select(dados => ParcelaFornecedor.Criar(contexto.Vinculo, dados, _usuarioAtual.UsuarioId, agora))
            .ToList();

        foreach (var parcela in novas)
        {
            _parcelaRepository.Adicionar(parcela);
        }

        await SalvarComVinculoAsync(contexto.Vinculo, agora, cancelamento);

        return ParaCronograma(contexto.Vinculo, [.. contexto.Parcelas, .. novas], _calendario.Hoje());
    }

    public async Task<ParcelaDto> AtualizarAsync(
        Guid eventoId,
        Guid vinculoId,
        Guid parcelaId,
        SalvarParcelaRequest request,
        CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var contexto = await ObterContextoEditavelAsync(eventoId, vinculoId, cancelamento);
        var parcela = contexto.Obter(parcelaId);
        var dados = request.ParaDados();

        parcela.GarantirPendente();
        RegrasSomaParcelas.GarantirDentroDoContratado(
            contexto.Vinculo.ValorContratado!.Value,
            contexto.Parcelas.Where(outra => outra.Id != parcela.Id).Sum(outra => outra.Valor) + dados.Valor,
            ParcelaFornecedor.CampoValor);

        var agora = _relogio.GetUtcNow();
        parcela.Atualizar(dados, agora);
        await SalvarComVinculoAsync(contexto.Vinculo, agora, cancelamento);

        return ParaDto(parcela, contexto.Parcelas, _calendario.Hoje());
    }

    public async Task RemoverAsync(Guid eventoId, Guid vinculoId, Guid parcelaId, CancellationToken cancelamento)
    {
        var contexto = await ObterContextoEditavelAsync(eventoId, vinculoId, cancelamento);
        var parcela = contexto.Obter(parcelaId);

        parcela.GarantirPendente();
        _parcelaRepository.Remover(parcela);
        await SalvarComVinculoAsync(contexto.Vinculo, _relogio.GetUtcNow(), cancelamento);
    }

    public async Task<ParcelaDto> RegistrarPagamentoAsync(
        Guid eventoId,
        Guid vinculoId,
        Guid parcelaId,
        RegistrarPagamentoRequest request,
        CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var contexto = await ObterContextoEditavelAsync(eventoId, vinculoId, cancelamento);
        var parcela = contexto.Obter(parcelaId);
        var hoje = _calendario.Hoje();
        var agora = _relogio.GetUtcNow();

        parcela.RegistrarPagamento(request.PagaEm ?? hoje, hoje, agora);
        await SalvarComVinculoAsync(contexto.Vinculo, agora, cancelamento);

        return ParaDto(parcela, contexto.Parcelas, hoje);
    }

    public async Task<ParcelaDto> DesfazerPagamentoAsync(
        Guid eventoId,
        Guid vinculoId,
        Guid parcelaId,
        CancellationToken cancelamento)
    {
        var contexto = await ObterContextoEditavelAsync(eventoId, vinculoId, cancelamento);
        var parcela = contexto.Obter(parcelaId);
        var agora = _relogio.GetUtcNow();

        var comprovante = parcela.DesfazerPagamento(agora);
        await SalvarComVinculoAsync(contexto.Vinculo, agora, cancelamento);
        await RemoverArquivoAsync(parcela, comprovante);

        return ParaDto(parcela, contexto.Parcelas, _calendario.Hoje());
    }

    public async Task<ParcelaDto> AnexarComprovanteAsync(
        Guid eventoId,
        Guid vinculoId,
        Guid parcelaId,
        string? nomeArquivo,
        Stream conteudo,
        CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(conteudo);

        var contexto = await ObterContextoEditavelAsync(eventoId, vinculoId, cancelamento);
        var parcela = contexto.Obter(parcelaId);

        if (!parcela.Paga)
        {
            throw new RegraNegocioException(MensagensFinanceiro.ComprovanteSemPagamento);
        }

        var bytes = await ArquivoComprovante.LerComLimiteAsync(conteudo, cancelamento);

        if (bytes.Length == 0)
        {
            throw new RegraNegocioException(MensagensFinanceiro.ComprovanteVazio);
        }

        var formato = ArquivoComprovante.DetectarFormato(bytes)
            ?? throw new RegraNegocioException(MensagensFinanceiro.ComprovanteFormatoInvalido);

        var novaChave = new ChaveArquivo(parcela.OrganizacaoId, parcela.EventoId, Guid.NewGuid());
        await _armazenamento.SalvarAsync(novaChave, bytes, cancelamento);

        var agora = _relogio.GetUtcNow();
        var anterior = parcela.AnexarComprovante(
            novaChave.ArquivoId,
            ArquivoComprovante.SanitizarNome(nomeArquivo, formato),
            formato.TipoConteudo,
            bytes.Length,
            agora);

        try
        {
            await SalvarComVinculoAsync(contexto.Vinculo, agora, cancelamento);
        }
        catch
        {
            await _armazenamento.RemoverAsync(novaChave, CancellationToken.None);
            throw;
        }

        await RemoverArquivoAsync(parcela, anterior);

        return ParaDto(parcela, contexto.Parcelas, _calendario.Hoje());
    }

    public async Task<ArquivoComprovanteParcela> ObterComprovanteAsync(
        Guid eventoId,
        Guid vinculoId,
        Guid parcelaId,
        CancellationToken cancelamento)
    {
        var evento = await ObterEventoAsync(eventoId, cancelamento);
        var parcela = await _parcelaRepository.ObterAsync(evento.Id, vinculoId, parcelaId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensFinanceiro.ParcelaNaoEncontrada);

        if (parcela.ComprovanteArquivoId is not { } arquivoId)
        {
            throw new RecursoNaoEncontradoException(MensagensFinanceiro.ComprovanteNaoEncontrado);
        }

        var conteudo = await _armazenamento.AbrirLeituraAsync(
                new ChaveArquivo(parcela.OrganizacaoId, parcela.EventoId, arquivoId),
                cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensFinanceiro.ComprovanteNaoEncontrado);

        return new ArquivoComprovanteParcela(
            conteudo,
            parcela.ComprovanteNomeArquivo ?? ArquivoComprovante.NomePadraoBase,
            parcela.ComprovanteTipoConteudo ?? ArquivoComprovante.TipoPdf);
    }

    public async Task<ParcelaDto> RemoverComprovanteAsync(
        Guid eventoId,
        Guid vinculoId,
        Guid parcelaId,
        CancellationToken cancelamento)
    {
        var contexto = await ObterContextoEditavelAsync(eventoId, vinculoId, cancelamento);
        var parcela = contexto.Obter(parcelaId);

        if (!parcela.PossuiComprovante)
        {
            return ParaDto(parcela, contexto.Parcelas, _calendario.Hoje());
        }

        var agora = _relogio.GetUtcNow();
        var anterior = parcela.RemoverComprovante(agora);
        await SalvarComVinculoAsync(contexto.Vinculo, agora, cancelamento);
        await RemoverArquivoAsync(parcela, anterior);

        return ParaDto(parcela, contexto.Parcelas, _calendario.Hoje());
    }

    public static ParcelaDto ParaDto(ParcelaFornecedor parcela, int numero, int total, DateOnly hoje)
    {
        ArgumentNullException.ThrowIfNull(parcela);

        return new ParcelaDto(
            parcela.Id,
            parcela.FornecedorEventoId,
            numero,
            total,
            parcela.Valor,
            parcela.Vencimento,
            parcela.Observacao,
            parcela.Situacao(hoje).ToString(),
            parcela.DiasParaVencimento(hoje),
            parcela.VenceEmBreve(hoje),
            parcela.PagaEm,
            parcela.PossuiComprovante
                ? new ComprovanteParcelaDto(
                    parcela.ComprovanteNomeArquivo!,
                    parcela.ComprovanteTipoConteudo!,
                    parcela.ComprovanteTamanhoBytes!.Value,
                    parcela.ComprovanteEnviadoEm!.Value)
                : null,
            parcela.AtualizadoEm);
    }

    private static ParcelaDto ParaDto(ParcelaFornecedor parcela, IReadOnlyCollection<ParcelaFornecedor> doVinculo, DateOnly hoje)
    {
        var posicao = NumeracaoParcelas.Numerar(doVinculo)[parcela.Id];
        return ParaDto(parcela, posicao.Numero, posicao.Total, hoje);
    }

    private static CronogramaParcelasDto ParaCronograma(
        FornecedorEvento vinculo,
        IReadOnlyCollection<ParcelaFornecedor> parcelas,
        DateOnly hoje)
    {
        var ordenadas = NumeracaoParcelas.Ordenar(parcelas);
        var parcelado = ordenadas.Sum(parcela => parcela.Valor);
        var contratado = vinculo.ValorContratado ?? 0m;

        return new CronogramaParcelasDto(
            vinculo.Id,
            contratado,
            parcelado,
            ordenadas.Where(parcela => parcela.Paga).Sum(parcela => parcela.Valor),
            RegrasSomaParcelas.SaldoAParcelar(contratado, parcelado),
            ordenadas.Select((parcela, indice) => ParaDto(parcela, indice + 1, ordenadas.Count, hoje)).ToList());
    }

    private static FornecedorFinanceiroDto ParaFornecedorDto(
        VinculoFornecedor item,
        IReadOnlyList<ParcelaFornecedor> parcelas,
        IReadOnlyDictionary<Guid, PosicaoParcela> numeracao,
        DateOnly hoje)
    {
        var vinculo = item.Vinculo;
        var totais = CalculadoraResumoOrcamento.TotaisVinculo(vinculo, parcelas, hoje);
        var parcelado = parcelas.Sum(parcela => parcela.Valor);
        var pago = parcelas.Where(parcela => parcela.Paga).Sum(parcela => parcela.Valor);
        var contratado = vinculo.ValorContratado ?? 0m;

        return new FornecedorFinanceiroDto(
            vinculo.Id,
            item.Fornecedor.Id,
            item.Fornecedor.NomeEmpresa,
            item.Fornecedor.Categoria.ToString(),
            vinculo.Servico,
            vinculo.Status.ToString(),
            contratado,
            parcelado,
            pago,
            totais.Pendente,
            totais.Vencido,
            vinculo.Cancelado ? 0m : RegrasSomaParcelas.SaldoAParcelar(contratado, parcelado),
            NumeracaoParcelas.Ordenar(parcelas)
                .Select(parcela => ParaDto(parcela, numeracao[parcela.Id].Numero, numeracao[parcela.Id].Total, hoje))
                .ToList());
    }

    private async Task<AlertasPagamentosDto> MontarAlertasAsync(Guid? eventoId, int limite, CancellationToken cancelamento)
    {
        var hoje = _calendario.Hoje();
        var alertas = await _parcelaRepository.ListarAlertasAsync(eventoId, hoje, limite, cancelamento);
        var vinculoIds = alertas.Vencidas
            .Concat(alertas.Proximas)
            .Select(item => item.Parcela.FornecedorEventoId)
            .Distinct()
            .ToList();
        var numeracao = vinculoIds.Count == 0
            ? new Dictionary<Guid, PosicaoParcela>()
            : NumeracaoParcelas.Numerar(await _parcelaRepository.ListarPorVinculosAsync(vinculoIds, cancelamento));

        return new AlertasPagamentosDto(
            alertas.TotalVencidas,
            alertas.ValorVencidas,
            alertas.TotalProximas,
            alertas.ValorProximas,
            alertas.EventosComVencidas,
            hoje,
            alertas.Vencidas.Select(item => ParaAlertaDto(item, numeracao, hoje)).ToList(),
            alertas.Proximas.Select(item => ParaAlertaDto(item, numeracao, hoje)).ToList());
    }

    private static ParcelaAlertaDto ParaAlertaDto(
        ParcelaAlerta item,
        IReadOnlyDictionary<Guid, PosicaoParcela> numeracao,
        DateOnly hoje)
    {
        var parcela = item.Parcela;
        var posicao = numeracao.TryGetValue(parcela.Id, out var encontrada) ? encontrada : new PosicaoParcela(1, 1);

        return new ParcelaAlertaDto(
            parcela.Id,
            parcela.EventoId,
            item.NomePrimeiraPessoa,
            item.NomeSegundaPessoa,
            parcela.FornecedorEventoId,
            item.NomeEmpresa,
            posicao.Numero,
            posicao.Total,
            parcela.Valor,
            parcela.Vencimento,
            parcela.DiasParaVencimento(hoje));
    }

    private async Task SalvarComVinculoAsync(FornecedorEvento vinculo, DateTimeOffset agora, CancellationToken cancelamento)
    {
        vinculo.RegistrarAlteracaoParcelas(agora);
        _vinculoRepository.MarcarAlterado(vinculo);
        await _unidadeTrabalho.SalvarAsync(cancelamento);
    }

    private async Task RemoverArquivoAsync(ParcelaFornecedor parcela, Guid? arquivoId)
    {
        if (arquivoId is { } id)
        {
            await _armazenamento.RemoverAsync(new ChaveArquivo(parcela.OrganizacaoId, parcela.EventoId, id), CancellationToken.None);
        }
    }

    private async Task<ContextoParcelas> ObterContextoEditavelAsync(Guid eventoId, Guid vinculoId, CancellationToken cancelamento)
    {
        var evento = await ObterEventoAsync(eventoId, cancelamento);

        if (evento.Arquivado)
        {
            throw new RegraNegocioException(MensagensEvento.ArquivadoSemEdicao);
        }

        var vinculo = await ObterVinculoAsync(evento.Id, vinculoId, cancelamento);
        ParcelaFornecedor.GarantirVinculoAceitaParcelas(vinculo);
        var parcelas = await _parcelaRepository.ListarPorVinculoAsync(evento.Id, vinculo.Id, cancelamento);

        return new ContextoParcelas(vinculo, parcelas);
    }

    private async Task<Evento> ObterEventoAsync(Guid eventoId, CancellationToken cancelamento)
    {
        return await _eventoRepository.ObterPorIdAsync(eventoId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensEvento.NaoEncontrado);
    }

    private async Task<FornecedorEvento> ObterVinculoAsync(Guid eventoId, Guid vinculoId, CancellationToken cancelamento)
    {
        var item = await _vinculoRepository.ObterAsync(eventoId, vinculoId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensFornecedoresEvento.NaoEncontrado);
        return item.Vinculo;
    }

    private sealed record ContextoParcelas(FornecedorEvento Vinculo, IReadOnlyList<ParcelaFornecedor> Parcelas)
    {
        public ParcelaFornecedor Obter(Guid parcelaId)
        {
            return Parcelas.FirstOrDefault(parcela => parcela.Id == parcelaId)
                ?? throw new RecursoNaoEncontradoException(MensagensFinanceiro.ParcelaNaoEncontrada);
        }
    }
}
