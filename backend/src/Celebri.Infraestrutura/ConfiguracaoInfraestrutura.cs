using Celebri.Aplicacao.Arquivos;
using Celebri.Aplicacao.Auditoria;
using Celebri.Aplicacao.Autenticacao;
using Celebri.Aplicacao.Autenticacao.Portas;
using Celebri.Aplicacao.Calendario;
using Celebri.Aplicacao.CronogramaPublico.Portas;
using Celebri.Aplicacao.DadosSensiveis;
using Celebri.Aplicacao.DadosSensiveis.Portas;
using Celebri.Aplicacao.Email;
using Celebri.Aplicacao.Isolamento;
using Celebri.Aplicacao.Persistencia;
using Celebri.Aplicacao.Rsvp.Portas;
using Celebri.Infraestrutura.Arquivos;
using Celebri.Infraestrutura.Calendario;
using Celebri.Infraestrutura.Email;
using Celebri.Infraestrutura.Persistencia;
using Celebri.Infraestrutura.Persistencia.Auditoria;
using Celebri.Infraestrutura.Persistencia.Isolamento;
using Celebri.Infraestrutura.Persistencia.Repositorios;
using Celebri.Infraestrutura.Seguranca;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Celebri.Infraestrutura;

public static class ConfiguracaoInfraestrutura
{
    public const string NomeStringConexao = "Principal";
    public const string NomeHealthCheckBanco = "banco";
    public const string MensagemUrlFrontendInvalida =
        "A URL do frontend não foi configurada ou é inválida. Defina 'Autenticacao__UrlFrontend' com uma URL absoluta http(s), por exemplo https://app.exemplo.com.br.";
    public const string MensagemEmailInvalido =
        "O envio de e-mail não foi configurado. Defina 'Email__Remetente' e 'Email__Smtp__Host' (em desenvolvimento, o Mailpit do docker-compose).";

