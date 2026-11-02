using Celebri.Aplicacao.Operadores;
using Celebri.Dominio.Operadores;
using Celebri.Testes.Unidade.Autenticacao.Fakes;
using Microsoft.Extensions.Options;

namespace Celebri.Testes.Unidade.Operadores;

public class ProvisionamentoOperadorServiceTestes
{
    private readonly BancoMemoriaOperador _banco = new();
    private readonly HashSenhaServiceEspiao _hash = new();
    private readonly RelogioFixo _relogio = new(new DateTimeOffset(2026, 9, 28, 12, 0, 0, TimeSpan.Zero));

    private ProvisionamentoOperadorService CriarServico(OpcoesOperadorInicial opcoes)
    {
        return new ProvisionamentoOperadorService(_banco, _banco, _hash, Options.Create(opcoes), _relogio);
    }

    [Fact]
    public async Task Provisionar_Configurado_EAusente_DeveCriarOperador()
    {
        var servico = CriarServico(new OpcoesOperadorInicial { Nome = "Equipe", Email = "op@exemplo.com", Senha = "senhaForte123" });

        var criou = await servico.ProvisionarInicialAsync(CancellationToken.None);

        Assert.True(criou);
        var operador = Assert.Single(_banco.Operadores);
        Assert.Equal("op@exemplo.com", operador.Email);
        Assert.Equal(1, _banco.Salvamentos);
    }

    [Fact]
    public async Task Provisionar_NaoConfigurado_DeveSerNoOp()
    {
        var servico = CriarServico(new OpcoesOperadorInicial());

        var criou = await servico.ProvisionarInicialAsync(CancellationToken.None);

        Assert.False(criou);
        Assert.Empty(_banco.Operadores);
        Assert.Equal(0, _banco.Salvamentos);
    }

    [Fact]
    public async Task Provisionar_Idempotente_NaoDuplicaNemSobrescreveSenha()
    {
        var existente = OperadorPlataforma.Criar("Existente", "op@exemplo.com", "hash-original", _relogio.GetUtcNow());
        _banco.Adicionar(existente);
        var servico = CriarServico(new OpcoesOperadorInicial { Nome = "Equipe", Email = "OP@exemplo.com", Senha = "senhaForte123" });

        var criou = await servico.ProvisionarInicialAsync(CancellationToken.None);

        Assert.False(criou);
        Assert.Single(_banco.Operadores);
        Assert.Equal("hash-original", _banco.Operadores[0].SenhaHash);
        Assert.Equal(0, _banco.Salvamentos);
    }

    private sealed class HashSenhaServiceEspiao : Celebri.Aplicacao.Autenticacao.Portas.IHashSenhaService
    {
        public string GerarHash(string senha) => $"hash:{senha}";

        public Celebri.Aplicacao.Autenticacao.Portas.ResultadoVerificacaoSenha Verificar(string senhaHash, string senha)
            => Celebri.Aplicacao.Autenticacao.Portas.ResultadoVerificacaoSenha.Valida;

        public void VerificarFicticio(string senha)
        {
        }
    }
}
