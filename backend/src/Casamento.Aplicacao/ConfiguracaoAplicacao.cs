using Casamento.Aplicacao.AcessosCasal;
using Casamento.Aplicacao.Auditoria;
using Casamento.Aplicacao.Autenticacao;
using Casamento.Aplicacao.Casamentos;
using Casamento.Aplicacao.Confirmacoes;
using Casamento.Aplicacao.CronogramaPublico;
using Casamento.Aplicacao.Cronogramas;
using Casamento.Aplicacao.GrandeDia;
using Casamento.Aplicacao.Convidados;
using Casamento.Aplicacao.Convidados.Importacao;
using Casamento.Aplicacao.DadosSensiveis;
using Casamento.Aplicacao.Financeiro;
using Casamento.Aplicacao.Isolamento;
using Casamento.Aplicacao.Mesas;
using Casamento.Aplicacao.Rsvp;
using Casamento.Aplicacao.Sistema;
using Casamento.Aplicacao.Checklists;
using Casamento.Aplicacao.ModelosCronograma;
using Casamento.Aplicacao.Fornecedores;
using Casamento.Aplicacao.FornecedoresCasamento;
using Casamento.Aplicacao.Tarefas;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Casamento.Aplicacao;

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
        servicos.AddScoped<IConviteService, ConviteService>();
        servicos.AddScoped<IImportacaoConvidadosService, ImportacaoConvidadosService>();
        servicos.AddScoped<ILinkRsvpService, LinkRsvpService>();
        servicos.AddScoped<IRsvpPublicoService, RsvpPublicoService>();
        servicos.AddSingleton<CifragemRestricaoAlimentar>();
        servicos.AddScoped<IRestricaoAlimentarService, RestricaoAlimentarService>();
        servicos.AddScoped<IPainelConfirmacoesService, PainelConfirmacoesService>();
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