    public static IServiceCollection AdicionarInfraestrutura(this IServiceCollection servicos, IConfiguration configuracao)
    {
        var stringConexao = configuracao.GetConnectionString(NomeStringConexao);

        if (string.IsNullOrWhiteSpace(stringConexao))
        {
            throw new InvalidOperationException(
                $"A string de conexão 'ConnectionStrings:{NomeStringConexao}' não foi configurada. Defina a variável de ambiente 'ConnectionStrings__{NomeStringConexao}'.");
        }

        servicos.TryAddScoped<IContextoIsolamento, ContextoIsolamentoSemOrganizacao>();
        servicos.TryAddScoped<IAutorAlteracao, AutorAlteracaoAnonimo>();
        servicos.AddDbContext<CelebriDbContext>(opcoes => opcoes.ConfigurarPostgreSql(stringConexao));

        servicos.AddHealthChecks()
            .AddDbContextCheck<CelebriDbContext>(NomeHealthCheckBanco);

        servicos.AddOptions<OpcoesJwt>()
            .Bind(configuracao.GetSection(OpcoesJwt.Secao))
            .Validate(opcoes => OpcoesJwt.ChaveValida(opcoes.ChaveAssinatura), OpcoesJwt.MensagemChaveInvalida)
            .ValidateOnStart();

        servicos.AddOptions<OpcoesDadosSensiveis>()
            .Bind(configuracao.GetSection(OpcoesDadosSensiveis.Secao))
            .Validate(opcoes => OpcoesDadosSensiveis.ChaveValida(opcoes.ChaveCifragem), OpcoesDadosSensiveis.MensagemChaveInvalida)
            .ValidateOnStart();

        var secaoRetencao = configuracao.GetSection(OpcoesRetencaoDadosSensiveis.Secao);
        servicos.AddOptions<OpcoesRetencaoDadosSensiveis>()
            .Bind(secaoRetencao)
            .Configure(opcoes => AplicarChaveLegadaRetencao(opcoes, secaoRetencao))
            .Validate(opcoes => opcoes.Valida(), OpcoesRetencaoDadosSensiveis.MensagemConfiguracaoInvalida)
            .ValidateOnStart();

        servicos.AddOptions<OpcoesAutenticacao>()
            .Bind(configuracao.GetSection(OpcoesAutenticacao.Secao))
            .Validate(opcoes => UrlFrontendValida(opcoes.UrlFrontend), MensagemUrlFrontendInvalida)
            .ValidateOnStart();

        servicos.AddOptions<OpcoesEmail>()
            .Bind(configuracao.GetSection(OpcoesEmail.Secao))
            .Validate(
                opcoes => !string.IsNullOrWhiteSpace(opcoes.Remetente) && !string.IsNullOrWhiteSpace(opcoes.Smtp.Host) && opcoes.Smtp.Porta > 0,
                MensagemEmailInvalido)
            .ValidateOnStart();

        servicos.AddOptions<OpcoesArmazenamentoArquivos>()
            .Bind(configuracao.GetSection(OpcoesArmazenamentoArquivos.Secao))
            .Validate(opcoes => OpcoesArmazenamentoArquivos.DiretorioValido(opcoes.Diretorio), OpcoesArmazenamentoArquivos.MensagemDiretorioInvalido)
            .ValidateOnStart();

        servicos.TryAddSingleton(TimeProvider.System);
        servicos.AddScoped<IUsuarioRepository, UsuarioRepository>();
        servicos.AddScoped<IOrganizacaoRepository, OrganizacaoRepository>();
        servicos.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
        servicos.AddScoped<ITokenRedefinicaoSenhaRepository, TokenRedefinicaoSenhaRepository>();
        servicos.AddScoped<IEventoRepository, EventoRepository>();
        servicos.AddScoped<IDuplicacaoEventoRepository, DuplicacaoEventoRepository>();
        servicos.AddScoped<IConviteRepository, ConviteRepository>();
        servicos.AddScoped<IAcessoRsvpRepository, AcessoRsvpRepository>();
        servicos.AddScoped<IDadosSensiveisRepository, DadosSensiveisRepository>();
        servicos.AddScoped<IAcessoAnfitriaoRepository, AcessoAnfitriaoRepository>();
        servicos.AddScoped<ITokenAcessoAnfitriaoRepository, TokenAcessoAnfitriaoRepository>();
        servicos.AddScoped<ITarefaEventoRepository, TarefaEventoRepository>();
        servicos.AddScoped<IModeloChecklistRepository, ModeloChecklistRepository>();
        servicos.AddScoped<IChecklistRepository, ChecklistRepository>();
        servicos.AddScoped<IFornecedorRepository, FornecedorRepository>();
        servicos.AddScoped<IFornecedorEventoRepository, FornecedorEventoRepository>();
        servicos.AddScoped<IMesaRepository, MesaRepository>();
        servicos.AddScoped<IParcelaFornecedorRepository, ParcelaFornecedorRepository>();
        servicos.AddScoped<IItemCronogramaRepository, ItemCronogramaRepository>();
        servicos.AddScoped<IAcessoCronogramaRepository, AcessoCronogramaRepository>();
        servicos.AddScoped<IModeloCronogramaRepository, ModeloCronogramaRepository>();
        servicos.AddScoped<IAplicacaoModeloCronogramaRepository, AplicacaoModeloCronogramaRepository>();
        servicos.AddSingleton<IArmazenamentoArquivos, ArmazenamentoArquivosDisco>();
        servicos.AddScoped<IUnidadeTrabalho, UnidadeTrabalho>();
        servicos.TryAddSingleton<ICalendarioLocal, CalendarioSaoPaulo>();
        servicos.AddSingleton<IHashSenhaService, HashSenhaService>();
        servicos.AddSingleton<IGeradorTokenOpaco, GeradorTokenOpaco>();
        servicos.AddSingleton<IGeradorTokenAcesso, GeradorTokenAcessoJwt>();
        servicos.AddSingleton<ICifradorTokenRsvp, CifradorTokenRsvp>();
        servicos.AddSingleton<ICifradorTokenCronograma, CifradorTokenCronograma>();
        servicos.AddSingleton<ICifradorDadosSensiveis, CifradorDadosSensiveis>();
        servicos.AddScoped<IEnvioEmailService, EnvioEmailSmtpService>();

        return servicos;
    }

    public static bool UrlFrontendValida(string? url)
    {
        return Uri.TryCreate(url, UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp)
            && string.IsNullOrEmpty(uri.Query)
            && string.IsNullOrEmpty(uri.Fragment);
    }

    public static void AplicarChaveLegadaRetencao(OpcoesRetencaoDadosSensiveis opcoes, IConfigurationSection secao)
    {
        if (secao[nameof(OpcoesRetencaoDadosSensiveis.DiasAposEvento)] is not null)
        {
            return;
        }

        if (int.TryParse(secao[OpcoesRetencaoDadosSensiveis.ChaveLegadaDiasAposEvento], out var dias))
        {
            opcoes.DiasAposEvento = dias;
        }
    }
}
