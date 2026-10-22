using System.ComponentModel.DataAnnotations;
using Celebri.Api.Tratamento;
using Celebri.Aplicacao.Excecoes;
using Celebri.Aplicacao.Fornecedores;
using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Convidados;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Fornecedores;
using Celebri.Testes.Unidade.Autenticacao.Fakes;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Hosting.Internal;
using Microsoft.Extensions.Logging.Abstractions;

namespace Celebri.Testes.Unidade.Fornecedores;

public class FornecedorTestes
{
    private static readonly DateTimeOffset Agora = new(2026, 9, 30, 12, 0, 0, TimeSpan.Zero);

    private static DadosFornecedor Dados(
        string? nome = "Buffet São João",
        CategoriaFornecedor categoria = CategoriaFornecedor.Buffet,
        string? responsavel = null,
        string? telefone = null,
        string? email = null,
        string? site = null,
        string? instagram = null,
        string? observacoes = null)
    {
        return new DadosFornecedor(categoria, nome, responsavel, telefone, email, site, instagram, observacoes);
    }

    [Fact]
    public void Criar_DadosCompletos_DeveNormalizarTodosOsCampos()
    {
        var fornecedor = Fornecedor.Criar(
            Dados(
                "  Buffet   São João ",
                responsavel: "  Marta  Souza ",
                telefone: "(11) 98765-4321",
                email: " Contato@SaoJoao.com.br ",
                site: "saojoao.com.br",
                instagram: "https://www.instagram.com/Buffet.SaoJoao/",
                observacoes: "  Pede sinal de 30%.  "),
            Agora);

        Assert.NotEqual(Guid.Empty, fornecedor.Id);
        Assert.Equal(Guid.Empty, fornecedor.OrganizacaoId);
        Assert.Equal("Buffet São João", fornecedor.NomeEmpresa);
        Assert.Equal("buffet sao joao", fornecedor.NomeNormalizado);
        Assert.Equal("Marta Souza", fornecedor.Responsavel);
        Assert.Equal("11987654321", fornecedor.Telefone);
        Assert.Equal("contato@saojoao.com.br", fornecedor.Email);
        Assert.Equal("https://saojoao.com.br", fornecedor.Site);
        Assert.Equal("buffet.saojoao", fornecedor.Instagram);
        Assert.Equal("Pede sinal de 30%.", fornecedor.Observacoes);
        Assert.False(fornecedor.Arquivado);
        Assert.Equal(Agora, fornecedor.CriadoEm);
        Assert.Equal(Agora, fornecedor.AtualizadoEm);
    }

    [Fact]
    public void Criar_CamposOpcionaisVazios_DeveGravarNulos()
    {
        var fornecedor = Fornecedor.Criar(Dados(responsavel: " ", telefone: "", email: " ", site: "", instagram: " ", observacoes: "   "), Agora);

        Assert.Null(fornecedor.Responsavel);
        Assert.Null(fornecedor.Telefone);
        Assert.Null(fornecedor.Email);
        Assert.Null(fornecedor.Site);
        Assert.Null(fornecedor.Instagram);
        Assert.Null(fornecedor.Observacoes);
    }

    [Theory]
    [InlineData(null, MensagensFornecedores.NomeEmpresaObrigatorio)]
    [InlineData("   ", MensagensFornecedores.NomeEmpresaObrigatorio)]
    [InlineData("A", MensagensFornecedores.TamanhoNomeEmpresa)]
    public void Criar_NomeInvalido_DeveLancarRegraNoCampoNomeEmpresa(string? nome, string mensagem)
    {
        var excecao = Assert.Throws<RegraNegocioException>(() => Fornecedor.Criar(Dados(nome), Agora));

        Assert.Equal(mensagem, excecao.Message);
        Assert.Equal(Fornecedor.CampoNomeEmpresa, excecao.Campo);
    }

