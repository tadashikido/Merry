using Celebri.Aplicacao.Arquivos;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.FornecedoresEvento;
using Celebri.Aplicacao.Persistencia;
using Celebri.Aplicacao.UsuarioAtual;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Fornecedores;
using Celebri.Testes.Unidade.Autenticacao.Fakes;
using Celebri.Testes.Unidade.Financeiro;

namespace Celebri.Testes.Unidade.Fornecedores;

public class FornecedorEventoServiceTestes
{
    private static readonly DateTimeOffset Agora = new(2026, 9, 30, 12, 0, 0, TimeSpan.Zero);

    private readonly RepositorioEventos _eventos = new();
    private readonly RepositorioFornecedores _fornecedores = new();
    private readonly RepositorioVinculosFornecedorMemoria _vinculos;
    private readonly RepositorioParcelasMemoria _parcelas;
    private readonly ArmazenamentoMemoria _armazenamento = new();
    private readonly UnidadeTrabalhoControlada _unidade = new();
    private readonly Evento _evento;
    private readonly Fornecedor _buffet;

    public FornecedorEventoServiceTestes()
    {
        _vinculos = new RepositorioVinculosFornecedorMemoria();
        _parcelas = new RepositorioParcelasMemoria(_vinculos);
        _evento = NovoEvento();
        _buffet = NovoFornecedor(CategoriaFornecedor.Buffet, "Buffet São João", "Pede sinal de 30%.");
    }

    private FornecedorEventoService Service(IUsuarioAtual? usuario = null)
    {
        return new FornecedorEventoService(
            _eventos,
            _fornecedores,
            _vinculos,
            _parcelas,
            _armazenamento,
            _unidade,
            new RelogioFixo(Agora),
            new CalendarioLocalFixo(DateOnly.FromDateTime(Agora.UtcDateTime)),
            usuario ?? UsuarioAtualFalso.Dono());
    }

    private Evento NovoEvento()
    {
        var evento = Evento.Criar(
            new DadosEvento("Ana", "João", new DateOnly(2026, 12, 12), null, null, null, null, null),
            Agora);
        _eventos.Itens.Add(evento);
        return evento;
    }

    private Fornecedor NovoFornecedor(CategoriaFornecedor categoria, string nome, string? observacoes = null)
    {
        var fornecedor = Fornecedor.Criar(new DadosFornecedor(categoria, nome, null, "11987654321", null, null, null, observacoes), Agora);
        _fornecedores.Itens.Add(fornecedor);
        _vinculos.Fornecedores[fornecedor.Id] = fornecedor;
        return fornecedor;
    }

    private static VincularFornecedorRequest Vincular(Guid fornecedorId, StatusFornecedorEvento? status = null, decimal? contratado = null)
    {
        return new VincularFornecedorRequest(fornecedorId, "Jantar para 200", 18000m, contratado, status, "Comissão de 10%");
    }

    private static MemoryStream Pdf(string conteudo = "%PDF-1.7 contrato")
    {
        return new MemoryStream(System.Text.Encoding.UTF8.GetBytes(conteudo));
    }

    [Fact]
    public async Task Vincular_DeveGravarEmCotacaoERetornarNotasParaAssessoria()
    {
        var dto = await Service().VincularAsync(_evento.Id, Vincular(_buffet.Id), CancellationToken.None);

        Assert.Equal("Cotacao", dto.Status);
        Assert.Equal("Comissão de 10%", dto.NotasInternas);
        Assert.Equal("Buffet", dto.Fornecedor.Categoria);
        Assert.Single(_vinculos.Itens);
        Assert.Equal(1, _unidade.Salvamentos);
    }

