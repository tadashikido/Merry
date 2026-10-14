using Casamento.Aplicacao.Arquivos;
using Casamento.Aplicacao.Auditoria;
using Casamento.Aplicacao.Autenticacao;
using Casamento.Aplicacao.Autenticacao.Portas;
using Casamento.Aplicacao.Calendario;
using Casamento.Aplicacao.DadosSensiveis;
using Casamento.Aplicacao.DadosSensiveis.Portas;
using Casamento.Aplicacao.Email;
using Casamento.Aplicacao.Isolamento;
using Casamento.Aplicacao.Persistencia;
using Casamento.Aplicacao.CronogramaPublico.Portas;
using Casamento.Aplicacao.Rsvp.Portas;
using Casamento.Infraestrutura.Arquivos;
using Casamento.Infraestrutura.Calendario;
using Casamento.Infraestrutura.Email;
using Casamento.Infraestrutura.Persistencia;
using Casamento.Infraestrutura.Persistencia.Auditoria;
using Casamento.Infraestrutura.Persistencia.Isolamento;
using Casamento.Infraestrutura.Persistencia.Repositorios;
using Casamento.Infraestrutura.Seguranca;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Casamento.Infraestrutura;

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
        servicos.AddDbContext<CasamentoDbContext>(opcoes => opcoes.ConfigurarPostgreSql(stringConexao));

        servicos.AddHealthChecks()
            .AddDbContextCheck<CasamentoDbContext>(NomeHealthCheckBanco);

        servicos.AddOptions<OpcoesJwt>()
            .Bind(configuracao.GetSection(OpcoesJwt.Secao))
            .Validate(opcoes => OpcoesJwt.ChaveValida(opcoes.ChaveAssinatura), OpcoesJwt.MensagemChaveInvalida)
            .ValidateOnStart();

        servicos.AddOptions<OpcoesDadosSensiveis>()
            .Bind(configuracao.GetSection(OpcoesDadosSensiveis.Secao))
            .Validate(opcoes => OpcoesDadosSensiveis.ChaveValida(opcoes.ChaveCifragem), OpcoesDadosSensiveis.MensagemChaveInvalida)
            .ValidateOnStart();

        servicos.AddOptions<OpcoesRetencaoDadosSensiveis>()
            .Bind(configuracao.GetSection(OpcoesRetencaoDadosSensiveis.Secao))
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
        servicos.AddScoped<ICasamentoRepository, CasamentoRepository>();
        servicos.AddScoped<IDuplicacaoCasamentoRepository, DuplicacaoCasamentoRepository>();
        servicos.AddScoped<IConviteRepository, ConviteRepository>();
        servicos.AddScoped<IAcessoRsvpRepository, AcessoRsvpRepository>();
        servicos.AddScoped<IDadosSensiveisRepository, DadosSensiveisRepository>();
        servicos.AddScoped<IAcessoCasalRepository, AcessoCasalRepository>();
        servicos.AddScoped<ITokenAcessoCasalRepository, TokenAcessoCasalRepository>();
        servicos.AddScoped<ITarefaCasamentoRepository, TarefaCasamentoRepository>();
        servicos.AddScoped<IModeloChecklistRepository, ModeloChecklistRepository>();
        servicos.AddScoped<IChecklistRepository, ChecklistRepository>();
        servicos.AddScoped<IFornecedorRepository, FornecedorRepository>();
        servicos.AddScoped<IFornecedorCasamentoRepository, FornecedorCasamentoRepository>();
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
}
