using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Mesas;
using Celebri.Aplicacao.Persistencia;
using Celebri.Aplicacao.UsuarioAtual;
using Celebri.Dominio.Convidados;

namespace Celebri.Aplicacao.Convidados;

public class ConviteService : IConviteService
{
    private readonly IConviteRepository _conviteRepository;
    private readonly VerificadorEventoConvidados _verificador;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly TimeProvider _relogio;
    private readonly IUsuarioAtual _usuarioAtual;
    private readonly IMesaRepository _mesaRepository;

    public ConviteService(
        IEventoRepository eventoRepository,
        IConviteRepository conviteRepository,
        IUnidadeTrabalho unidadeTrabalho,
        TimeProvider relogio,
        IUsuarioAtual usuarioAtual,
        IMesaRepository mesaRepository)
    {
        _mesaRepository = mesaRepository;
        _usuarioAtual = usuarioAtual;
        _conviteRepository = conviteRepository;
        _verificador = new VerificadorEventoConvidados(eventoRepository, conviteRepository);
        _unidadeTrabalho = unidadeTrabalho;
        _relogio = relogio;
    }

    public async Task<ListaConvitesDto> ListarAsync(Guid eventoId, CancellationToken cancelamento)
    {
        var evento = await _verificador.ObterAsync(eventoId, cancelamento);
        var convites = await _conviteRepository.ListarPorEventoAsync(evento.Id, cancelamento);
        var totais = CalculadoraTotaisConvidados.Calcular(CalculadoraTotaisConvidados.Resumir(convites));
        var mesas = await _mesaRepository.ListarAsync(evento.Id, cancelamento);

        return new ListaConvitesDto(
            OrdenacaoConvites.Ordenar(convites).Select(convite => ParaDto(convite, _usuarioAtual.EhAssessoria())).ToList(),
            totais,
            evento.ConvidadosEstimados,
            evento.Arquivado,
            MontadorMapaMesas.Ordenar(mesas).Select(MontadorMapaMesas.ParaResumo).ToList());
    }

    public async Task<TotaisConvidadosDto> ObterTotaisAsync(Guid eventoId, CancellationToken cancelamento)
    {
        var evento = await _verificador.ObterAsync(eventoId, cancelamento);
        var resumo = await _conviteRepository.ObterResumoAsync(evento.Id, cancelamento);
        return CalculadoraTotaisConvidados.Calcular(resumo);
    }

    public async Task<ConviteDto> ObterAsync(Guid eventoId, Guid conviteId, CancellationToken cancelamento)
    {
        var evento = await _verificador.ObterAsync(eventoId, cancelamento);
        var convite = await ObterConviteAsync(evento.Id, conviteId, cancelamento);
        return ParaDto(convite, _usuarioAtual.EhAssessoria());
    }

    public async Task<ConviteDto> CriarAsync(Guid eventoId, SalvarConviteRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var evento = await _verificador.ObterEditavelAsync(eventoId, cancelamento);
        var dados = request.ParaDados();
        await _verificador.GarantirLimiteAsync(evento.Id, dados.Convidados.Count, 0, cancelamento);

        var convite = Convite.Criar(evento.Id, dados, _relogio.GetUtcNow());
        _conviteRepository.Adicionar(convite);
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return ParaDto(convite, _usuarioAtual.EhAssessoria());
    }

    public async Task<ConviteDto> AtualizarAsync(Guid eventoId, Guid conviteId, SalvarConviteRequest request, CancellationToken cancelamento)
    {
        ArgumentNullException.ThrowIfNull(request);

        var evento = await _verificador.ObterEditavelAsync(eventoId, cancelamento);
        var convite = await ObterConviteAsync(evento.Id, conviteId, cancelamento);
        var dados = request.ParaDados();
        await _verificador.GarantirLimiteAsync(evento.Id, dados.Convidados.Count, convite.Convidados.Count, cancelamento);

        convite.Atualizar(dados, _relogio.GetUtcNow());
        await _unidadeTrabalho.SalvarAsync(cancelamento);

        return ParaDto(convite, _usuarioAtual.EhAssessoria());
    }

    public async Task RemoverAsync(Guid eventoId, Guid conviteId, CancellationToken cancelamento)
    {
        var evento = await _verificador.ObterEditavelAsync(eventoId, cancelamento);
        var convite = await ObterConviteAsync(evento.Id, conviteId, cancelamento);

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

    private async Task<Convite> ObterConviteAsync(Guid eventoId, Guid conviteId, CancellationToken cancelamento)
    {
        return await _conviteRepository.ObterPorIdAsync(eventoId, conviteId, cancelamento)
            ?? throw new RecursoNaoEncontradoException(MensagensConvidados.ConviteNaoEncontrado);
    }
}