    [Fact]
    public void Criar_NomeMaiorQueOLimite_DeveLancarRegra()
    {
        Assert.Throws<RegraNegocioException>(() => Fornecedor.Criar(Dados(new string('a', Fornecedor.TamanhoMaximoNomeEmpresa + 1)), Agora));
    }

    [Fact]
    public void Criar_CategoriaForaDaLista_DeveLancarRegra()
    {
        var excecao = Assert.Throws<RegraNegocioException>(() => Fornecedor.Criar(Dados(categoria: (CategoriaFornecedor)99), Agora));

        Assert.Equal(MensagensFornecedores.CategoriaInvalida, excecao.Message);
    }

    [Theory]
    [InlineData("telefone", "11 abc 98765", MensagensFornecedores.TelefoneInvalido)]
    [InlineData("email", "sem-arroba", MensagensFornecedores.EmailInvalido)]
    [InlineData("site", "javascript:alert(1)", MensagensFornecedores.SiteInvalido)]
    [InlineData("instagram", "usuario com espaco", MensagensFornecedores.InstagramInvalido)]
    [InlineData("responsavel", null, MensagensFornecedores.TamanhoResponsavel)]
    [InlineData("observacoes", null, MensagensFornecedores.TamanhoObservacoes)]
    public void Criar_CampoInvalido_DeveLancarRegraComMensagemDoCampo(string campo, string? valor, string mensagem)
    {
        var dados = campo switch
        {
            "telefone" => Dados(telefone: valor),
            "email" => Dados(email: valor),
            "site" => Dados(site: valor),
            "instagram" => Dados(instagram: valor),
            "responsavel" => Dados(responsavel: new string('r', Fornecedor.TamanhoMaximoResponsavel + 1)),
            _ => Dados(observacoes: new string('o', Fornecedor.TamanhoMaximoObservacoes + 1)),
        };

        var excecao = Assert.Throws<RegraNegocioException>(() => Fornecedor.Criar(dados, Agora));

        Assert.Equal(mensagem, excecao.Message);
    }

    [Fact]
    public void Atualizar_Arquivado_DeveLancarRegraSemAlterar()
    {
        var fornecedor = Fornecedor.Criar(Dados(), Agora);
        fornecedor.Arquivar(Agora.AddHours(1));

        var excecao = Assert.Throws<RegraNegocioException>(() => fornecedor.Atualizar(Dados("Outro nome"), Agora.AddHours(2)));

        Assert.Equal(MensagensFornecedores.ArquivadoSemEdicao, excecao.Message);
        Assert.Equal("Buffet São João", fornecedor.NomeEmpresa);
    }

    [Fact]
    public void Atualizar_Ativo_DeveTrocarDadosEAtualizadoEm()
    {
        var fornecedor = Fornecedor.Criar(Dados(), Agora);

        fornecedor.Atualizar(Dados("Doce Encanto", CategoriaFornecedor.BoloDoces), Agora.AddDays(1));

        Assert.Equal("Doce Encanto", fornecedor.NomeEmpresa);
        Assert.Equal("doce encanto", fornecedor.NomeNormalizado);
        Assert.Equal(CategoriaFornecedor.BoloDoces, fornecedor.Categoria);
        Assert.Equal(Agora, fornecedor.CriadoEm);
        Assert.Equal(Agora.AddDays(1), fornecedor.AtualizadoEm);
    }

    [Fact]
    public void ArquivarERestaurar_DevemSerIdempotentes()
    {
        var fornecedor = Fornecedor.Criar(Dados(), Agora);

        fornecedor.Arquivar(Agora.AddHours(1));
        fornecedor.Arquivar(Agora.AddHours(2));
        Assert.True(fornecedor.Arquivado);
        Assert.Equal(Agora.AddHours(1), fornecedor.ArquivadoEm);

        fornecedor.Restaurar(Agora.AddHours(3));
        fornecedor.Restaurar(Agora.AddHours(4));
        Assert.False(fornecedor.Arquivado);
        Assert.Null(fornecedor.ArquivadoEm);
        Assert.Equal(Agora.AddHours(3), fornecedor.AtualizadoEm);
    }

