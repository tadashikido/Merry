using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Mesas;
using Celebri.Aplicacao.Persistencia;
using Celebri.Aplicacao.UsuarioAtual;
using Celebri.Dominio.Convidados;

namespace Celebri.Aplicacao.Convidados;

public class ConviteService : IConviteService
{
    private readonly IConviteRepository _conviteRepository;
    private readonly VerificadorCasamentoConvidados _verificador;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly TimeProvider _relogio;
    private readonly IUsuarioAtual _usuarioAtual;
    private readonly IMesaRepository _mesaRepository;

    public ConviteService(
        ICasamentoRepository casamentoRepository,
        IConviteRepository conviteRepository,
        IUnidadeTrabalho unidadeTrabalho,
        TimeProvider relogio,
        IUsuarioAtual usuarioAtual,
        IMesaRepository mesaRepository)
    {
        _mesaRepository = mesaRepository;
        _usuarioAtual = usuarioAtual;
        _conviteRepository = conviteRepository;
        _verificador = new VerificadorCasamentoConvidados(casamentoRepository, conviteRepository);
        _unidadeTrabalho = unidadeTrabalho;
        _relogio = relogio;
    }

    public async Task<ListaConvitesDto> ListarAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        var casamento = await _verificador.ObterAsync(casamentoId, cancelamento);
        var convites = await _conviteRepository.ListarPorCasamentoAsync(casamento.Id, cancelamento);
        var totais = CalculadoraTotaisConvidados.Calcular(CalculadoraTotaisConvidados.Resumir(convites));
        var mesas = await _mesaRepository.ListarAsync(casamento.Id, cancelamento);

        return new ListaConvitesDto(
            OrdenacaoConvites.Ordenar(convites).Select(convite => ParaDto(convite, _usuarioAtual.EhAssessoria())).ToList(),
            totais,
            casamento.ConvidadosEstimados,
            casamento.Arquivado,
            MontadorMapaMesas.Ordenar(mesas).Select(MontadorMapaMesas.ParaResumo).ToList());
    }

    public async Task<TotaisConvidadosDto> ObterTotaisAsync(Guid casamentoId, CancellationToken cancelamento)
    {
        var casamento = await _verificador.ObterAsync(casamentoId, cancelamento);
        var resumo = await _conviteRepository.ObterResumoAsync(casamento.Id, cancelamento);
        return CalculadoraTotaisConvidados.Calcular(resumo);
    }

    public async Task<ConviteDto> ObterAsync(Guid casamentoId, Guid conviteId, CancellationToken cancelamento)
    {
        var casamento = await _verificador.ObterAsync(casamentoId, cancelamento);
        var convite = await ObterConviteAsync(casamento.Id, conviteId, cancelamento);
        return ParaDto(convite, _usuarioAtual.EhAssessoria());
    }

    public async Task<ConviteDto> CriarAsync(Guid casamentoId, SalvarConviteRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var casamento = await _verificador.ObterEditavelAsync(casamentoId, cancelamento);
        var dados = request.ParaDados();
        await _verificador.GarantirLimiteAsync(casamento.Id, dados.Convidados.Count, 0, cancelamento);

        var convite = Convite.Criar(casamento.Id, dados, _relogio.GetUtcNow());
        _conviteRepository.Adicionar(convite);
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return ParaDto(convite, _usuarioAtual.EhAssessoria());
    }

    public async Task<ConviteDto> AtualizarAsync(Guid casamentoId, Guid conviteId, SalvarConviteRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var casamento = await _verificador.ObterEditavelAsync(casamentoId, cancelamento);
        var convite = await ObterConviteAsync(casamento.Id, conviteId, cancelamento);
        var dados = request.ParaDados();
        await _verificador.GarantirLimiteAsync(casamento.Id, dados.Convidados.Count, convite.Convidados.Count, cancelamento);

        convite.Atualizar(dados, _relogio.GetUtcNow());
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return ParaDto(convite, _usuarioAtual.EhAssessoria());
    }

    public async Task RemoverAsync(Guid casamentoId, Guid conviteId, CancellationToken cancelamento)
    {
        var casamento = await _verificador.ObterEditavelAsync(casamentoId, cancelamento);
        var convite = await ObterConviteAsync(casamento.Id, conviteId, cancelamento);

        _conviteRepository.Remover(convite);
        await _unidadeTrabalho.SalvarAsync(cancelamento);
    }

    public static ConviteDto ParaDto(Convite convite)
    {
        return ParaDto(convite, exibirRestricoes: true);
    }

    public static ConviteDto ParaDto(Convite convite, bool exibirRestricoes)
    {
        ArgumentNullException.ThrowIfNull(convite);

        return new ConviteDto(
            convite.Id,
            convite.Nome,
            convite.Grupo,
            convite.LimiteAcompanhantes,
            convite.StatusEnvio.ToString(),
            convite.ConvidadosOrdenados().Select(convidado => ParaDto(convidado, exibirRestricoes)).ToList(),
            convite.CriadoEm,
            convite.AtualizadoEm,
            convite.RespondidoEm);
    }

    public static ConvidadoDto ParaDto(Convidado convidado)
    {
        return ParaDto(convidado, exibirRestricao: true);
    }

    public static ConvidadoDto ParaDto(Convidado convidado, bool exibirRestricao)
    {
        ArgumentNullException.ThrowIfNull(convidado);

        return new ConvidadoDto(
            convidado.Id,
            convidado.Nome,
            convidado.Telefone,
            convidado.Email,
            convidado.FaixaEtaria.ToString(),
            convidado.Resposta.ToString(),
            convidado.Acompanhante,
            exibirRestricao ? convidado.PossuiRestricaoAlimentar : null,
            convidado.MesaId);
    }

    private async Task<Convite> ObterConviteAsync(Guid casamentoId, Guid conviteId, CancellationToken cancelamento)
    {
        return await _conviteRepository.ObterPorIdAsync(casamentoId, conviteId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensConvidados.ConviteNaoEncontrado);
    }
}
