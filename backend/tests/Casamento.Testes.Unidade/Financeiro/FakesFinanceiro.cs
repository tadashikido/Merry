using Casamento.Aplicacao.Arquivos;
using Casamento.Aplicacao.Persistencia;
using Casamento.Dominio.Casamentos;
using Casamento.Dominio.Excecoes;

namespace Casamento.Testes.Unidade.Financeiro;

public sealed class RepositorioCasamentosFinanceiro : ICasamentoRepository
{
    public List<CasamentoAssessorado> Itens { get; } = [];

    public Task<IReadOnlyList<CasamentoAssessorado>> ListarAsync(bool arquivados, CancellationToken cancelamento)
    {
        IReadOnlyList<CasamentoAssessorado> resultado = Itens.Where(casamento => casamento.Arquivado == arquivados).ToList();
        return Task.FromResult(resultado);
    }

    public Task<CasamentoAssessorado?> ObterPorIdAsync(Guid id, CancellationToken cancelamento)
    {
        return Task.FromResult(Itens.FirstOrDefault(casamento => casamento.Id == id));
    }

    public void Adicionar(CasamentoAssessorado casamento)
    {
        Itens.Add(casamento);
    }
}

public sealed class ArmazenamentoFinanceiroMemoria : IArmazenamentoArquivos
{
    public Dictionary<ChaveArquivo, byte[]> Arquivos { get; } = [];

    public List<ChaveArquivo> Removidos { get; } = [];

    public Task SalvarAsync(ChaveArquivo chave, ReadOnlyMemory<byte> conteudo, CancellationToken cancelamento)
    {
        Arquivos.Add(chave, conteudo.ToArray());
        return Task.CompletedTask;
    }

    public Task<Stream?> AbrirLeituraAsync(ChaveArquivo chave, CancellationToken cancelamento)
    {
        return Task.FromResult<Stream?>(Arquivos.TryGetValue(chave, out var conteudo) ? new MemoryStream(conteudo) : null);
    }

    public Task RemoverAsync(ChaveArquivo chave, CancellationToken cancelamento)
    {
        Arquivos.Remove(chave);
        Removidos.Add(chave);
        return Task.CompletedTask;
    }
}

public sealed class UnidadeTrabalhoFinanceiro : IUnidadeTrabalho
{
    public int Salvamentos { get; private set; }

    public bool FalharProxima { get; set; }

    public Task SalvarAsync(CancellationToken cancelamento)
    {
        if (FalharProxima)
        {
            FalharProxima = false;
            throw new ConcorrenciaException("O registro foi alterado por outra operação.", new InvalidOperationException());
        }

        Salvamentos++;
        return Task.CompletedTask;
    }

    public void DescartarAlteracoes()
    {
    }
}
