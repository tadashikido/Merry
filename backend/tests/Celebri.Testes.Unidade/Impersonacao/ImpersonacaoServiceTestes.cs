using Celebri.Aplicacao.Autenticacao;
using Celebri.Aplicacao.Autenticacao.Portas;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Impersonacao;
using Celebri.Aplicacao.Impersonacao.Portas;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Impersonacao;
using Celebri.Dominio.Organizacoes;
using Celebri.Dominio.Usuarios;
using Celebri.Testes.Unidade.Autenticacao.Fakes;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Celebri.Testes.Unidade.Impersonacao;

public class ImpersonacaoServiceTestes
{
    private static readonly DateTimeOffset Agora = new(2026, 11, 3, 12, 0, 0, TimeSpan.Zero);

    private readonly BancoMemoria _banco = new();
    private readonly SessoesEmMemoria _sessoes = new();
    private readonly ImpersonacaoService _service;

    public ImpersonacaoServiceTestes()
    {
        _service = new ImpersonacaoService(
            _banco,
            _banco,
            _sessoes,
            new GeradorTokenImpersonacaoFalso(),
            _banco,
            Options.Create(new OpcoesAutenticacao()),
            new RelogioFixo(Agora),
            NullLogger<ImpersonacaoService>.Instance);
    }

    private Organizacao PrepararAssessoriaComDono()
    {
        var organizacao = Organizacao.Criar("Assessoria X", Agora);
        _banco.Adicionar(organizacao);
        _banco.Adicionar(Usuario.CriarDono(organizacao.Id, "Ana", "ana@exemplo.com", "hash", Agora));
        return organizacao;
    }

    [Fact]
    public async Task Iniciar_DeveCriarSessaoEEmitirToken()
    {
        var organizacao = PrepararAssessoriaComDono();

        var resultado = await _service.IniciarAsync(Guid.NewGuid(), new IniciarImpersonacaoRequest(organizacao.Id, "investigar"), CancellationToken.None);

        Assert.False(string.IsNullOrWhiteSpace(resultado.TokenAcesso));
        Assert.Equal(organizacao.Id, resultado.Assessoria.Id);
        Assert.Single(_sessoes.Itens);
    }

    [Fact]
    public async Task Iniciar_OrganizacaoInexistente_DeveLancarNaoEncontrado()
    {
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(
            () => _service.IniciarAsync(Guid.NewGuid(), new IniciarImpersonacaoRequest(Guid.NewGuid(), "motivo"), CancellationToken.None));
    }

    [Fact]
    public async Task Iniciar_SemDono_DeveLancarRegraNegocio()
    {
        var organizacao = Organizacao.Criar("Sem dono", Agora);
        _banco.Adicionar(organizacao);

        await Assert.ThrowsAsync<RegraNegocioException>(
            () => _service.IniciarAsync(Guid.NewGuid(), new IniciarImpersonacaoRequest(organizacao.Id, "motivo"), CancellationToken.None));
    }

    [Fact]
    public async Task Iniciar_MotivoVazio_DeveLancarRegraNegocio()
    {
        var organizacao = PrepararAssessoriaComDono();

        await Assert.ThrowsAsync<RegraNegocioException>(
            () => _service.IniciarAsync(Guid.NewGuid(), new IniciarImpersonacaoRequest(organizacao.Id, "  "), CancellationToken.None));
    }

    [Fact]
    public async Task Encerrar_DeveMarcarFim()
    {
        var organizacao = PrepararAssessoriaComDono();
        var resultado = await _service.IniciarAsync(Guid.NewGuid(), new IniciarImpersonacaoRequest(organizacao.Id, "motivo"), CancellationToken.None);

        await _service.EncerrarAsync(resultado.SessaoId, CancellationToken.None);

        Assert.NotNull(_sessoes.Itens[0].EncerradaEm);
    }

    private sealed class SessoesEmMemoria : Celebri.Aplicacao.Persistencia.ISessaoImpersonacaoRepository
    {
        public List<SessaoImpersonacao> Itens { get; } = [];

        public void Adicionar(SessaoImpersonacao sessao) => Itens.Add(sessao);

        public Task<SessaoImpersonacao?> ObterPorIdAsync(Guid id, CancellationToken cancelamento)
            => Task.FromResult(Itens.FirstOrDefault(sessao => sessao.Id == id));

        public Task<IReadOnlyList<SessaoImpersonacaoResumoDto>> ListarRecentesAsync(int limite, DateTimeOffset agora, CancellationToken cancelamento)
            => Task.FromResult<IReadOnlyList<SessaoImpersonacaoResumoDto>>([]);
    }

    private sealed class GeradorTokenImpersonacaoFalso : IGeradorTokenImpersonacao
    {
        public TokenAcessoGerado Gerar(Usuario dono, Organizacao organizacao, Guid sessaoId)
            => new($"token-{sessaoId}", Agora.AddMinutes(15));
    }
}
