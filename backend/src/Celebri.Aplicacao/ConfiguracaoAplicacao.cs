using Celebri.Aplicacao.AcessosCasal;
using Celebri.Aplicacao.Auditoria;
using Celebri.Aplicacao.Autenticacao;
using Celebri.Aplicacao.Casamentos;
using Celebri.Aplicacao.Checklists;
using Celebri.Aplicacao.Confirmacoes;
using Celebri.Aplicacao.Convidados;
using Celebri.Aplicacao.Convidados.Importacao;
using Celebri.Aplicacao.CronogramaPublico;
using Celebri.Aplicacao.Cronogramas;
using Celebri.Aplicacao.DadosSensiveis;
using Celebri.Aplicacao.Financeiro;
using Celebri.Aplicacao.Fornecedores;
using Celebri.Aplicacao.FornecedoresCasamento;
using Celebri.Aplicacao.GrandeDia;
using Celebri.Aplicacao.Isolamento;
using Celebri.Aplicacao.Mesas;
using Celebri.Aplicacao.ModelosCronograma;
using Celebri.Aplicacao.Rsvp;
using Celebri.Aplicacao.Sistema;
using Celebri.Aplicacao.Tarefas;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Celebri.Aplicacao;

public static class ConfiguracaoAplicacao
{
    public static IServiceCollection AdicionarAplicacao(this IServiceCollection servicos)
    {
        servicos.AddSingleton<IInformacoesSistemaService, InformacoesSistemaService>();
        servicos.TryAddSingleton(TimeProvider.System);
        servicos.AddScoped<IAutenticacaoService, AutenticacaoService>();
        servicos.AddScoped<IRecuperacaoSenhaService, RecuperacaoSenhaService>();
        servicos.AddScoped<ContextoIsolamentoUsuarioAtual>();
        servicos.AddScoped<EscopoIsolamentoRsvp>();
        servicos.AddScoped<EscopoIsolamentoAcessoCasal>();
        servicos.AddScoped<EscopoIsolamentoSistema>();
        servicos.AddScoped<EscopoIsolamentoCronogramaPublico>();
        servicos.AddScoped<IContextoIsolamento, ContextoIsolamentoRequisicao>();
        servicos.AddScoped<ICasamentoService, CasamentoService>();
        servicos.AddScoped<IDuplicacaoCasamentoService, DuplicacaoCasamentoService>();
        servicos.AddScoped<IProximosPassosCasamentoService, ProximosPassosCasamentoService>();
        servicos.AddScoped<IConviteService, ConviteService>();
        servicos.AddScoped<IImportacaoConvidadosService, ImportacaoConvidadosService>();
        servicos.AddScoped<ILinkRsvpService, LinkRsvpService>();
        servicos.AddScoped<IRsvpPublicoService, RsvpPublicoService>();
        servicos.AddSingleton<CifragemRestricaoAlimentar>();
        servicos.AddScoped<IRestricaoAlimentarService, RestricaoAlimentarService>();
        servicos.AddScoped<IPainelConfirmacoesService, PainelConfirmacoesService>();
        servicos.AddScoped<ICobrancaRsvpService, CobrancaRsvpService>();
        servicos.AddScoped<IAcessoCasalService, AcessoCasalService>();
        servicos.AddScoped<ITarefaCasamentoService, TarefaCasamentoService>();
        servicos.AddScoped<IModeloChecklistService, ModeloChecklistService>();
        servicos.AddScoped<IChecklistCasamentoService, ChecklistCasamentoService>();
        servicos.AddScoped<IFornecedorService, FornecedorService>();
        servicos.AddScoped<IFornecedorCasamentoService, FornecedorCasamentoService>();
        servicos.AddScoped<IMesaService, MesaService>();
        servicos.AddScoped<IParcelaFornecedorService, ParcelaFornecedorService>();
        servicos.AddScoped<ICronogramaService, CronogramaService>();
        servicos.AddScoped<ICronogramaPublicoService, CronogramaPublicoService>();
        servicos.AddScoped<IGrandeDiaService, GrandeDiaService>();
        servicos.AddScoped<ILinkCronogramaService, LinkCronogramaService>();
        servicos.AddScoped<IModeloCronogramaService, ModeloCronogramaService>();
        servicos.AddScoped<IAplicacaoModeloCronogramaService, AplicacaoModeloCronogramaService>();
        servicos.AddScoped<IAutorAlteracao, AutorAlteracaoUsuarioAtual>();
        servicos.AddSingleton<IExecutorRetencaoDadosSensiveis, ExecutorRetencaoDadosSensiveis>();
        return servicos;
    }
}