    [Theory]
    [InlineData("Buffet São João", "buffet sao joao")]
    [InlineData("  BUFFET   sao   JOÃO ", "buffet sao joao")]
    [InlineData("Fotografia Ângela Lima", "fotografia angela lima")]
    public void ChaveNome_DeveIgnorarAcentosMaiusculasEEspacos(string nome, string esperado)
    {
        Assert.Equal(esperado, Fornecedor.ChaveNome(nome));
        Assert.Equal(esperado, NormalizadorTexto.ChaveComparacao(nome));
    }

    [Theory]
    [InlineData("saojoao.com.br", "https://saojoao.com.br")]
    [InlineData("http://saojoao.com.br/cardapio", "http://saojoao.com.br/cardapio")]
    [InlineData("https://www.saojoao.com.br", "https://www.saojoao.com.br")]
    [InlineData("saojoao.com.br:8080/menu", "https://saojoao.com.br:8080/menu")]
    public void TentarNormalizarSite_EnderecosValidos_DeveNormalizar(string entrada, string esperado)
    {
        Assert.True(NormalizadorContatoFornecedor.TentarNormalizarSite(entrada, out var normalizado));
        Assert.Equal(esperado, normalizado);
    }

    [Theory]
    [InlineData("javascript:alert(1)")]
    [InlineData("data:text/html,oi")]
    [InlineData("ftp://saojoao.com.br")]
    [InlineData("https://usuario:senha@saojoao.com.br")]
    [InlineData("https://localhost")]
    [InlineData("https://192.168.0.1")]
    [InlineData("saojoao com br")]
    [InlineData("https://.saojoao.com")]
    public void TentarNormalizarSite_EnderecosPerigososOuInvalidos_DeveRecusar(string entrada)
    {
        Assert.False(NormalizadorContatoFornecedor.TentarNormalizarSite(entrada, out var normalizado));
        Assert.Null(normalizado);
    }

    [Fact]
    public void TentarNormalizarSite_MaiorQueOLimite_DeveRecusar()
    {
        var longo = "https://saojoao.com.br/" + new string('a', NormalizadorContatoFornecedor.TamanhoMaximoSite);

        Assert.False(NormalizadorContatoFornecedor.SiteValido(longo));
    }

    [Theory]
    [InlineData("@Buffet.SaoJoao", "buffet.saojoao")]
    [InlineData("buffet_sao_joao", "buffet_sao_joao")]
    [InlineData("instagram.com/buffetsaojoao", "buffetsaojoao")]
    [InlineData("https://www.instagram.com/buffetsaojoao/?hl=pt", "buffetsaojoao")]
    public void TentarNormalizarInstagram_FormatosAceitos_DeveGravarSoOUsuario(string entrada, string esperado)
    {
        Assert.True(NormalizadorContatoFornecedor.TentarNormalizarInstagram(entrada, out var normalizado));
        Assert.Equal(esperado, normalizado);
    }

    [Theory]
    [InlineData("usuario com espaco")]
    [InlineData("@usuário")]
    [InlineData("https://instagram.com/a/b")]
    [InlineData("https://exemplo.com/buffet")]
    [InlineData("<script>")]
    [InlineData("abcdefghijklmnopqrstuvwxyz12345")]
    public void TentarNormalizarInstagram_Invalido_DeveRecusar(string entrada)
    {
        Assert.False(NormalizadorContatoFornecedor.InstagramValido(entrada));
    }

    [Fact]
    public void SalvarFornecedorRequest_Valido_NaoDeveTerErros()
    {
        Assert.Empty(Validar(new SalvarFornecedorRequest(CategoriaFornecedor.Buffet, "Buffet Oliveira", null, "(11) 98765-4321", "a@b.com", "oliveira.com.br", "@oliveira", null)));
    }

