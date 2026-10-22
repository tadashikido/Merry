using Celebri.Aplicacao.Autenticacao;
using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.AcessosAnfitriao;
using Celebri.Dominio.Checklists;
using Celebri.Dominio.Cronogramas;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Financeiro;
using Celebri.Dominio.Fornecedores;
using Celebri.Dominio.Mesas;
using Celebri.Dominio.Rsvp;
using Celebri.Infraestrutura.Persistencia.Configuracoes;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Celebri.Infraestrutura.Persistencia.Repositorios;

public class UnidadeTrabalho : IUnidadeTrabalho
{
    public const string CodigoViolacaoUnicidade = "23505";
    public const string CodigoViolacaoChaveEstrangeira = "23503";
    public const string CodigoImpasse = "40P01";
    public const string CodigoViolacaoRestricao = "23514";
    public const string MensagemConcorrencia = "O registro foi alterado por outra operação.";

    private readonly CelebriDbContext _contexto;

    public UnidadeTrabalho(CelebriDbContext contexto)
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
            ConstraintName: AcessoAnfitriaoConfiguration.IndiceEmailNaoRevogado,
        })
        {
            throw new RegraNegocioException(MensagensAcessoAnfitriao.EmailJaConvidado);
        }
        catch (DbUpdateException excecao) when (excecao.InnerException is PostgresException
        {
            SqlState: CodigoViolacaoUnicidade,
            ConstraintName: TarefaEventoConfiguration.IndiceOrigemModeloUnica,
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
            ConstraintName: FornecedorEventoConfiguration.IndiceFornecedorUnico,
        })
        {
            throw new RegraNegocioException(MensagensFornecedoresEvento.JaVinculado, FornecedorEvento.CampoFornecedorId);
        }
        catch (DbUpdateException excecao) when (excecao.InnerException is PostgresException
        {
            SqlState: CodigoViolacaoChaveEstrangeira,
            ConstraintName: FornecedorEventoConfiguration.ChaveEstrangeiraFornecedor,
        })
        {
            throw new RegraNegocioException(MensagensFornecedores.ParticipouDeEventos);
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
