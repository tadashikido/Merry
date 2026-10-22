using Celebri.Dominio.Eventos;

namespace Celebri.Aplicacao.Eventos;

public static class OrdenacaoEventos
{
    public static IReadOnlyList<Evento> OrdenarAtivos(IEnumerable<Evento> eventos, DateOnly hoje)
    {
        var lista = eventos.ToList();

        var proximos = lista
            .Where(evento => evento.Data >= hoje)
            .OrderBy(evento => evento.Data)
            .ThenBy(evento => evento.Horario is null)
            .ThenBy(evento => evento.Horario)
            .ThenBy(evento => evento.NomePrimeiraPessoa, StringComparer.OrdinalIgnoreCase)
            .ThenBy(evento => evento.NomeSegundaPessoa, StringComparer.OrdinalIgnoreCase);

        var realizados = lista
            .Where(evento => evento.Data < hoje)
            .OrderByDescending(evento => evento.Data)
            .ThenBy(evento => evento.Horario is null)
            .ThenByDescending(evento => evento.Horario)
            .ThenBy(evento => evento.NomePrimeiraPessoa, StringComparer.OrdinalIgnoreCase)
            .ThenBy(evento => evento.NomeSegundaPessoa, StringComparer.OrdinalIgnoreCase);

        return [.. proximos, .. realizados];
    }

    public static IReadOnlyList<Evento> OrdenarArquivados(IEnumerable<Evento> eventos)
    {
        return eventos
            .OrderByDescending(evento => evento.ArquivadoEm)
            .ThenBy(evento => evento.NomePrimeiraPessoa, StringComparer.OrdinalIgnoreCase)
            .ThenBy(evento => evento.NomeSegundaPessoa, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }
}
