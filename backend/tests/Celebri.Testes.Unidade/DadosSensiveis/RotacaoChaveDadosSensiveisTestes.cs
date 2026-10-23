using System.Security.Cryptography;
using Celebri.Api;
using Celebri.Aplicacao.CronogramaPublico.Portas;
using Celebri.Aplicacao.DadosSensiveis.Portas;
using Celebri.Aplicacao.Recifragem;
using Celebri.Infraestrutura.Seguranca;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Celebri.Testes.Unidade.DadosSensiveis;

public class RotacaoChaveDadosSensiveisTestes
{
    private static readonly string ChaveAntiga = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
    private static readonly string ChaveNova = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));

    private static IOptions<OpcoesDadosSensiveis> Opcoes(string atual, string? anterior = null)
    {
        return Options.Create(new OpcoesDadosSensiveis { ChaveCifragem = atual, ChaveCifragemAnterior = anterior });
    }

    [Fact]
    public void DadosSensiveis_ComChaveAnterior_DeveLerOQueFoiCifradoComEla_ECifrarSoComAAtual()
    {
        var convidado = Guid.NewGuid();
        var cifraAntiga = new CifradorDadosSensiveis(Opcoes(ChaveAntiga)).Cifrar("vegana", convidado);
        var rotacionado = new CifradorDadosSensiveis(Opcoes(ChaveNova, ChaveAntiga));

        Assert.Equal("vegana", rotacionado.Decifrar(cifraAntiga, convidado));

        var cifraNova = rotacionado.Cifrar("vegana", convidado);
        Assert.Equal("vegana", new CifradorDadosSensiveis(Opcoes(ChaveNova)).Decifrar(cifraNova, convidado));
        Assert.Null(new CifradorDadosSensiveis(Opcoes(ChaveAntiga)).Decifrar(cifraNova, convidado));
    }

    [Fact]
    public void DadosSensiveis_SemChaveAnterior_ComportamentoAtual()
    {
        var convidado = Guid.NewGuid();
        var cifraAntiga = new CifradorDadosSensiveis(Opcoes(ChaveAntiga)).Cifrar("vegana", convidado);

        Assert.Null(new CifradorDadosSensiveis(Opcoes(ChaveNova)).Decifrar(cifraAntiga, convidado));
        Assert.Null(new CifradorDadosSensiveis(Opcoes(ChaveNova, "  ")).Decifrar(cifraAntiga, convidado));
    }

    [Theory]
    [InlineData("")]
    [InlineData("sem-prefixo")]
    [InlineData("v1.nao-e-base64!!")]
    [InlineData("v1.AAAA")]
    public void DadosSensiveis_ConteudoCorrompidoComAsDuasChaves_DeveSerNuloEIlegivel(string conteudo)
    {
        var cifrador = new CifradorDadosSensiveis(Opcoes(ChaveNova, ChaveAntiga));

        Assert.Null(cifrador.Decifrar(conteudo, Guid.NewGuid()));
        Assert.Equal(RecifragemCifra.Ilegivel, cifrador.Recifrar(conteudo, Guid.NewGuid()));
    }

    [Fact]
    public void DadosSensiveis_ChaveAnteriorNaoAbreConvidadoDiferente()
    {
        var cifraAntiga = new CifradorDadosSensiveis(Opcoes(ChaveAntiga)).Cifrar("vegana", Guid.NewGuid());

        Assert.Null(new CifradorDadosSensiveis(Opcoes(ChaveNova, ChaveAntiga)).Decifrar(cifraAntiga, Guid.NewGuid()));
    }

    [Fact]
    public void DadosSensiveis_Recifrar_DeveClassificarERegravarSoOQueEstaNaAnterior()
    {
        var convidado = Guid.NewGuid();
        var rotacionado = new CifradorDadosSensiveis(Opcoes(ChaveNova, ChaveAntiga));
        var cifraAntiga = new CifradorDadosSensiveis(Opcoes(ChaveAntiga)).Cifrar("sem lactose", convidado);
        var cifraAtual = rotacionado.Cifrar("sem lactose", convidado);
        var cifraDeTerceira = new CifradorDadosSensiveis(Opcoes(Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)))).Cifrar("sem lactose", convidado);

        var recifrada = rotacionado.Recifrar(cifraAntiga, convidado);

        Assert.Equal(SituacaoCifra.ChaveAnterior, recifrada.Situacao);
        Assert.StartsWith(CifradorDadosSensiveis.PrefixoVersao, recifrada.NovoConteudo, StringComparison.Ordinal);
        Assert.Equal(cifraAntiga.Length, recifrada.NovoConteudo!.Length);
        Assert.Equal("sem lactose", new CifradorDadosSensiveis(Opcoes(ChaveNova)).Decifrar(recifrada.NovoConteudo, convidado));
        Assert.Equal(RecifragemCifra.JaNaChaveAtual, rotacionado.Recifrar(cifraAtual, convidado));
        Assert.Equal(RecifragemCifra.Ilegivel, rotacionado.Recifrar(cifraDeTerceira, convidado));
        Assert.Equal(RecifragemCifra.Ilegivel, new CifradorDadosSensiveis(Opcoes(ChaveNova)).Recifrar(cifraAntiga, convidado));
    }

    [Fact]
    public void TokenCronograma_ComChaveAnterior_DeveLerERecifrarComAMesmaDerivacao()
    {
        var evento = Guid.NewGuid();
        var cifraAntiga = new CifradorTokenCronograma(Opcoes(ChaveAntiga)).Cifrar("token-do-link", evento);
        var rotacionado = new CifradorTokenCronograma(Opcoes(ChaveNova, ChaveAntiga));

        Assert.Equal("token-do-link", rotacionado.Decifrar(cifraAntiga, evento));
        Assert.Null(new CifradorTokenCronograma(Opcoes(ChaveNova)).Decifrar(cifraAntiga, evento));

        var recifrada = rotacionado.Recifrar(cifraAntiga, evento);
        Assert.Equal(SituacaoCifra.ChaveAnterior, recifrada.Situacao);
        Assert.Equal("token-do-link", new CifradorTokenCronograma(Opcoes(ChaveNova)).Decifrar(recifrada.NovoConteudo!, evento));
        Assert.Equal(RecifragemCifra.JaNaChaveAtual, rotacionado.Recifrar(recifrada.NovoConteudo!, evento));
        Assert.Equal(RecifragemCifra.Ilegivel, rotacionado.Recifrar(cifraAntiga, Guid.NewGuid()));
    }

    [Fact]
    public void TokenCronograma_ChaveDerivadaNaoAbreDadoSensivelNemOContrario()
    {
        var id = Guid.NewGuid();
        var token = new CifradorTokenCronograma(Opcoes(ChaveAntiga)).Cifrar("abc", id);

        Assert.Null(new CifradorDadosSensiveis(Opcoes(ChaveNova, ChaveAntiga)).Decifrar(CifradorDadosSensiveis.PrefixoVersao + token, id));
    }

    [Theory]
    [InlineData(null, true)]
    [InlineData("", true)]
    [InlineData("   ", true)]
    [InlineData("curta", false)]
    [InlineData("YWJj", false)]
    public void ChaveAnteriorValida_DeveAceitarVaziaERejeitarFormatoInvalido(string? anterior, bool esperado)
    {
        Assert.Equal(esperado, OpcoesDadosSensiveis.ChaveAnteriorValida(ChaveNova, anterior));
    }

    [Fact]
    public void ChaveAnteriorValida_DeveRejeitarIgualAAtualMesmoComEspacos()
    {
        Assert.False(OpcoesDadosSensiveis.ChaveAnteriorValida(ChaveNova, $"  {ChaveNova} "));
        Assert.True(OpcoesDadosSensiveis.ChaveAnteriorValida(ChaveNova, ChaveAntiga));
    }

    [Fact]
    public void ObterBytesChaveAnterior_Invalida_DeveFalharSemEcoarValor()
    {
        var opcoes = new OpcoesDadosSensiveis { ChaveCifragem = ChaveNova, ChaveCifragemAnterior = ChaveNova };

        var excecao = Assert.Throws<InvalidOperationException>(opcoes.ObterBytesChaveAnterior);

        Assert.Equal(OpcoesDadosSensiveis.MensagemChaveAnteriorInvalida, excecao.Message);
        Assert.DoesNotContain(ChaveNova, excecao.Message, StringComparison.Ordinal);
        Assert.Null(new OpcoesDadosSensiveis { ChaveCifragem = ChaveNova }.ObterBytesChaveAnterior());
    }

    [Theory]
    [InlineData(new[] { "recifrar-dados-sensiveis" }, true)]
    [InlineData(new[] { "recifrar-dados-sensiveis", "--urls=http://+:9" }, true)]
    [InlineData(new string[0], false)]
    [InlineData(new[] { "--recifrar-dados-sensiveis" }, false)]
    [InlineData(new[] { "RECIFRAR-DADOS-SENSIVEIS" }, false)]
    [InlineData(new[] { "--urls=http://+:9", "recifrar-dados-sensiveis" }, false)]
    public void EhComandoAdministrativo_SoReconheceOComandoExatoNaPrimeiraPosicao(string[] argumentos, bool esperado)
    {
        Assert.Equal(esperado, ComandosAdministrativos.EhComandoAdministrativo(argumentos));
    }

    [Fact]
    public async Task Executor_DevePaginarEmLotes_ContarSituacoes_EConcorrentesSemRegravar()
    {
        var cifras = Enumerable.Range(1, 5)
            .Select(indice => new CifraArmazenada(new Guid(indice, 0, 0, new byte[8]), Guid.NewGuid(), $"c{indice}"))
            .ToList();
        var situacoes = new Dictionary<string, RecifragemCifra>
        {
            ["c1"] = RecifragemCifra.Recifrada("n1"),
            ["c2"] = RecifragemCifra.JaNaChaveAtual,
            ["c3"] = RecifragemCifra.Ilegivel,
            ["c4"] = RecifragemCifra.Recifrada("n4"),
            ["c5"] = RecifragemCifra.Recifrada("n5"),
        };
        var repositorio = new RepositorioCifrasMemoria(cifras, concorrentes: ["c5"]);

        var resultado = await ExecutarAsync(repositorio, situacoes, tamanhoLote: 2);

        Assert.Equal(new ContagemRecifragem(2, 1, 1, 1), resultado.DadosSensiveis);
        Assert.Equal(ContagemRecifragem.Vazia, resultado.LinksCronograma);
        Assert.True(resultado.PossuiIlegiveis);
        Assert.Equal([null, cifras[1].Id, cifras[3].Id], repositorio.Cursores);
        Assert.Equal(["n1", "n4"], repositorio.Gravadas);
        Assert.Equal(3, repositorio.Transacoes);
    }

    [Fact]
    public async Task Executor_TudoNaChaveAtual_NaoGravaNada()
    {
        var cifras = new[] { new CifraArmazenada(Guid.NewGuid(), Guid.NewGuid(), "c1") };
        var repositorio = new RepositorioCifrasMemoria(cifras, concorrentes: []);

        var resultado = await ExecutarAsync(repositorio, new Dictionary<string, RecifragemCifra> { ["c1"] = RecifragemCifra.JaNaChaveAtual }, tamanhoLote: 10);

        Assert.Equal(new ContagemRecifragem(0, 1, 0, 0), resultado.DadosSensiveis);
        Assert.False(resultado.PossuiIlegiveis);
        Assert.Equal(0, repositorio.Transacoes);
    }

    [Fact]
    public void Executor_TamanhoDeLoteInvalido_DeveFalhar()
    {
        var servicos = new ServiceCollection().BuildServiceProvider();

        Assert.Throws<ArgumentOutOfRangeException>(() => new ExecutorRecifragemDadosSensiveis(
            servicos.GetRequiredService<IServiceScopeFactory>(),
            new CifradorDadosSensiveis(Opcoes(ChaveNova)),
            new CifradorTokenCronograma(Opcoes(ChaveNova)),
            NullLogger<ExecutorRecifragemDadosSensiveis>.Instance,
            0));
    }

    private static async Task<ResultadoRecifragem> ExecutarAsync(RepositorioCifrasMemoria repositorio, IReadOnlyDictionary<string, RecifragemCifra> situacoes, int tamanhoLote)
    {
        var organizacao = Guid.NewGuid();
        var servicos = new ServiceCollection()
            .AddScoped<Celebri.Aplicacao.Isolamento.EscopoIsolamentoSistema>()
            .AddSingleton<Celebri.Aplicacao.Persistencia.IOrganizacaoRepository>(new OrganizacoesFixas(organizacao))
            .AddSingleton<Celebri.Aplicacao.Persistencia.IDadosSensiveisRepository>(repositorio)
            .AddSingleton<Celebri.Aplicacao.Persistencia.IAcessoCronogramaRepository>(new RepositorioAcessosVazio())
            .BuildServiceProvider();

        var executor = new ExecutorRecifragemDadosSensiveis(
            servicos.GetRequiredService<IServiceScopeFactory>(),
            new CifradorFixo(situacoes),
            new CifradorTokenFixo(),
            NullLogger<ExecutorRecifragemDadosSensiveis>.Instance,
            tamanhoLote);

        return await executor.ExecutarAsync(CancellationToken.None);
    }

    private sealed class CifradorFixo : ICifradorDadosSensiveis
    {
        private readonly IReadOnlyDictionary<string, RecifragemCifra> _situacoes;

        public CifradorFixo(IReadOnlyDictionary<string, RecifragemCifra> situacoes)
        {
            _situacoes = situacoes;
        }

        public string Cifrar(string texto, Guid convidadoId)
        {
            throw new NotSupportedException();
        }

        public string? Decifrar(string conteudoCifrado, Guid convidadoId)
        {
            throw new NotSupportedException();
        }

        public RecifragemCifra Recifrar(string conteudoCifrado, Guid convidadoId)
        {
            return _situacoes[conteudoCifrado];
        }
    }

    private sealed class CifradorTokenFixo : ICifradorTokenCronograma
    {
        public string Cifrar(string token, Guid eventoId)
        {
            throw new NotSupportedException();
        }

        public string? Decifrar(string tokenCifrado, Guid eventoId)
        {
            throw new NotSupportedException();
        }

        public RecifragemCifra Recifrar(string tokenCifrado, Guid eventoId)
        {
            throw new NotSupportedException();
        }
    }

    private sealed class OrganizacoesFixas : Celebri.Aplicacao.Persistencia.IOrganizacaoRepository
    {
        private readonly Guid _organizacao;

        public OrganizacoesFixas(Guid organizacao)
        {
            _organizacao = organizacao;
        }

        public Task<IReadOnlyList<Guid>> ListarIdsAsync(CancellationToken cancelamento)
        {
            IReadOnlyList<Guid> ids = [_organizacao];
            return Task.FromResult(ids);
        }

        public Task<Celebri.Dominio.Organizacoes.Organizacao?> ObterPorIdAsync(Guid id, CancellationToken cancelamento)
        {
            throw new NotSupportedException();
        }

        public void Adicionar(Celebri.Dominio.Organizacoes.Organizacao organizacao)
        {
            throw new NotSupportedException();
        }
    }

    private sealed class RepositorioCifrasMemoria : Celebri.Aplicacao.Persistencia.IDadosSensiveisRepository
    {
        private readonly IReadOnlyList<CifraArmazenada> _cifras;
        private readonly HashSet<string> _concorrentes;

        public RepositorioCifrasMemoria(IReadOnlyList<CifraArmazenada> cifras, IEnumerable<string> concorrentes)
        {
            _cifras = cifras;
            _concorrentes = [.. concorrentes];
        }

        public List<Guid?> Cursores { get; } = [];

        public List<string> Gravadas { get; } = [];

        public int Transacoes { get; private set; }

        public Task<IReadOnlyList<CifraArmazenada>> ListarCifrasAsync(Guid? aposConvidadoId, int quantidade, CancellationToken cancelamento)
        {
            Cursores.Add(aposConvidadoId);
            var inicio = aposConvidadoId is null ? 0 : _cifras.ToList().FindIndex(cifra => cifra.Id == aposConvidadoId) + 1;
            IReadOnlyList<CifraArmazenada> lote = _cifras.Skip(inicio).Take(quantidade).ToList();
            return Task.FromResult(lote);
        }

        public Task<int> SubstituirCifrasAsync(IReadOnlyList<SubstituicaoCifra> substituicoes, CancellationToken cancelamento)
        {
            Transacoes++;
            var gravadas = substituicoes.Where(substituicao => !_concorrentes.Contains(substituicao.Anterior)).ToList();
            Gravadas.AddRange(gravadas.Select(substituicao => substituicao.Nova));
            return Task.FromResult(gravadas.Count);
        }

        public Task<IReadOnlyList<Celebri.Aplicacao.DadosSensiveis.RegistroDadosSensiveis>> ListarPorEventoAsync(Guid eventoId, CancellationToken cancelamento)
        {
            throw new NotSupportedException();
        }

        public Task<int> ContarPessoasComRestricaoAsync(Guid eventoId, CancellationToken cancelamento)
        {
            throw new NotSupportedException();
        }

        public Task<int> AnonimizarVencidosAsync(DateOnly dataEventoAnteriorA, DateTimeOffset agora, CancellationToken cancelamento)
        {
            throw new NotSupportedException();
        }
    }

    private sealed class RepositorioAcessosVazio : Celebri.Aplicacao.Persistencia.IAcessoCronogramaRepository
    {
        public Task<IReadOnlyList<CifraArmazenada>> ListarCifrasAsync(Guid? aposAcessoId, int quantidade, CancellationToken cancelamento)
        {
            IReadOnlyList<CifraArmazenada> vazio = [];
            return Task.FromResult(vazio);
        }

        public Task<int> SubstituirCifrasAsync(IReadOnlyList<SubstituicaoCifra> substituicoes, CancellationToken cancelamento)
        {
            throw new NotSupportedException();
        }

        public Task<Celebri.Dominio.Cronogramas.AcessoCronograma?> ObterPorHashAsync(string tokenHash, CancellationToken cancelamento)
        {
            throw new NotSupportedException();
        }

        public Task<IReadOnlyList<Celebri.Dominio.Cronogramas.AcessoCronograma>> ListarPorEventoAsync(Guid eventoId, CancellationToken cancelamento)
        {
            throw new NotSupportedException();
        }

        public Task<Celebri.Dominio.Cronogramas.AcessoCronograma?> ObterAsync(Guid eventoId, Guid acessoId, CancellationToken cancelamento)
        {
            throw new NotSupportedException();
        }

        public void Adicionar(Celebri.Dominio.Cronogramas.AcessoCronograma acesso)
        {
            throw new NotSupportedException();
        }

        public void Remover(Celebri.Dominio.Cronogramas.AcessoCronograma acesso)
        {
            throw new NotSupportedException();
        }
    }
}
