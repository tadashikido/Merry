using Casamento.Aplicacao.Autenticacao;
using Casamento.Dominio.AcessosCasal;
using Casamento.Dominio.Checklists;
using Casamento.Dominio.Cronogramas;
using Casamento.Dominio.Financeiro;
using Casamento.Dominio.Fornecedores;
using Casamento.Dominio.Mesas;
using Casamento.Dominio.Rsvp;
using Casamento.Aplicacao.Persistencia;
using Casamento.Dominio.Excecoes;
using Casamento.Infraestrutura.Persistencia.Configuracoes;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Casamento.Infraestrutura.Persistencia.Repositorios;

public class UnidadeTrabalho : IUnidadeTrabalho
{
    public const string CodigoViolacaoUnicidade = "23505";
    public const string CodigoViolacaoChaveEstrangeira = "23503";
    public const string CodigoImpasse = "40P01";
    public const string CodigoViolacaoRestricao = "23514";
    public const string MensagemConcorrencia = "O registro foi alterado por outra operação.";

    private readonly CasamentoDbContext _contexto;

    public UnidadeTrabalho(CasamentoDbContext contexto)
    {
        _contexto = contexto;
    }

    public void DescartarAlteracoes()
    {
        _contexto.ChangeTracker.Clear();
    }

    public async Task SalvarAsync(CancellationToken cancelamento)
    {
        try
        {
            await _contexto.SaveChangesAsync(cancelamento);
        }
        catch (DbUpdateConcurrencyException excecao)
        {
            throw new ConcorrenciaException(MensagemConcorrencia, excecao);
        }
        catch (InvalidOperationException excecao) when (excecao.InnerException is DbUpdateException
        {
            InnerException: PostgresException { SqlState: CodigoImpasse },
        })
        {
            throw new ConcorrenciaException(MensagemConcorrencia, excecao);
        }
        catch (DbUpdateException excecao) when (excecao.InnerException is PostgresException { SqlState: CodigoImpasse })
        {
            throw new ConcorrenciaException(MensagemConcorrencia, excecao);
        }
        catch (DbUpdateException excecao) when (excecao.InnerException is PostgresException
        {
            SqlState: CodigoViolacaoUnicidade,
            ConstraintName: MesaConfiguration.IndiceNumeroUnico,
        })
        {
            throw new RegraNegocioException(MensagensMesas.NumeroRepetido, Mesa.CampoNumero);
        }
        catch (DbUpdateException excecao) when (excecao.InnerException is PostgresException
        {
            SqlState: CodigoViolacaoUnicidade,
            ConstraintName: MesaConfiguration.IndiceEspecialUnica,
        })
        {
            throw new RegraNegocioException(MensagensMesas.EspecialRepetida, Mesa.CampoEspecial);
        }
        catch (DbUpdateException excecao) when (excecao.InnerException is PostgresException
        {
            SqlState: CodigoViolacaoRestricao,
            ConstraintName: ConvidadoConfiguration.RestricaoMesaSomenteConfirmado,
        })
        {
            throw new ConcorrenciaException(MensagensMesas.MesaAlteradaEmParalelo, excecao);
        }
        catch (DbUpdateException excecao) when (excecao.InnerException is PostgresException
        {
            SqlState: CodigoViolacaoChaveEstrangeira,
            ConstraintName: ConvidadoConfiguration.ChaveEstrangeiraMesa,
        })
        {
            throw new ConcorrenciaException(MensagensMesas.MesaAlteradaEmParalelo, excecao);
        }
        catch (DbUpdateException excecao) when (excecao.InnerException is PostgresException
        {
            SqlState: CodigoViolacaoUnicidade,
            ConstraintName: UsuarioConfiguration.IndiceEmailUnico,
        })
        {
            throw new ConflitoException(MensagensAutenticacao.EmailEmUso);
        }
        catch (DbUpdateException excecao) when (excecao.InnerException is PostgresException
        {
            SqlState: CodigoViolacaoUnicidade,
            ConstraintName: AcessoRsvpConfiguration.IndiceConvite or AcessoRsvpConfiguration.IndiceTokenHash,
        })
        {
            throw new ConcorrenciaException(MensagensRsvp.LinkGeradoEmParalelo, excecao);
        }
        catch (DbUpdateException excecao) when (excecao.InnerException is PostgresException
        {
            SqlState: CodigoViolacaoUnicidade,
            ConstraintName: AcessoCronogramaConfiguration.IndiceDestino or AcessoCronogramaConfiguration.IndiceTokenHash,
        })
        {
            throw new ConcorrenciaException(MensagensAcessoCronograma.LinkGeradoEmParalelo, excecao);
        }
        catch (DbUpdateException excecao) when (excecao.InnerException is PostgresException
        {
            SqlState: CodigoViolacaoUnicidade,
            ConstraintName: AcessoCasalConfiguration.IndiceEmailNaoRevogado,
        })
        {
            throw new RegraNegocioException(MensagensAcessoCasal.EmailJaConvidado);
        }
        catch (DbUpdateException excecao) when (excecao.InnerException is PostgresException
        {
            SqlState: CodigoViolacaoUnicidade,
            ConstraintName: TarefaCasamentoConfiguration.IndiceOrigemModeloUnica,
        })
        {
            throw new ConcorrenciaException(MensagensChecklist.AplicacaoConcorrente, excecao);
        }
        catch (DbUpdateException excecao) when (excecao.InnerException is PostgresException
        {
            SqlState: CodigoViolacaoUnicidade,
            ConstraintName: ItemCronogramaConfiguration.IndiceOrigemModeloUnica,
        })
        {
            throw new ConcorrenciaException(MensagensModeloCronograma.AplicacaoConcorrente, excecao);
        }
        catch (DbUpdateException excecao) when (excecao.InnerException is PostgresException
        {
            SqlState: CodigoViolacaoUnicidade,
            ConstraintName: FornecedorConfiguration.IndiceNomeUnico,
        })
        {
            throw new RegraNegocioException(MensagensFornecedores.NomeRepetido, Fornecedor.CampoNomeEmpresa);
        }
        catch (DbUpdateException excecao) when (excecao.InnerException is PostgresException
        {
            SqlState: CodigoViolacaoUnicidade,
            ConstraintName: FornecedorCasamentoConfiguration.IndiceFornecedorUnico,
        })
        {
            throw new RegraNegocioException(MensagensFornecedoresCasamento.JaVinculado, FornecedorCasamento.CampoFornecedorId);
        }
        catch (DbUpdateException excecao) when (excecao.InnerException is PostgresException
        {
            SqlState: CodigoViolacaoChaveEstrangeira,
            ConstraintName: FornecedorCasamentoConfiguration.ChaveEstrangeiraFornecedor,
        })
        {
            throw new RegraNegocioException(MensagensFornecedores.ParticipouDeCasamentos);
        }
        catch (DbUpdateException excecao) when (excecao.InnerException is PostgresException
        {
            SqlState: CodigoViolacaoChaveEstrangeira,
            ConstraintName: ParcelaFornecedorConfiguration.ChaveEstrangeiraVinculo,
        })
        {
            throw new RegraNegocioException(MensagensFinanceiro.VinculoComParcelas);
        }
    }
}
