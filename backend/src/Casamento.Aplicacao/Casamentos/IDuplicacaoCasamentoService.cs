namespace Casamento.Aplicacao.Casamentos;

public interface IDuplicacaoCasamentoService
{
    Task<PreviaDuplicacaoDto> PreverAsync(Guid casamentoOrigemId, DateOnly? novaData, CancellationToken cancelamento);

    Task<DuplicacaoCasamentoDto> DuplicarAsync(Guid casamentoOrigemId, DuplicarCasamentoRequest request, CancellationToken cancelamento);
}
