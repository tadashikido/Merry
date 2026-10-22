using System.ComponentModel.DataAnnotations;
using System.Reflection;
using Celebri.Aplicacao.Calendario;
using Celebri.Aplicacao.CronogramaPublico;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Isolamento;
using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Casamentos;
using Celebri.Dominio.Cronogramas;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Fornecedores;
using Celebri.Dominio.Isolamento;
using Celebri.Infraestrutura.Seguranca;
using Celebri.Testes.Unidade.Autenticacao.Fakes;
using Celebri.Testes.Unidade.Fornecedores;
using Microsoft.Extensions.Options;

namespace Celebri.Testes.Unidade.Cronogramas;

public class LinksCronogramaTestes
{
    private const string ChaveDadosSensiveis = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=";
    private static readonly DateTimeOffset Agora = new(2027, 3, 10, 12, 0, 0, TimeSpan.Zero);
    private static readonly DateOnly DataCasamento = new(2027, 5, 15);

    private readonly RepositorioCasamentosMemoria _casamentos = new();
    private readonly RepositorioItensMemoria _itens = new();
    private readonly RepositorioVinculosFornecedorMemoria _vinculos = new();
    private readonly RepositorioAcessosMemoria _acessos = new();
    private readonly UnidadeTrabalhoContador _unidadeTrabalho = new();
    private readonly CalendarioFixo _calendario = new(new DateOnly(2027, 3, 10));
    private readonly CasamentoAssessorado _casamento;
    private readonly Guid _organizacaoId = Guid.NewGuid();

    public LinksCronogramaTestes()
    {
        _casamento = NovoCasamento(_organizacaoId);
        _casamentos.Itens.Add(_casamento);
    }

    private static CasamentoAssessorado NovoCasamento(Guid organizacaoId, DateOnly? data = null)
    {
        var casamento = CasamentoAssessorado.Criar(
            new DadosCasamento("Ana", "João", data ?? DataCasamento, new TimeOnly(16, 30), "Capela", "Salão", null, "Observação interna"),
            Agora);
        typeof(CasamentoAssessorado).GetProperty(nameof(CasamentoAssessorado.OrganizacaoId))!.SetValue(casamento, organizacaoId);
        return casamento;
    }

    private static CifradorTokenCronograma Cifrador(string chave = ChaveDadosSensiveis)
    {
        return new CifradorTokenCronograma(Options.Create(new OpcoesDadosSensiveis { ChaveCifragem = chave }));
    }

    private LinkCronogramaService ServicoLinks()
    {
        return new LinkCronogramaService(
            _casamentos,
            _itens,
            _vinculos,
            _acessos,
            new GeradorTokenOpaco(),
            Cifrador(),
            _unidadeTrabalho,
            _calendario,
            new RelogioFixo(Agora));
    }

    private (CronogramaPublicoService Servico, EscopoIsolamentoCronogramaPublico Escopo) ServicoPublico()
    {
        var escopo = new EscopoIsolamentoCronogramaPublico();
        return (new CronogramaPublicoService(_acessos, _casamentos, _itens, _vinculos, escopo, new GeradorTokenOpaco(), _calendario), escopo);
    }

    private ItemCronograma Adicionar(
        int hora,
        string atividade,
        string? responsavel = null,
        Guid? fornecedor = null,
        Guid? casamentoId = null,
        DiaCronograma dia = DiaCronograma.DiaDoCasamento)
    {
        var item = ItemCronograma.Criar(
            casamentoId ?? _casamento.Id,
            new DadosItemCronograma(dia, new TimeOnly(hora, 0), 30, atividade, "Salão", responsavel, fornecedor, "Instrução pública", "Pagar saldo de R$ 4.000 em espécie"),
            null,
            Agora);
        _itens.Itens.Add(item);
        return item;
    }

    private Guid AdicionarVinculo(string nome, StatusFornecedorCasamento status = StatusFornecedorCasamento.Contratado, Guid? casamentoId = null, string? telefone = "(11) 98765-4321")
    {
        var fornecedor = Fornecedor.Criar(
            new DadosFornecedor(CategoriaFornecedor.Buffet, nome, "Marcos", telefone, "contato@buffet.com", null, null, "Observação do fornecedor"),
            Agora);
        _vinculos.Fornecedores[fornecedor.Id] = fornecedor;
        var vinculo = FornecedorCasamento.Criar(
            casamentoId ?? _casamento.Id,
            fornecedor.Id,
            new DadosFornecedorCasamento("Buffet", 9_000m, status == StatusFornecedorCasamento.Contratado ? 8_500m : null, status, "Nota do vínculo"),
            null,
            Agora);
        _vinculos.Itens.Add(vinculo);
        return vinculo.Id;
    }