    [Fact]
    public void SalvarFornecedorRequest_Invalido_DeveApontarCadaCampo()
    {
        var erros = Validar(new SalvarFornecedorRequest(CategoriaFornecedor.Buffet, "A", null, "abc", "sem-arroba", "javascript:alert(1)", "com espaco", null));

        var campos = erros.SelectMany(erro => erro.MemberNames).ToHashSet();
        Assert.Contains(nameof(SalvarFornecedorRequest.NomeEmpresa), campos);
        Assert.Contains(nameof(SalvarFornecedorRequest.Telefone), campos);
        Assert.Contains(nameof(SalvarFornecedorRequest.Email), campos);
        Assert.Contains(nameof(SalvarFornecedorRequest.Site), campos);
        Assert.Contains(nameof(SalvarFornecedorRequest.Instagram), campos);
    }

    [Fact]
    public void SalvarFornecedorRequest_CategoriaInexistente_DeveApontarCategoria()
    {
        var erros = Validar(new SalvarFornecedorRequest((CategoriaFornecedor)42, "Buffet Oliveira", null, null, null, null, null, null));

        Assert.Contains(erros, erro => erro.MemberNames.Contains(nameof(SalvarFornecedorRequest.Categoria)));
    }

    [Fact]
    public void ExcecaoGlobalHandler_RegraComCampo_DeveIncluirExtensaoCampo()
    {
        var handler = new ExcecaoGlobalHandler(new ServicoProblemDetailsNulo(), new HostingEnvironment { EnvironmentName = Environments.Production }, NullLogger<ExcecaoGlobalHandler>.Instance);

        var comCampo = handler.CriarDetalhesProblema(new RegraNegocioException(MensagensFornecedores.NomeRepetido, Fornecedor.CampoNomeEmpresa));
        var semCampo = handler.CriarDetalhesProblema(new RegraNegocioException(MensagensFornecedores.LimiteFornecedores));

        Assert.Equal(StatusCodes.Status422UnprocessableEntity, comCampo.Status);
        Assert.Equal(MensagensFornecedores.NomeRepetido, comCampo.Detail);
        Assert.Equal("nomeEmpresa", comCampo.Extensions[ExcecaoGlobalHandler.ExtensaoCampo]);
        Assert.False(semCampo.Extensions.ContainsKey(ExcecaoGlobalHandler.ExtensaoCampo));
    }

    private static List<ValidationResult> Validar(SalvarFornecedorRequest request)
    {
        var resultados = new List<ValidationResult>();
        Validator.TryValidateObject(request, new ValidationContext(request), resultados, validateAllProperties: true);
        return resultados;
    }

    private sealed class ServicoProblemDetailsNulo : IProblemDetailsService
    {
        public ValueTask WriteAsync(ProblemDetailsContext context)
        {
            return ValueTask.CompletedTask;
        }
    }
}

public class FornecedorServiceTestes
{
    private static readonly DateTimeOffset Agora = new(2026, 9, 30, 12, 0, 0, TimeSpan.Zero);

    private readonly RepositorioFornecedoresMemoria _repositorio = new();
    private readonly RepositorioVinculosFornecedorMemoria _vinculos = new();
    private readonly UnidadeTrabalhoContador _unidade = new();
    private readonly FornecedorService _service;

    public FornecedorServiceTestes()
    {
        _service = new FornecedorService(_repositorio, _vinculos, _unidade, new RelogioFixo(Agora));
    }

    private static SalvarFornecedorRequest Request(
        string nome = "Buffet São João",
        CategoriaFornecedor categoria = CategoriaFornecedor.Buffet,
        string? telefone = "(11) 98765-4321")
    {
        return new SalvarFornecedorRequest(categoria, nome, "Marta", telefone, null, null, null, "Interno");
    }

