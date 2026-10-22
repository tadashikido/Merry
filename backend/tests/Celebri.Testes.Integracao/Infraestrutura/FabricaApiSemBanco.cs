namespace Celebri.Testes.Integracao.Infraestrutura;

public class FabricaApiSemBanco : FabricaApi
{
    public FabricaApiSemBanco()
        : base(StringConexaoInalcancavel)
    {
    }
}