    [Fact]
    public void Destino_DoResponsavel_DeveNormalizarAChaveComoNoCronograma()
    {
        var destino = DestinoAcessoCronograma.DoResponsavel("  Fernánda   Lima ");
        var item = Adicionar(10, "Recepção", "fernanda lima");

        Assert.Equal(TipoAcessoCronograma.Responsavel, destino.Tipo);
        Assert.Equal("fernanda lima", destino.ResponsavelChave);
        Assert.True(destino.AtendeItem(item));
        Assert.Equal(DestinoAcessoCronograma.DoResponsavel("FERNANDA LIMA"), destino);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Destino_ResponsavelVazio_DeveSerRecusadoNoCampoResponsavel(string? responsavel)
    {
        var erro = Assert.Throws<RegraNegocioException>(() => DestinoAcessoCronograma.DoResponsavel(responsavel));

        Assert.Equal(DestinoAcessoCronograma.CampoResponsavel, erro.Campo);
    }

    [Fact]
    public void Destino_FornecedorVazio_DeveSerRecusadoNoCampoFornecedor()
    {
        Assert.Equal(
            DestinoAcessoCronograma.CampoFornecedor,
            Assert.Throws<RegraNegocioException>(() => DestinoAcessoCronograma.DoFornecedor(Guid.Empty)).Campo);
        Assert.Equal(
            DestinoAcessoCronograma.CampoFornecedor,
            Assert.Throws<RegraNegocioException>(() => DestinoAcessoCronograma.DoFornecedor(null)).Campo);
    }

    [Fact]
    public void AtendeItem_DeveFiltrarPorDestinoECasamento()
    {
        var vinculo = Guid.NewGuid();
        var doFornecedor = Adicionar(9, "Montagem", fornecedor: vinculo);
        var deOutro = Adicionar(10, "Som", fornecedor: Guid.NewGuid());
        var semFornecedor = Adicionar(11, "Fotos", "Ana");
        var deOutroCasamento = Adicionar(12, "Outro", fornecedor: vinculo, casamentoId: Guid.NewGuid());
        var acesso = AcessoCronograma.Gerar(_casamento, DestinoAcessoCronograma.DoFornecedor(vinculo), new string('a', 64), "cifrado", Agora);
        var geral = AcessoCronograma.Gerar(_casamento, DestinoAcessoCronograma.Geral(), new string('b', 64), "cifrado", Agora);

        Assert.True(acesso.AtendeItem(doFornecedor));
        Assert.False(acesso.AtendeItem(deOutro));
        Assert.False(acesso.AtendeItem(semFornecedor));
        Assert.False(acesso.AtendeItem(deOutroCasamento));
        Assert.True(geral.AtendeItem(semFornecedor));
        Assert.False(geral.AtendeItem(deOutroCasamento));
    }

    [Fact]
    public void Gerar_DeveCopiarOrganizacaoECasamentoEExigirHashDe64()
    {
        var acesso = AcessoCronograma.Gerar(_casamento, DestinoAcessoCronograma.Geral(), new string('c', 64), "cifrado", Agora);

        Assert.Equal(_organizacaoId, acesso.OrganizacaoId);
        Assert.Equal(_casamento.Id, acesso.CasamentoId);
        Assert.Throws<ArgumentException>(() => acesso.Renovar("curto", "cifrado", Agora));
        Assert.Throws<InvalidOperationException>(() =>
            AcessoCronograma.Gerar(NovoCasamento(Guid.Empty), DestinoAcessoCronograma.Geral(), new string('c', 64), "x", Agora));
    }

    [Fact]
    public void Validade_DeveValerAteSeteDiasDepoisEDesligarArquivado()
    {
        Assert.Equal(new DateOnly(2027, 5, 22), ValidadeAcessoCronograma.ValidoAte(DataCasamento));
        Assert.False(ValidadeAcessoCronograma.Expirado(DataCasamento, new DateOnly(2027, 5, 22)));
        Assert.True(ValidadeAcessoCronograma.Expirado(DataCasamento, new DateOnly(2027, 5, 23)));
        Assert.True(ValidadeAcessoCronograma.Ativo(_casamento, new DateOnly(2027, 5, 22)));

        _casamento.Arquivar(Agora);

        Assert.False(ValidadeAcessoCronograma.Ativo(_casamento, new DateOnly(2027, 3, 10)));
    }

    [Fact]
    public void Cifrador_DeveIrEVoltarEFalharComOutroCasamentoOuOutraChave()
    {
        var cifrador = Cifrador();
        var token = new GeradorTokenOpaco().Gerar();
        var casamentoId = Guid.NewGuid();

        var cifrado = cifrador.Cifrar(token, casamentoId);

        Assert.DoesNotContain(token, cifrado, StringComparison.Ordinal);
        Assert.True(cifrado.Length <= AcessoCronograma.TamanhoMaximoTokenCifrado);
        Assert.Equal(token, cifrador.Decifrar(cifrado, casamentoId));
        Assert.Null(cifrador.Decifrar(cifrado, Guid.NewGuid()));
        Assert.Null(Cifrador("BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc=").Decifrar(cifrado, casamentoId));
        Assert.Null(cifrador.Decifrar("nao-base64!", casamentoId));
    }

    [Fact]
    public void Cifrador_NaoDeveCompartilharChaveComOsDadosSensiveis()
    {
        var token = new GeradorTokenOpaco().Gerar();
        var id = Guid.NewGuid();
        var cifradoSensivel = new CifradorDadosSensiveis(Options.Create(new OpcoesDadosSensiveis { ChaveCifragem = ChaveDadosSensiveis }))
            .Cifrar(token, id);

        Assert.Null(Cifrador().Decifrar(cifradoSensivel[CifradorDadosSensiveis.PrefixoVersao.Length..], id));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("curto")]
    [InlineData("AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcd")]
    [InlineData("AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abc/e")]
    public void FormatoToken_ForaDoPadrao_DeveSerInvalido(string? token)
    {
        Assert.False(FormatoTokenCronograma.Valido(token));
    }

    [Fact]
    public void Escopo_DeveSerUnicoERestringirOrganizacaoECasamento()
    {
        var escopo = new EscopoIsolamentoCronogramaPublico();
        var contexto = new ContextoIsolamentoRequisicao(
            new ContextoIsolamentoUsuarioAtual(UsuarioAtualFalso.Dono()),
            new EscopoIsolamentoRsvp(),
            new EscopoIsolamentoAcessoCasal(),
            new EscopoIsolamentoSistema(),
            escopo);
        var organizacao = Guid.NewGuid();
        var casamento = Guid.NewGuid();

        escopo.Restringir(organizacao, casamento);

        Assert.Equal(organizacao, contexto.OrganizacaoId);
        Assert.Equal(new[] { casamento }, contexto.CasamentosPermitidos!);
        Assert.Throws<InvalidOperationException>(() => escopo.Restringir(organizacao, casamento));
        Assert.Throws<InvalidOperationException>(() => new EscopoIsolamentoCronogramaPublico().Restringir(Guid.Empty, casamento));
        Assert.Throws<InvalidOperationException>(() => new EscopoIsolamentoCronogramaPublico().Restringir(organizacao, Guid.Empty));
    }

    [Fact]
    public void Request_TipoAusenteOuDesconhecido_DeveSerRecusado()
    {
        var desconhecido = new GerarLinkCronogramaRequest((TipoAcessoCronograma)99, null, null);

        Assert.Throws<RegraNegocioException>(() => new GerarLinkCronogramaRequest(null, null, null).ParaDestino());
        Assert.NotEmpty(desconhecido.Validate(new ValidationContext(desconhecido)));
        Assert.Equal(TipoAcessoCronograma.Geral, new GerarLinkCronogramaRequest(TipoAcessoCronograma.Geral, Guid.NewGuid(), "x").ParaDestino().Tipo);
    }

    [Fact]
    public async Task Gerar_DeveSerIdempotenteEGuardarSoHashECopiaCifrada()
    {
        var servico = ServicoLinks();

        var primeiro = await servico.GerarAsync(_casamento.Id, new GerarLinkCronogramaRequest(TipoAcessoCronograma.Geral, null, null), default);
        var segundo = await servico.GerarAsync(_casamento.Id, new GerarLinkCronogramaRequest(TipoAcessoCronograma.Geral, null, null), default);

        var acesso = Assert.Single(_acessos.Itens);
        Assert.True(FormatoTokenCronograma.Valido(primeiro.Token));
        Assert.Equal(primeiro.Token, segundo.Token);
        Assert.Equal(primeiro.Id, segundo.Id);
        Assert.Equal(new GeradorTokenOpaco().CalcularHash(primeiro.Token!), acesso.TokenHash);
        Assert.DoesNotContain(primeiro.Token!, acesso.TokenCifrado, StringComparison.Ordinal);
        Assert.Equal(1, _unidadeTrabalho.Salvamentos);
    }

    [Fact]
    public async Task Gerar_ComCopiaIrrecuperavel_DeveRetornarConflito()
    {
        _acessos.Itens.Add(AcessoCronograma.Gerar(_casamento, DestinoAcessoCronograma.Geral(), new string('d', 64), "invalido", Agora));

        await Assert.ThrowsAsync<ConflitoException>(() =>
            ServicoLinks().GerarAsync(_casamento.Id, new GerarLinkCronogramaRequest(TipoAcessoCronograma.Geral, null, null), default));
    }

    [Fact]
    public async Task Gerar_FornecedorCanceladoOuDeOutroCasamento_DeveRetornar422NoCampo()
    {
        var cancelado = AdicionarVinculo("Cancelado", StatusFornecedorCasamento.Cancelado);
        var outroCasamento = AdicionarVinculo("Outro", casamentoId: Guid.NewGuid());

        var erroCancelado = await Assert.ThrowsAsync<RegraNegocioException>(() =>
            ServicoLinks().GerarAsync(_casamento.Id, new GerarLinkCronogramaRequest(TipoAcessoCronograma.Fornecedor, cancelado, null), default));
        var erroOutro = await Assert.ThrowsAsync<RegraNegocioException>(() =>
            ServicoLinks().GerarAsync(_casamento.Id, new GerarLinkCronogramaRequest(TipoAcessoCronograma.Fornecedor, outroCasamento, null), default));

        Assert.Equal(DestinoAcessoCronograma.CampoFornecedor, erroCancelado.Campo);
        Assert.Equal(DestinoAcessoCronograma.CampoFornecedor, erroOutro.Campo);
        Assert.Empty(_acessos.Itens);
    }

    [Fact]
    public async Task Gerar_ResponsavelSemItens_DeveRetornar422NoCampo()
    {
        Adicionar(10, "Recepção", "Carlos");

        var erro = await Assert.ThrowsAsync<RegraNegocioException>(() =>
            ServicoLinks().GerarAsync(_casamento.Id, new GerarLinkCronogramaRequest(TipoAcessoCronograma.Responsavel, null, "Fernanda"), default));

        Assert.Equal(DestinoAcessoCronograma.CampoResponsavel, erro.Campo);
    }

    [Fact]
    public async Task GerarERegenerar_CasamentoArquivadoOuExpirado_DevemRetornar422MasRevogarContinuaPermitido()
    {
        var link = await ServicoLinks().GerarAsync(_casamento.Id, new GerarLinkCronogramaRequest(TipoAcessoCronograma.Geral, null, null), default);
        _calendario.Data = new DateOnly(2027, 5, 23);

        await Assert.ThrowsAsync<RegraNegocioException>(() => ServicoLinks().RegenerarAsync(_casamento.Id, link.Id, default));
        await Assert.ThrowsAsync<RegraNegocioException>(() =>
            ServicoLinks().GerarAsync(_casamento.Id, new GerarLinkCronogramaRequest(TipoAcessoCronograma.Geral, null, null), default));

        _calendario.Data = new DateOnly(2027, 3, 10);
        _casamento.Arquivar(Agora);

        await Assert.ThrowsAsync<RegraNegocioException>(() => ServicoLinks().RegenerarAsync(_casamento.Id, link.Id, default));
        await ServicoLinks().RevogarAsync(_casamento.Id, link.Id, default);
        Assert.Empty(_acessos.Itens);
    }

    [Fact]
    public async Task Regenerar_DeveTrocarTokenEManterDestino()
    {
        var servico = ServicoLinks();
        var original = await servico.GerarAsync(_casamento.Id, new GerarLinkCronogramaRequest(TipoAcessoCronograma.Geral, null, null), default);

        var novo = await servico.RegenerarAsync(_casamento.Id, original.Id, default);

        Assert.Equal(original.Id, novo.Id);
        Assert.NotEqual(original.Token, novo.Token);
        Assert.Equal(new GeradorTokenOpaco().CalcularHash(novo.Token!), Assert.Single(_acessos.Itens).TokenHash);
    }

    [Fact]
    public async Task LinkDeOutroCasamento_DeveSerNaoEncontrado()
    {
        var outro = NovoCasamento(_organizacaoId);
        _casamentos.Itens.Add(outro);
        var link = await ServicoLinks().GerarAsync(outro.Id, new GerarLinkCronogramaRequest(TipoAcessoCronograma.Geral, null, null), default);

        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() => ServicoLinks().RegenerarAsync(_casamento.Id, link.Id, default));
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() => ServicoLinks().RevogarAsync(_casamento.Id, link.Id, default));
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() => ServicoLinks().ListarAsync(Guid.NewGuid(), default));
    }

    [Fact]
    public async Task Listar_DeveMontarDestinosOrdenadosComContagemTelefoneEOrfaos()
    {
        var buffet = AdicionarVinculo("Buffet Sabor");
        AdicionarVinculo("Arte Floral", telefone: null);
        AdicionarVinculo("Cancelado sem link", StatusFornecedorCasamento.Cancelado);
        Adicionar(9, "Montagem", "Fernanda", buffet);
        Adicionar(10, "Recepção", "fernanda ");
        Adicionar(11, "Fotos", "Carlos");
        var servico = ServicoLinks();
        await servico.GerarAsync(_casamento.Id, new GerarLinkCronogramaRequest(TipoAcessoCronograma.Fornecedor, buffet, null), default);
        await servico.GerarAsync(_casamento.Id, new GerarLinkCronogramaRequest(TipoAcessoCronograma.Responsavel, null, "Carlos"), default);
        _itens.Itens.RemoveAll(item => item.Responsavel == "Carlos");

        var lista = await servico.ListarAsync(_casamento.Id, default);

        Assert.Equal(new DateOnly(2027, 5, 22), lista.ValidoAte);
        Assert.False(lista.Expirado);
        Assert.Equal(
            ["Geral", "Fornecedor", "Fornecedor", "Responsavel", "Responsavel"],
            lista.Destinos.Select(destino => destino.Tipo));
        Assert.Equal(2, lista.Destinos[0].QuantidadeItens);
        Assert.Equal(["Arte Floral", "Buffet Sabor"], lista.Destinos.Where(destino => destino.Tipo == "Fornecedor").Select(destino => destino.Rotulo));
        var destinoBuffet = lista.Destinos.Single(destino => destino.Rotulo == "Buffet Sabor");
        Assert.Equal("11987654321", destinoBuffet.Telefone);
        Assert.Equal(1, destinoBuffet.QuantidadeItens);
        Assert.NotNull(destinoBuffet.Link?.Token);
        var responsaveis = lista.Destinos.Where(destino => destino.Tipo == "Responsavel").ToList();
        Assert.Equal(["carlos", "Fernanda"], responsaveis.Select(destino => destino.Rotulo));
        Assert.Equal(0, responsaveis[0].QuantidadeItens);
        Assert.NotNull(responsaveis[0].Link);
        Assert.Equal(2, responsaveis[1].QuantidadeItens);
        Assert.Null(responsaveis[1].Link);
    }

    [Fact]
    public async Task ConsultaPublica_DeveFiltrarPeloDestinoGravadoSemExporNotasEEstabelecerEscopo()
    {
        var buffet = AdicionarVinculo("Buffet Sabor");
        var outro = AdicionarVinculo("Som Total");
        Adicionar(14, "Montagem do buffet", "Fernanda", buffet);
        Adicionar(9, "Making of", "Ana", null, dia: DiaCronograma.Vespera);
        Adicionar(19, "Jantar", null, buffet);
        Adicionar(21, "Pista", "Fernanda", outro);
        var link = await ServicoLinks().GerarAsync(_casamento.Id, new GerarLinkCronogramaRequest(TipoAcessoCronograma.Fornecedor, buffet, null), default);
        var (servico, escopo) = ServicoPublico();

        var dto = await servico.ConsultarAsync(new ConsultarCronogramaPublicoRequest(link.Token), default);

        Assert.Equal(_organizacaoId, escopo.OrganizacaoId);
        Assert.Equal(_casamento.Id, escopo.CasamentoId);
        Assert.Equal(["Montagem do buffet", "Jantar"], dto.Itens.Select(item => item.Atividade));
        Assert.Equal("Fornecedor", dto.Filtro.Tipo);
        Assert.Equal("Buffet Sabor", dto.Filtro.Rotulo);
        Assert.Equal("Buffet", dto.Filtro.Categoria);
        Assert.Equal("Buffet Sabor", dto.Itens[0].Fornecedor!.NomeEmpresa);
        Assert.Equal("Instrução pública", dto.Itens[0].Instrucoes);
        Assert.Equal(new DateOnly(2027, 5, 22), dto.ValidoAte);
        Assert.Equal("16:30", dto.Casamento.HorarioCerimonia);
        Assert.DoesNotContain(
            typeof(ItemCronogramaPublicoDto).GetProperties(BindingFlags.Public | BindingFlags.Instance),
            propriedade => propriedade.Name is "NotasInternas" or "Id" or "Conflitos");
    }

    [Fact]
    public async Task ConsultaPublica_LinkDeResponsavel_DeveUsarONomeEscritoNosItens()
    {
        Adicionar(10, "Recepção", "Fernanda");
        Adicionar(11, "Brinde", "FERNANDA");
        Adicionar(12, "Fotos", "Carlos");
        var link = await ServicoLinks().GerarAsync(_casamento.Id, new GerarLinkCronogramaRequest(TipoAcessoCronograma.Responsavel, null, " fernanda"), default);

        var dto = await ServicoPublico().Servico.ConsultarAsync(new ConsultarCronogramaPublicoRequest(link.Token), default);

        Assert.Equal("Fernanda", dto.Filtro.Rotulo);
        Assert.Equal(["Recepção", "Brinde"], dto.Itens.Select(item => item.Atividade));
    }

    [Fact]
    public async Task ConsultaPublica_TokenInvalidoExpiradoOuArquivado_DeveSerNaoEncontradoComMesmaMensagem()
    {
        var link = await ServicoLinks().GerarAsync(_casamento.Id, new GerarLinkCronogramaRequest(TipoAcessoCronograma.Geral, null, null), default);

        var malformado = await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() =>
            ServicoPublico().Servico.ConsultarAsync(new ConsultarCronogramaPublicoRequest("curto"), default));
        var inexistente = await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() =>
            ServicoPublico().Servico.ConsultarAsync(new ConsultarCronogramaPublicoRequest(new GeradorTokenOpaco().Gerar()), default));
        _calendario.Data = new DateOnly(2027, 5, 23);
        var expirado = await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() =>
            ServicoPublico().Servico.ConsultarAsync(new ConsultarCronogramaPublicoRequest(link.Token), default));
        _calendario.Data = new DateOnly(2027, 5, 22);
        await ServicoPublico().Servico.ConsultarAsync(new ConsultarCronogramaPublicoRequest(link.Token), default);
        _casamento.Arquivar(Agora);
        var arquivado = await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() =>
            ServicoPublico().Servico.ConsultarAsync(new ConsultarCronogramaPublicoRequest(link.Token), default));

        Assert.All(
            new[] { malformado, inexistente, expirado, arquivado },
            erro => Assert.Equal(MensagensAcessoCronograma.LinkInvalido, erro.Message));
    }

    [Fact]
    public void AcessoCronograma_DeveExporSomenteIdentificadoresDestinoEHashes()
    {
        var propriedades = typeof(AcessoCronograma).GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Select(propriedade => propriedade.Name)
            .Order()
            .ToList();

        Assert.Equal(
            ["CasamentoId", "Destino", "FornecedorCasamentoId", "GeradoEm", "Id", "OrganizacaoId", "ResponsavelChave", "Tipo", "TokenCifrado", "TokenHash"],
            propriedades);
        Assert.False(typeof(IPertenceOrganizacao).IsAssignableFrom(typeof(AcessoCronograma)));
    }

    [Fact]
    public void EscopoDoCronogramaPublico_SoPodeSerEstabelecidoPeloServicoPublico()
    {
        var chamadores = FontesDeProducao()
            .Where(fonte => fonte.Conteudo.Contains(".Restringir(", StringComparison.Ordinal))
            .Select(fonte => Path.GetFileName(fonte.Arquivo))
            .ToList();

        Assert.Equal(["CronogramaPublicoService.cs"], chamadores);
    }

    private static IEnumerable<(string Arquivo, string Conteudo)> FontesDeProducao()
    {
        var diretorio = new DirectoryInfo(AppContext.BaseDirectory);

        while (diretorio is not null && !Directory.Exists(Path.Combine(diretorio.FullName, "src", "Celebri.Aplicacao")))
        {
            diretorio = diretorio.Parent;
        }

        var raiz = Path.Combine(diretorio?.FullName ?? throw new DirectoryNotFoundException("Pasta backend/src não encontrada."), "src");

        return Directory.EnumerateFiles(raiz, "*.cs", SearchOption.AllDirectories)
            .Where(arquivo => !arquivo.Contains($"{Path.DirectorySeparatorChar}obj{Path.DirectorySeparatorChar}", StringComparison.Ordinal))
            .Where(arquivo => !arquivo.Contains($"{Path.DirectorySeparatorChar}bin{Path.DirectorySeparatorChar}", StringComparison.Ordinal))
            .Select(arquivo => (arquivo, File.ReadAllText(arquivo)));
    }

    private sealed class CalendarioFixo : ICalendarioLocal
    {
        public CalendarioFixo(DateOnly hoje)
        {
            Data = hoje;
        }

        public DateOnly Data { get; set; }

        public DateOnly Hoje()
        {
            return Data;
        }

        public DateTime Agora()
        {
            return Data.ToDateTime(new TimeOnly(12, 0));
        }
    }

    private sealed class RepositorioCasamentosMemoria : ICasamentoRepository
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

    private sealed class RepositorioItensMemoria : IItemCronogramaRepository
    {
        public List<ItemCronograma> Itens { get; } = [];

        public Task<IReadOnlyList<ItemCronograma>> ListarPorCasamentoAsync(Guid casamentoId, CancellationToken cancelamento)
        {
            IReadOnlyList<ItemCronograma> resultado = Itens.Where(item => item.CasamentoId == casamentoId).ToList();
            return Task.FromResult(resultado);
        }

        public Task<ItemCronograma?> ObterPorIdAsync(Guid casamentoId, Guid itemId, CancellationToken cancelamento)
        {
            return Task.FromResult(Itens.FirstOrDefault(item => item.CasamentoId == casamentoId && item.Id == itemId));
        }

        public Task<int> ContarPorCasamentoAsync(Guid casamentoId, CancellationToken cancelamento)
        {
            return Task.FromResult(Itens.Count(item => item.CasamentoId == casamentoId));
        }

        public void Adicionar(ItemCronograma item)
        {
            Itens.Add(item);
        }

        public void Remover(ItemCronograma item)
        {
            Itens.Remove(item);
        }
    }

    private sealed class RepositorioAcessosMemoria : IAcessoCronogramaRepository
    {
        public List<AcessoCronograma> Itens { get; } = [];

        public Task<AcessoCronograma?> ObterPorHashAsync(string tokenHash, CancellationToken cancelamento)
        {
            return Task.FromResult(Itens.FirstOrDefault(acesso => acesso.TokenHash == tokenHash));
        }

        public Task<IReadOnlyList<AcessoCronograma>> ListarPorCasamentoAsync(Guid casamentoId, CancellationToken cancelamento)
        {
            IReadOnlyList<AcessoCronograma> resultado = Itens.Where(acesso => acesso.CasamentoId == casamentoId).ToList();
            return Task.FromResult(resultado);
        }

        public Task<AcessoCronograma?> ObterAsync(Guid casamentoId, Guid acessoId, CancellationToken cancelamento)
        {
            return Task.FromResult(Itens.FirstOrDefault(acesso => acesso.CasamentoId == casamentoId && acesso.Id == acessoId));
        }

        public void Adicionar(AcessoCronograma acesso)
        {
            Itens.Add(acesso);
        }

        public void Remover(AcessoCronograma acesso)
        {
            Itens.Remove(acesso);
        }
    }

    private sealed class UnidadeTrabalhoContador : IUnidadeTrabalho
    {
        public int Salvamentos { get; private set; }

        public Task SalvarAsync(CancellationToken cancelamento)
        {
            Salvamentos++;
            return Task.CompletedTask;
        }
    }
}
