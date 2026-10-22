namespace Celebri.Aplicacao.Persistencia;

public interface IUnidadeTrabalho
{
    Task SalvarAsync(CancellationToken cancelamento);

    void DescartarAlteracoes()
    {
    }
}
