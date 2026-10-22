using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Fornecedores;

namespace Celebri.Aplicacao.Fornecedores;

public class FornecedorService : IFornecedorService
{
    private readonly IFornecedorRepository _fornecedorRepository;
    private readonly IFornecedorEventoRepository _vinculoRepository;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly TimeProvider _relogio;

    public FornecedorService(
        IFornecedorRepository fornecedorRepository,
        IFornecedorEventoRepository vinculoRepository,
        IUnidadeTrabalho unidadeTrabalho,
        TimeProvider relogio)
    {
        _fornecedorRepository = fornecedorRepository;
        _vinculoRepository = vinculoRepository;
        _unidadeTrabalho = unidadeTrabalho;
        _relogio = relogio;
    }

    public async Task<IReadOnlyList<FornecedorResumoDto>> ListarAsync(CancellationToken cancelamento)
    {
        var fornecedores = await _fornecedorRepository.ListarAsync(cancelamento);

        return fornecedores
            .OrderBy(fornecedor => fornecedor.NomeEmpresa, StringComparer.CurrentCultureIgnoreCase)
            .ThenBy(fornecedor => fornecedor.Categoria)
            .Select(ParaResumo)
            .ToList();
    }

    public async Task<FornecedorDto> ObterAsync(Guid fornecedorId, CancellationToken cancelamento)
    {
        return ParaDto(await ObterFornecedorAsync(fornecedorId, cancelamento));
    }

    public async Task<FornecedorDto> CriarAsync(SalvarFornecedorRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var dados = request.ParaDados();

        if (await _fornecedorRepository.ContarAsync(cancelamento) >= Fornecedor.LimitePorOrganizacao)
        {
            throw new RegraNegocioException(MensagensFornecedores.LimiteFornecedores);
        }

        await GarantirNomeDisponivelAsync(dados, null, cancelamento);

        var fornecedor = Fornecedor.Criar(dados, _relogio.GetUtcNow());
        _fornecedorRepository.Adicionar(fornecedor);
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return ParaDto(fornecedor);
    }

    public async Task<FornecedorDto> AtualizarAsync(Guid fornecedorId, SalvarFornecedorRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var dados = request.ParaDados();
        var fornecedor = await ObterFornecedorAsync(fornecedorId, cancelamento);

        if (fornecedor.Arquivado)
        {
            throw new RegraNegocioException(MensagensFornecedores.ArquivadoSemEdicao);
        }

        await GarantirNomeDisponivelAsync(dados, fornecedor.Id, cancelamento);

        fornecedor.Atualizar(dados, _relogio.GetUtcNow());
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return ParaDto(fornecedor);
    }

    public async Task<FornecedorDto> ArquivarAsync(Guid fornecedorId, CancellationToken cancelamento)
    {
        var fornecedor = await ObterFornecedorAsync(fornecedorId, cancelamento);
        fornecedor.Arquivar(_relogio.GetUtcNow());
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return ParaDto(fornecedor);
    }

    public async Task<FornecedorDto> RestaurarAsync(Guid fornecedorId, CancellationToken cancelamento)
    {
        var fornecedor = await ObterFornecedorAsync(fornecedorId, cancelamento);
        fornecedor.Restaurar(_relogio.GetUtcNow());
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return ParaDto(fornecedor);
    }

    public async Task RemoverAsync(Guid fornecedorId, CancellationToken cancelamento)
    {
        var fornecedor = await ObterFornecedorAsync(fornecedorId, cancelamento);

        if (await _vinculoRepository.ExisteParaFornecedorAsync(fornecedor.Id, cancelamento))
        {
            throw new RegraNegocioException(MensagensFornecedores.ParticipouDeEventos);
        }

        _fornecedorRepository.Remover(fornecedor);
        await _unidadeTrabalho.SalvarAsync(cancelamento);
    }

    public async Task<IReadOnlyList<ParticipacaoFornecedorDto>> ListarParticipacoesAsync(
        Guid fornecedorId,
        CancellationToken cancelamento)
    {
        var fornecedor = await ObterFornecedorAsync(fornecedorId, cancelamento);
        var participacoes = await _vinculoRepository.ListarParticipacoesAsync(fornecedor.Id, cancelamento);

        return participacoes
            .OrderByDescending(participacao => participacao.DataEvento)
            .ThenBy(participacao => participacao.NomePrimeiraPessoa, StringComparer.CurrentCultureIgnoreCase)
            .Select(participacao => new ParticipacaoFornecedorDto(
                participacao.EventoId,
                participacao.NomePrimeiraPessoa,
                participacao.NomeSegundaPessoa,
                participacao.DataEvento,
                participacao.EventoArquivado,
                participacao.Status.ToString()))
            .ToList();
    }

    public static FornecedorDto ParaDto(Fornecedor fornecedor)
    {
        ArgumentNullException.ThrowIfNull(fornecedor);

        return new FornecedorDto(
            fornecedor.Id,
            fornecedor.Categoria.ToString(),
            fornecedor.NomeEmpresa,
            fornecedor.Responsavel,
            fornecedor.Telefone,
            fornecedor.Email,
            fornecedor.Site,
            fornecedor.Instagram,
            fornecedor.Observacoes,
            fornecedor.Arquivado,
            fornecedor.ArquivadoEm,
            fornecedor.CriadoEm,
            fornecedor.AtualizadoEm);
    }

    public static FornecedorResumoDto ParaResumo(Fornecedor fornecedor)
    {
        ArgumentNullException.ThrowIfNull(fornecedor);

        return new FornecedorResumoDto(
            fornecedor.Id,
            fornecedor.Categoria.ToString(),
            fornecedor.NomeEmpresa,
            fornecedor.Responsavel,
            fornecedor.Telefone,
            fornecedor.Email,
            fornecedor.Site,
            fornecedor.Instagram,
            fornecedor.Arquivado,
            fornecedor.AtualizadoEm);
    }

    private async Task<Fornecedor> ObterFornecedorAsync(Guid fornecedorId, CancellationToken cancelamento)
    {
        return await _fornecedorRepository.ObterAsync(fornecedorId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensFornecedores.FornecedorNaoEncontrado);
    }

    private async Task GarantirNomeDisponivelAsync(DadosFornecedor dados, Guid? fornecedorAtual, CancellationToken cancelamento)
    {
        var chave = Fornecedor.ChaveNome(dados.NomeEmpresa);
        var existente = await _fornecedorRepository.BuscarPorChaveAsync(dados.Categoria, chave, fornecedorAtual, cancelamento);

        if (existente is null)
        {
            return;
        }

        throw new RegraNegocioException(
            existente.Arquivado ? MensagensFornecedores.NomeRepetidoArquivado : MensagensFornecedores.NomeRepetido,
            Fornecedor.CampoNomeEmpresa);
    }
}
