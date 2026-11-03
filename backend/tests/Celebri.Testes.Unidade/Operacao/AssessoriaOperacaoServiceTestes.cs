using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Operacao;
using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Organizacoes;
using Celebri.Testes.Unidade.Autenticacao.Fakes;
using Microsoft.Extensions.Logging.Abstractions;

namespace Celebri.Testes.Unidade.Operacao;

public class AssessoriaOperacaoServiceTestes
{
    private static readonly DateTimeOffset Agora = new(2026, 11, 3, 12, 0, 0, TimeSpan.Zero);

    private readonly BancoMemoria _banco = new();
    private readonly AssessoriaOperacaoService _service;

    public AssessoriaOperacaoServiceTestes()
    {
        _service = new AssessoriaOperacaoService(
            new ConsultaOperacaoFalsa(),
            _banco,
            _banco,
            new RelogioFixo(Agora),
            NullLogger<AssessoriaOperacaoService>.Instance);
    }

    [Fact]
    public async Task Suspender_DeveMarcarOrganizacaoESalvar()
    {
        var organizacao = Organizacao.Criar("Assessoria X", Agora);
        _banco.Adicionar(organizacao);

        await _service.SuspenderAsync(organizacao.Id, CancellationToken.None);

        Assert.True(organizacao.EstaSuspensa);
        Assert.Equal(1, _banco.Salvamentos);
    }

    [Fact]
    public async Task Reativar_DeveLimparSuspensaoESalvar()
    {
        var organizacao = Organizacao.Criar("Assessoria X", Agora);
        organizacao.Suspender(Agora);
        _banco.Adicionar(organizacao);

        await _service.ReativarAsync(organizacao.Id, CancellationToken.None);

        Assert.False(organizacao.EstaSuspensa);
    }

    [Fact]
    public async Task Suspender_Inexistente_DeveLancarNaoEncontrado()
    {
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(
            () => _service.SuspenderAsync(Guid.NewGuid(), CancellationToken.None));
    }

    private sealed class ConsultaOperacaoFalsa : IOperacaoConsultaRepository
    {
        public Task<IReadOnlyList<AssessoriaResumoDto>> ListarAssessoriasAsync(string? busca, SituacaoAssessoria? situacao, CancellationToken cancelamento)
        {
            return Task.FromResult<IReadOnlyList<AssessoriaResumoDto>>([]);
        }

        public Task<DashboardOperacaoDto> ObterDashboardAsync(DateTimeOffset agora, CancellationToken cancelamento)
        {
            return Task.FromResult(new DashboardOperacaoDto(0, 0, 0, 0));
        }
    }
}
