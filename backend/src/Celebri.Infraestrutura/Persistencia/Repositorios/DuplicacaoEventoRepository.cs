using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Cronogramas;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Fornecedores;
using Celebri.Dominio.Tarefas;
using Microsoft.EntityFrameworkCore;

namespace Celebri.Infraestrutura.Persistencia.Repositorios;

public class DuplicacaoEventoRepository : IDuplicacaoEventoRepository
{
    private readonly CelebriDbContext _contexto;

    public DuplicacaoEventoRepository(CelebriDbContext contexto)
    {
        _contexto = contexto;
    }

    public async Task<IReadOnlyList<TarefaParaDuplicar>> ListarTarefasAsync(Guid eventoOrigemId, CancellationToken cancelamento)
    {
        var consulta =
            from tarefa in _contexto.TarefasEvento.AsNoTracking()
            join item in _contexto.ItensModeloChecklist.AsNoTracking()
                on tarefa.OrigemModeloItemId equals (Guid?)item.Id into itens
            from item in itens.DefaultIfEmpty()
            where tarefa.EventoId == eventoOrigemId
            select new { Tarefa = tarefa, Dias = item == null ? (int?)null : item.DiasAntesDoEvento };

        var linhas = await consulta.ToListAsync(cancelamento);
        return linhas.Select(linha => new TarefaParaDuplicar(linha.Tarefa, linha.Dias)).ToList();
    }

    public async Task<IReadOnlyList<VinculoParaDuplicar>> ListarVinculosAsync(Guid eventoOrigemId, CancellationToken cancelamento)
    {
        var linhas = await _contexto.FornecedoresEvento
            .AsNoTracking()
            .Where(vinculo => vinculo.EventoId == eventoOrigemId)
            .Join(
                _contexto.Fornecedores.AsNoTracking(),
                vinculo => vinculo.FornecedorId,
                fornecedor => fornecedor.Id,
                (vinculo, fornecedor) => new { Vinculo = vinculo, fornecedor.ArquivadoEm })
            .ToListAsync(cancelamento);

        return linhas.Select(linha => new VinculoParaDuplicar(linha.Vinculo, linha.ArquivadoEm != null)).ToList();
    }

    public async Task<IReadOnlyList<ItemCronograma>> ListarItensCronogramaAsync(Guid eventoOrigemId, CancellationToken cancelamento)
    {
        return await _contexto.ItensCronograma
            .AsNoTracking()
            .Where(item => item.EventoId == eventoOrigemId)
            .ToListAsync(cancelamento);
    }

    public void AdicionarItensCronograma(IEnumerable<ItemCronograma> itens)
    {
        _contexto.ItensCronograma.AddRange(itens);
    }

    public void AdicionarTarefas(IEnumerable<TarefaEvento> tarefas)
    {
        _contexto.TarefasEvento.AddRange(tarefas);
    }

    public void AdicionarVinculos(IEnumerable<FornecedorEvento> vinculos)
    {
        _contexto.FornecedoresEvento.AddRange(vinculos);
    }
}
