using Casamento.Aplicacao.Excecoes;
using Casamento.Aplicacao.Persistencia;
using Casamento.Dominio.Casamentos;
using Casamento.Dominio.Convidados;
using Casamento.Dominio.Excecoes;
using Casamento.Dominio.Mesas;

namespace Casamento.Aplicacao.Mesas;

public class MesaService : IMesaService
{
    private readonly ICasamentoRepository _casamentoRepository;
    private readonly IConviteRepository _conviteRepository;
    private readonly IMesaRepository _mesaRepository;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly TimeProvider _relogio;

    public MesaService(
        ICasamentoRepository casamentoRepository,
        IConviteRepository conviteRepository,
        IMesaRepository mesaRepository,
        IUnidadeTrabalho unidadeTrabalho,
        TimeProvider relogio)
    {
        _casamentoRepository = casamentoRepository;
        _conviteRepository = conviteRepository;
        _mesaRepository = mesaRepository;
        _unidadeTrabalho = unidadeTrabalho;
        _relogio = relogio;
    }

    public async Task<MapaMesasDto> ObterMapaAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        var casamento = await ObterCasamentoAsync(casamentoId, cancelamento);
        return await MontarMapaAsync(casamento, cancelamento);
    }

    public async Task<MesaDto> CriarAsync(Guid casamentoId, SalvarMesaRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var casamento = await ObterCasamentoEditavelAsync(casamentoId, cancelamento);
        var dados = request.ParaDados();

        if (await _mesaRepository.ContarAsync(casamento.Id, cancelamento) >= Mesa.MesasMaximoPorCasamento)
        {
            throw new RegraNegocioException(MensagensMesas.LimitePorCasamento);
        }

        var mesa = Mesa.Criar(casamento.Id, dados, _relogio.GetUtcNow());
        await GarantirUnicidadeAsync(casamento.Id, mesa, null, cancelamento);

        _mesaRepository.Adicionar(mesa);
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return MontadorMapaMesas.ParaDto(mesa, 0);
    }

    public async Task<MesaDto> AtualizarAsync(Guid casamentoId, Guid mesaId, SalvarMesaRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var casamento = await ObterCasamentoEditavelAsync(casamentoId, cancelamento);
        var mesa = await ObterMesaAsync(casamento.Id, mesaId, cancelamento);
        var ocupacao = await _mesaRepository.ContarOcupacaoAsync(casamento.Id, mesa.Id, cancelamento);

        mesa.Atualizar(request.ParaDados(), ocupacao, _relogio.GetUtcNow());
        await GarantirUnicidadeAsync(casamento.Id, mesa, mesa.Id, cancelamento);
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return MontadorMapaMesas.ParaDto(mesa, ocupacao);
    }

    public async Task RemoverAsync(Guid casamentoId, Guid mesaId, CancellationToken cancelamento)
    {
        var casamento = await ObterCasamentoEditavelAsync(casamentoId, cancelamento);
        var mesa = await ObterMesaAsync(casamento.Id, mesaId, cancelamento);

        _mesaRepository.Remover(mesa);
        await _unidadeTrabalho.SalvarAsync(cancelamento);
    }

    public async Task<MapaMesasDto> SentarAsync(Guid casamentoId, Guid mesaId, PessoasMesaRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var casamento = await ObterCasamentoEditavelAsync(casamentoId, cancelamento);
        var mesa = await ObterMesaAsync(casamento.Id, mesaId, cancelamento);
        var pessoas = await ObterPessoasAsync(casamento.Id, request, cancelamento);
        var ocupacao = await _mesaRepository.ContarOcupacaoAsync(casamento.Id, mesa.Id, cancelamento);

        mesa.Receber(pessoas, ocupacao, _relogio.GetUtcNow());
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return await MontarMapaAsync(casamento, cancelamento);
    }

    public async Task<MapaMesasDto> RetirarAsync(Guid casamentoId, PessoasMesaRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var casamento = await ObterCasamentoEditavelAsync(casamentoId, cancelamento);
        var pessoas = await ObterPessoasAsync(casamento.Id, request, cancelamento);
        var agora = _relogio.GetUtcNow();
        var alterou = false;

        foreach (var pessoa in pessoas)
        {
            alterou |= pessoa.Levantar(agora);
        }

        if (alterou)
        {
            await _unidadeTrabalho.SalvarAsync(cancelamento);
        }

        return await MontarMapaAsync(casamento, cancelamento);
    }

    public async Task<MapaMesasDto> DispensarAvisosAsync(Guid casamentoId, PessoasMesaRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var casamento = await ObterCasamentoEditavelAsync(casamentoId, cancelamento);
        var pessoas = await ObterPessoasAsync(casamento.Id, request, cancelamento);
        var agora = _relogio.GetUtcNow();
        var alterou = false;

        foreach (var pessoa in pessoas)
        {
            alterou |= pessoa.DispensarAvisoSaidaMesa(agora);
        }

        if (alterou)
        {
            await _unidadeTrabalho.SalvarAsync(cancelamento);
        }

        return await MontarMapaAsync(casamento, cancelamento);
    }

    private async Task<MapaMesasDto> MontarMapaAsync(CasamentoAssessorado casamento, CancellationToken cancelamento)
    {
        var mesas = await _mesaRepository.ListarAsync(casamento.Id, cancelamento);
        var convites = await _conviteRepository.ListarSemDadosSensiveisAsync(casamento.Id, cancelamento);
        return MontadorMapaMesas.Montar(mesas, convites, casamento.Arquivado);
    }

    private async Task<IReadOnlyList<Convidado>> ObterPessoasAsync(Guid casamentoId, PessoasMesaRequest request, CancellationToken cancelamento)
    {
        var identificadores = request.Identificadores();

        if (identificadores.Count == 0)
        {
            throw new RegraNegocioException(MensagensMesas.PessoasObrigatorias);
        }

        if (identificadores.Count > Mesa.PessoasMaximoPorOperacao)
        {
            throw new RegraNegocioException(MensagensMesas.PessoasDemais);
        }

        if (identificadores.Distinct().Count() != identificadores.Count)
        {
            throw new RegraNegocioException(MensagensMesas.PessoaRepetida);
        }

        var pessoas = await _mesaRepository.ObterConvidadosAsync(casamentoId, identificadores, cancelamento);

        if (pessoas.Count != identificadores.Count)
        {
            throw new RegraNegocioException(MensagensMesas.PessoaDeOutroCasamento);
        }

        return pessoas;
    }

    private async Task GarantirUnicidadeAsync(Guid casamentoId, Mesa mesa, Guid? excetoMesaId, CancellationToken cancelamento)
    {
        if (await _mesaRepository.ExisteNumeroAsync(casamentoId, mesa.Numero, excetoMesaId, cancelamento))
        {
            throw new RegraNegocioException(MensagensMesas.NumeroRepetido, Mesa.CampoNumero);
        }

        if (mesa.Especial && await _mesaRepository.ExisteEspecialAsync(casamentoId, excetoMesaId, cancelamento))
        {
            throw new RegraNegocioException(MensagensMesas.EspecialRepetida, Mesa.CampoEspecial);
        }
    }

    private async Task<Mesa> ObterMesaAsync(Guid casamentoId, Guid mesaId, CancellationToken cancelamento)
    {
        return await _mesaRepository.ObterAsync(casamentoId, mesaId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensMesas.MesaNaoEncontrada);
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
            throw new RegraNegocioException(MensagensMesas.CasamentoArquivado);
        }

        return casamento;
    }
}
