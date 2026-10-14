using Casamento.Dominio.Isolamento;

namespace Casamento.Testes.Integracao.Isolamento;

public class RegistroIsolado : IPertenceOrganizacao
{
    public const string Tabela = "registros_isolados";
    public const int TamanhoMaximoDescricao = 200;

    private RegistroIsolado()
    {
        Descricao = string.Empty;
    }

    public Guid Id { get; private set; }

    public Guid OrganizacaoId { get; private set; }

    public string Descricao { get; private set; }

    public static RegistroIsolado Criar(string descricao)
    {
        return new RegistroIsolado
        {
            Id = Guid.NewGuid(),
            Descricao = descricao,
        };
    }

    public static RegistroIsolado CriarComOrganizacao(Guid organizacaoId, string descricao)
    {
        var registro = Criar(descricao);
        registro.OrganizacaoId = organizacaoId;
        return registro;
    }

    public static RegistroIsolado Reconstituir(Guid id, Guid organizacaoId, string descricao)
    {
        return new RegistroIsolado
        {
            Id = id,
            OrganizacaoId = organizacaoId,
            Descricao = descricao,
        };
    }

    public void AlterarDescricao(string descricao)
    {
        Descricao = descricao;
    }

    public void AlterarOrganizacao(Guid organizacaoId)
    {
        OrganizacaoId = organizacaoId;
    }
}