    [Fact]
    public async Task Criar_DeveGravarERetornarDtoSemDadosInternosDeIsolamento()
    {
        var dto = await _service.CriarAsync(Request(), CancellationToken.None);

        Assert.Equal("Buffet", dto.Categoria);
        Assert.Equal("11987654321", dto.Telefone);
        Assert.Equal("Interno", dto.Observacoes);
        Assert.False(dto.Arquivado);
        Assert.Single(_repositorio.Itens);
        Assert.Equal(1, _unidade.Salvamentos);
        Assert.DoesNotContain(typeof(FornecedorDto).GetProperties(), propriedade => propriedade.Name is "OrganizacaoId" or "NomeNormalizado");
        Assert.DoesNotContain(typeof(FornecedorResumoDto).GetProperties(), propriedade => propriedade.Name is "OrganizacaoId" or "NomeNormalizado" or "Observacoes");
    }

    [Fact]
    public async Task Criar_NomeRepetidoNaMesmaCategoria_DeveLancarRegraNoCampo()
    {
        await _service.CriarAsync(Request(), CancellationToken.None);

        var excecao = await Assert.ThrowsAsync<RegraNegocioException>(() => _service.CriarAsync(Request("  buffet SAO   joao"), CancellationToken.None));

        Assert.Equal(MensagensFornecedores.NomeRepetido, excecao.Message);
        Assert.Equal(Fornecedor.CampoNomeEmpresa, excecao.Campo);
        Assert.Single(_repositorio.Itens);
    }

    [Fact]
    public async Task Criar_NomeRepetidoDeArquivado_DeveOrientarRestaurar()
    {
        var existente = await _service.CriarAsync(Request(), CancellationToken.None);
        await _service.ArquivarAsync(existente.Id, CancellationToken.None);

        var excecao = await Assert.ThrowsAsync<RegraNegocioException>(() => _service.CriarAsync(Request(), CancellationToken.None));

        Assert.Equal(MensagensFornecedores.NomeRepetidoArquivado, excecao.Message);
    }

    [Fact]
    public async Task Criar_MesmoNomeEmOutraCategoria_DevePermitir()
    {
        await _service.CriarAsync(Request("Doce Encanto", CategoriaFornecedor.BoloDoces), CancellationToken.None);

        await _service.CriarAsync(Request("Doce Encanto", CategoriaFornecedor.ConvitesPapelaria), CancellationToken.None);

        Assert.Equal(2, _repositorio.Itens.Count);
    }

    [Fact]
    public async Task Criar_NoLimiteDaOrganizacao_DeveLancarRegra()
    {
        _repositorio.QuantidadeSimulada = Fornecedor.LimitePorOrganizacao;

        var excecao = await Assert.ThrowsAsync<RegraNegocioException>(() => _service.CriarAsync(Request(), CancellationToken.None));

        Assert.Equal(MensagensFornecedores.LimiteFornecedores, excecao.Message);
        Assert.Empty(_repositorio.Itens);
    }

    [Fact]
    public async Task Atualizar_ParaNomeDeOutroFornecedor_DeveLancarRegra()
    {
        await _service.CriarAsync(Request("Buffet Oliveira"), CancellationToken.None);
        var segundo = await _service.CriarAsync(Request("Buffet São João"), CancellationToken.None);

        await Assert.ThrowsAsync<RegraNegocioException>(() => _service.AtualizarAsync(segundo.Id, Request("buffet oliveira"), CancellationToken.None));
    }

    [Fact]
    public async Task Atualizar_MantendoOProprioNome_DevePermitir()
    {
        var criado = await _service.CriarAsync(Request(), CancellationToken.None);

        var atualizado = await _service.AtualizarAsync(criado.Id, Request("BUFFET SÃO JOÃO", telefone: null), CancellationToken.None);

        Assert.Equal("BUFFET SÃO JOÃO", atualizado.NomeEmpresa);
        Assert.Null(atualizado.Telefone);
    }