    [Fact]
    public async Task Vincular_RegrasDeFornecedor_DevemBarrarArquivadoDuplicadoEInexistente()
    {
        var service = Service();
        await service.VincularAsync(_evento.Id, Vincular(_buffet.Id), CancellationToken.None);
        var arquivado = NovoFornecedor(CategoriaFornecedor.Decoracao, "Florista Jardim");
        arquivado.Arquivar(Agora);

        var duplicado = await Assert.ThrowsAsync<RegraNegocioException>(() => service.VincularAsync(_evento.Id, Vincular(_buffet.Id), CancellationToken.None));
        var deArquivado = await Assert.ThrowsAsync<RegraNegocioException>(() => service.VincularAsync(_evento.Id, Vincular(arquivado.Id), CancellationToken.None));

        Assert.Equal(MensagensFornecedoresEvento.JaVinculado, duplicado.Message);
        Assert.Equal(FornecedorEvento.CampoFornecedorId, duplicado.Campo);
        Assert.Equal(MensagensFornecedoresEvento.FornecedorArquivado, deArquivado.Message);
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() => service.VincularAsync(_evento.Id, Vincular(Guid.NewGuid()), CancellationToken.None));
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() => service.VincularAsync(Guid.NewGuid(), Vincular(_buffet.Id), CancellationToken.None));
        Assert.Single(_vinculos.Itens);
    }

    [Fact]
    public async Task Escritas_EmEventoArquivado_DevemLancarRegraMasLeituraFunciona()
    {
        var service = Service();
        var vinculo = await service.VincularAsync(_evento.Id, Vincular(_buffet.Id), CancellationToken.None);
        _evento.Arquivar(Agora);

        await Assert.ThrowsAsync<RegraNegocioException>(() => service.VincularAsync(_evento.Id, Vincular(NovoFornecedor(CategoriaFornecedor.Musica, "DJ").Id), CancellationToken.None));
        await Assert.ThrowsAsync<RegraNegocioException>(() => service.RemoverAsync(_evento.Id, vinculo.Id, CancellationToken.None));
        await Assert.ThrowsAsync<RegraNegocioException>(() => service.AnexarContratoAsync(_evento.Id, vinculo.Id, "c.pdf", Pdf(), CancellationToken.None));
        var lista = await service.ListarAsync(_evento.Id, CancellationToken.None);

        Assert.True(lista.EventoArquivado);
        Assert.True(lista.SomenteLeitura);
        Assert.Single(lista.Vinculos);
    }

    [Fact]
    public async Task Anfitriao_DeveReceberSemNotasInternasESomenteLeitura()
    {
        await Service().VincularAsync(_evento.Id, Vincular(_buffet.Id), CancellationToken.None);
        var anfitriao = Service(UsuarioAtualFalso.Anfitriao(_evento.Id));

        var lista = await anfitriao.ListarAsync(_evento.Id, CancellationToken.None);
        var detalhe = await anfitriao.ObterAsync(_evento.Id, lista.Vinculos[0].Id, CancellationToken.None);

        Assert.True(lista.SomenteLeitura);
        Assert.Null(lista.Vinculos[0].NotasInternas);
        Assert.Null(detalhe.NotasInternas);
        Assert.Equal("11987654321", detalhe.Fornecedor.Telefone);
    }

    [Fact]
    public async Task AnexarContrato_DeveValidarAssinaturaEVazioAntesDeGravar()
    {
        var service = Service();
        var vinculo = await service.VincularAsync(_evento.Id, Vincular(_buffet.Id), CancellationToken.None);

        var formato = await Assert.ThrowsAsync<RegraNegocioException>(
            () => service.AnexarContratoAsync(_evento.Id, vinculo.Id, "foto.pdf", Pdf("\u0089PNG imagem"), CancellationToken.None));
        var vazio = await Assert.ThrowsAsync<RegraNegocioException>(
            () => service.AnexarContratoAsync(_evento.Id, vinculo.Id, "vazio.pdf", new MemoryStream(), CancellationToken.None));

        Assert.Equal(MensagensFornecedoresEvento.ContratoFormatoInvalido, formato.Message);
        Assert.Equal(MensagensFornecedoresEvento.ContratoVazio, vazio.Message);
        Assert.Empty(_armazenamento.Arquivos);
    }

    [Fact]
    public async Task AnexarContrato_DeveGravarComGuidESubstituirApagandoOAnteriorDepoisDoCommit()
    {
        var service = Service();
        var vinculo = await service.VincularAsync(_evento.Id, Vincular(_buffet.Id), CancellationToken.None);

        var primeiro = await service.AnexarContratoAsync(_evento.Id, vinculo.Id, "../contrato \"buffet\".pdf", Pdf(), CancellationToken.None);
        var chavePrimeiro = Assert.Single(_armazenamento.Arquivos.Keys);
        var segundo = await service.AnexarContratoAsync(_evento.Id, vinculo.Id, "novo.pdf", Pdf("%PDF-1.7 novo"), CancellationToken.None);

        Assert.Equal("contrato _buffet_.pdf", primeiro.Contrato!.NomeArquivo);
        Assert.Equal("novo.pdf", segundo.Contrato!.NomeArquivo);
        var chaveSegundo = Assert.Single(_armazenamento.Arquivos.Keys);
        Assert.NotEqual(chavePrimeiro, chaveSegundo);
        Assert.Contains(chavePrimeiro, _armazenamento.Removidos);
    }

    [Fact]
    public async Task AnexarContrato_FalhaAoSalvarNoBanco_DeveApagarOArquivoNovo()
    {
        var service = Service();
        var vinculo = await service.VincularAsync(_evento.Id, Vincular(_buffet.Id), CancellationToken.None);
        _unidade.FalharProxima = true;

        await Assert.ThrowsAsync<ConcorrenciaException>(
            () => service.AnexarContratoAsync(_evento.Id, vinculo.Id, "c.pdf", Pdf(), CancellationToken.None));

        Assert.Empty(_armazenamento.Arquivos);
        Assert.Single(_armazenamento.Removidos);
    }

    [Fact]
    public async Task ObterContrato_SemContrato_DeveLancar404EComContratoDevolverONomeSaneado()
    {
        var service = Service();
        var vinculo = await service.VincularAsync(_evento.Id, Vincular(_buffet.Id), CancellationToken.None);

        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() => service.ObterContratoAsync(_evento.Id, vinculo.Id, CancellationToken.None));
        await service.AnexarContratoAsync(_evento.Id, vinculo.Id, "Contrato.PDF", Pdf(), CancellationToken.None);
        var arquivo = await Service(UsuarioAtualFalso.Anfitriao(_evento.Id)).ObterContratoAsync(_evento.Id, vinculo.Id, CancellationToken.None);

        Assert.Equal("Contrato.pdf", arquivo.NomeArquivo);
        await arquivo.Conteudo.DisposeAsync();
    }

    [Fact]
    public async Task RemoverContratoERemoverVinculo_DevemApagarOArquivo()
    {
        var service = Service();
        var vinculo = await service.VincularAsync(_evento.Id, Vincular(_buffet.Id), CancellationToken.None);
        await service.AnexarContratoAsync(_evento.Id, vinculo.Id, "c.pdf", Pdf(), CancellationToken.None);

        var semContrato = await service.RemoverContratoAsync(_evento.Id, vinculo.Id, CancellationToken.None);
        Assert.Null(semContrato.Contrato);
        Assert.Empty(_armazenamento.Arquivos);

        await service.AnexarContratoAsync(_evento.Id, vinculo.Id, "c.pdf", Pdf(), CancellationToken.None);
        await service.RemoverAsync(_evento.Id, vinculo.Id, CancellationToken.None);
        Assert.Empty(_armazenamento.Arquivos);
        Assert.Empty(_vinculos.Itens);
    }

    [Fact]
    public async Task Importar_DeveCopiarElegiveisEIgnorarCanceladosArquivadosEJaVinculados()
    {
        var origem = NovoEvento();
        var destino = _evento;
        var service = Service();
        var florista = NovoFornecedor(CategoriaFornecedor.Decoracao, "Florista Jardim");
        var dj = NovoFornecedor(CategoriaFornecedor.Musica, "DJ Noite");
        var foto = NovoFornecedor(CategoriaFornecedor.Fotografia, "Luz & Afeto");
        var contratado = await service.VincularAsync(origem.Id, Vincular(_buffet.Id, StatusFornecedorEvento.Contratado, 18500m), CancellationToken.None);
        await service.AnexarContratoAsync(origem.Id, contratado.Id, "c.pdf", Pdf(), CancellationToken.None);
        await service.VincularAsync(origem.Id, Vincular(florista.Id, StatusFornecedorEvento.Cancelado), CancellationToken.None);
        await service.VincularAsync(origem.Id, Vincular(dj.Id), CancellationToken.None);
        await service.VincularAsync(origem.Id, Vincular(foto.Id), CancellationToken.None);
        dj.Arquivar(Agora);
        await service.VincularAsync(destino.Id, Vincular(foto.Id), CancellationToken.None);

        var resultado = await service.ImportarAsync(destino.Id, new ImportarFornecedoresRequest(origem.Id), CancellationToken.None);

        Assert.Equal(1, resultado.Importados);
        Assert.Equal(3, resultado.Ignorados);
        var importado = Assert.Single(_vinculos.Itens, item => item.EventoId == destino.Id && item.FornecedorId == _buffet.Id);
        Assert.Equal(StatusFornecedorEvento.Cotacao, importado.Status);
        Assert.Equal(18000m, importado.ValorOrcado);
        Assert.Null(importado.ValorContratado);
        Assert.Null(importado.NotasInternas);
        Assert.False(importado.PossuiContrato);
    }

    [Fact]
    public async Task Importar_DoProprioEventoOuDeInexistente_DeveFalhar()
    {
        var service = Service();

        var proprio = await Assert.ThrowsAsync<RegraNegocioException>(
            () => service.ImportarAsync(_evento.Id, new ImportarFornecedoresRequest(_evento.Id), CancellationToken.None));

        Assert.Equal(MensagensFornecedoresEvento.ImportarMesmoEvento, proprio.Message);
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(
            () => service.ImportarAsync(_evento.Id, new ImportarFornecedoresRequest(Guid.NewGuid()), CancellationToken.None));
    }

    private sealed class RepositorioEventos : IEventoRepository
    {
        public List<Evento> Itens { get; } = [];

        public Task<IReadOnlyList<Evento>> ListarAsync(bool arquivados, CancellationToken cancelamento)
        {
            IReadOnlyList<Evento> resultado = Itens.Where(evento => evento.Arquivado == arquivados).ToList();
            return Task.FromResult(resultado);
        }

        public Task<Evento?> ObterPorIdAsync(Guid id, CancellationToken cancelamento)
        {
            return Task.FromResult(Itens.FirstOrDefault(evento => evento.Id == id));
        }

        public void Adicionar(Evento evento)
        {
            Itens.Add(evento);
        }
    }

    private sealed class RepositorioFornecedores : IFornecedorRepository
    {
        public List<Fornecedor> Itens { get; } = [];

        public Task<IReadOnlyList<Fornecedor>> ListarAsync(CancellationToken cancelamento)
        {
            IReadOnlyList<Fornecedor> resultado = Itens.ToList();
            return Task.FromResult(resultado);
        }

        public Task<Fornecedor?> ObterAsync(Guid fornecedorId, CancellationToken cancelamento)
        {
            return Task.FromResult(Itens.FirstOrDefault(item => item.Id == fornecedorId));
        }

        public Task<int> ContarAsync(CancellationToken cancelamento)
        {
            return Task.FromResult(Itens.Count);
        }

        public Task<Fornecedor?> BuscarPorChaveAsync(CategoriaFornecedor categoria, string nomeNormalizado, Guid? ignorarFornecedorId, CancellationToken cancelamento)
        {
            return Task.FromResult<Fornecedor?>(null);
        }

        public void Adicionar(Fornecedor fornecedor)
        {
            Itens.Add(fornecedor);
        }

        public void Remover(Fornecedor fornecedor)
        {
            Itens.Remove(fornecedor);
        }
    }

    private sealed class ArmazenamentoMemoria : IArmazenamentoArquivos
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

    private sealed class UnidadeTrabalhoControlada : IUnidadeTrabalho
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
    }
}
