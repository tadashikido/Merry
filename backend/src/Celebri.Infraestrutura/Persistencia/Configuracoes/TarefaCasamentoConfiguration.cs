using Celebri.Dominio.Casamentos;
using Celebri.Dominio.Checklists;
using Celebri.Dominio.Organizacoes;
using Celebri.Dominio.Tarefas;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Celebri.Infraestrutura.Persistencia.Configuracoes;

public class TarefaCasamentoConfiguration : IEntityTypeConfiguration<TarefaCasamento>
{
    public const string Tabela = "tarefas_casamento";
    public const string IndiceOrganizacaoCasamento = "ix_tarefas_casamento_organizacao_id_casamento_id";
    public const string IndiceOrganizacaoStatusPrazo = "ix_tarefas_casamento_organizacao_id_status_prazo";
    public const string IndiceOrigemModeloUnica = "ux_tarefas_casamento_casamento_id_origem_modelo_item_id";
    public const string RestricaoStatus = "ck_tarefas_casamento_status";
    public const string RestricaoResponsavel = "ck_tarefas_casamento_responsavel";
    public const string RestricaoCategoria = "ck_tarefas_casamento_categoria";
    public const string RestricaoConcluidaPor = "ck_tarefas_casamento_concluida_por";
    public const string RestricaoConclusao = "ck_tarefas_casamento_conclusao";

    public void Configure(EntityTypeBuilder<TarefaCasamento> builder)
    {
        builder.ToTable(Tabela, tabela =>
        {
            tabela.HasCheckConstraint(RestricaoStatus, $"status IN ({ConviteConfiguration.ValoresPermitidos<StatusTarefa>()})");
            tabela.HasCheckConstraint(RestricaoResponsavel, $"responsavel IN ({ConviteConfiguration.ValoresPermitidos<ResponsavelTarefa>()})");
            tabela.HasCheckConstraint(RestricaoCategoria, $"categoria IN ({ConviteConfiguration.ValoresPermitidos<CategoriaTarefa>()})");
            tabela.HasCheckConstraint(
                RestricaoConcluidaPor,
                $"concluida_por IS NULL OR concluida_por IN ({ConviteConfiguration.ValoresPermitidos<ResponsavelTarefa>()})");
            tabela.HasCheckConstraint(
                RestricaoConclusao,
                $"(status = '{nameof(StatusTarefa.Concluida)}') = (concluida_em IS NOT NULL AND concluida_por IS NOT NULL)");
        });

        builder.HasKey(tarefa => tarefa.Id);
        builder.Property(tarefa => tarefa.Id).ValueGeneratedNever();
        builder.Property(tarefa => tarefa.CasamentoId).IsRequired();
        builder.Property(tarefa => tarefa.Titulo).HasMaxLength(TarefaCasamento.TamanhoMaximoTitulo).IsRequired();
        builder.Property(tarefa => tarefa.Descricao).HasMaxLength(TarefaCasamento.TamanhoMaximoDescricao);
        builder.Property(tarefa => tarefa.Responsavel)
            .HasConversion<string>()
            .HasMaxLength(ConviteConfiguration.TamanhoMaximoEnum)
            .IsRequired();
        builder.Property(tarefa => tarefa.Categoria)
            .HasConversion<string>()
            .HasMaxLength(ConviteConfiguration.TamanhoMaximoEnum)
            .IsRequired();
        builder.Property(tarefa => tarefa.Status)
            .HasConversion<string>()
            .HasMaxLength(ConviteConfiguration.TamanhoMaximoEnum)
            .IsRequired();
        builder.Property(tarefa => tarefa.Prazo);
        builder.Property(tarefa => tarefa.ConcluidaEm);
        builder.Property(tarefa => tarefa.ConcluidaPor)
            .HasConversion<string>()
            .HasMaxLength(ConviteConfiguration.TamanhoMaximoEnum);
        builder.Property(tarefa => tarefa.ConcluidaPorUsuarioId);
        builder.Property(tarefa => tarefa.OrigemModeloItemId);
        builder.Property(tarefa => tarefa.CriadoPorUsuarioId);
        builder.Property(tarefa => tarefa.CriadoEm).IsRequired();
        builder.Property(tarefa => tarefa.AtualizadoEm).IsRequired();
        builder.Property<uint>("Versao").IsRowVersion().HasColumnName("xmin").HasColumnType("xid");

        builder.Ignore(tarefa => tarefa.EstaAberta);

        builder.HasIndex(tarefa => new { tarefa.OrganizacaoId, tarefa.CasamentoId }).HasDatabaseName(IndiceOrganizacaoCasamento);
        builder.HasIndex(tarefa => new { tarefa.OrganizacaoId, tarefa.Status, tarefa.Prazo }).HasDatabaseName(IndiceOrganizacaoStatusPrazo);

        builder.HasOne<CasamentoAssessorado>()
            .WithMany()
            .HasForeignKey(tarefa => tarefa.CasamentoId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(tarefa => new { tarefa.CasamentoId, tarefa.OrigemModeloItemId })
            .IsUnique()
            .HasFilter("origem_modelo_item_id IS NOT NULL")
            .HasDatabaseName(IndiceOrigemModeloUnica);

        builder.HasOne<ItemModeloChecklist>()
            .WithMany()
            .HasForeignKey(tarefa => tarefa.OrigemModeloItemId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne<Organizacao>()
            .WithMany()
            .HasForeignKey(tarefa => tarefa.OrganizacaoId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