    [Fact]
    public async Task Atualizar_Arquivado_DeveLancarRegra()
    {
        var criado = await _service.CriarAsync(Request(), CancellationToken.None);
        await _service.ArquivarAsync(criado.Id, CancellationToken.None);

        var excecao = await Assert.ThrowsAsync<RegraNegocioException>(() => _service.AtualizarAsync(criado.Id, Request("Outro"), CancellationToken.None));

        Assert.Equal(MensagensFornecedores.ArquivadoSemEdicao, excecao.Message);
    }

    [Fact]
    public async Task OperacoesComIdInexistente_DevemLancarNaoEncontrado()
    {
        var id = Guid.NewGuid();

        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() => _service.ObterAsync(id, CancellationToken.None));
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() => _service.AtualizarAsync(id, Request(), CancellationToken.None));
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() => _service.ArquivarAsync(id, CancellationToken.None));
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() => _service.RestaurarAsync(id, CancellationToken.None));
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() => _service.RemoverAsync(id, CancellationToken.None));
        Assert.Equal(0, _unidade.Salvamentos);
    }

    [Fact]
    public async Task Listar_DeveOrdenarPorNomeEIncluirArquivados()
    {
        await _service.CriarAsync(Request("Fotografia Ângela", CategoriaFornecedor.Fotografia), CancellationToken.None);
        var arquivado = await _service.CriarAsync(Request("Buffet Oliveira"), CancellationToken.None);
        await _service.CriarAsync(Request("Casa Aurora", CategoriaFornecedor.EspacoLocal), CancellationToken.None);
        await _service.ArquivarAsync(arquivado.Id, CancellationToken.None);

        var lista = await _service.ListarAsync(CancellationToken.None);

        Assert.Equal(["Buffet Oliveira", "Casa Aurora", "Fotografia Ângela"], lista.Select(item => item.NomeEmpresa));
        Assert.True(lista[0].Arquivado);
    }

    [Fact]
    public async Task Remover_DeveExcluir()
    {
        var criado = await _service.CriarAsync(Request(), CancellationToken.None);

        await _service.RemoverAsync(criado.Id, CancellationToken.None);

        Assert.Empty(_repositorio.Itens);
    }

    [Fact]
    public async Task Remover_ComParticipacaoEmEvento_DeveLancarSugerindoArquivar()
    {
        var criado = await _service.CriarAsync(Request(), CancellationToken.None);
        _vinculos.Itens.Add(FornecedorEvento.Criar(
            Guid.NewGuid(),
            criado.Id,
            new DadosFornecedorEvento(null, null, null, StatusFornecedorEvento.Cancelado, null),
            null,
            Agora));

        var excecao = await Assert.ThrowsAsync<RegraNegocioException>(() => _service.RemoverAsync(criado.Id, CancellationToken.None));

        Assert.Equal(MensagensFornecedores.ParticipouDeEventos, excecao.Message);
        Assert.Single(_repositorio.Itens);
        Assert.Equal(1, _unidade.Salvamentos);
    }

    [Fact]
    public async Task ListarParticipacoes_FornecedorInexistente_DeveLancar404()
    {
        await Assert.ThrowsAsync<RecursoNaoEncontradoException>(() => _service.ListarParticipacoesAsync(Guid.NewGuid(), CancellationToken.None));
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

    private sealed class RepositorioFornecedoresMemoria : IFornecedorRepository
    {
        public List<Fornecedor> Itens { get; } = [];

        public int? QuantidadeSimulada { get; set; }

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
            return Task.FromResult(QuantidadeSimulada ?? Itens.Count);
        }

        public Task<Fornecedor?> BuscarPorChaveAsync(
            CategoriaFornecedor categoria,
            string nomeNormalizado,
            Guid? ignorarFornecedorId,
            CancellationToken cancelamento)
        {
            return Task.FromResult(Itens.FirstOrDefault(item =>
                item.Categoria == categoria && item.NomeNormalizado == nomeNormalizado && item.Id != ignorarFornecedorId));
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
}
