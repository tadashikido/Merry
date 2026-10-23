using Celebri.Dominio.Checklists;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Organizacoes;
using Celebri.Dominio.Tarefas;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Celebri.Infraestrutura.Persistencia.Configuracoes;

public class TarefaEventoConfiguration : IEntityTypeConfiguration<TarefaEvento>
{
    public const string Tabela = "tarefas_evento";
    public const string IndiceOrganizacaoEvento = "ix_tarefas_evento_organizacao_id_evento_id";
    public const string IndiceOrganizacaoStatusPrazo = "ix_tarefas_evento_organizacao_id_status_prazo";
    public const string IndiceOrigemModeloUnica = "ux_tarefas_evento_evento_id_origem_modelo_item_id";
    public const string RestricaoStatus = "ck_tarefas_evento_status";
    public const string RestricaoResponsavel = "ck_tarefas_evento_responsavel";
    public const string RestricaoCategoria = "ck_tarefas_evento_categoria";
    public const string RestricaoConcluidaPor = "ck_tarefas_evento_concluida_por";
    public const string RestricaoConclusao = "ck_tarefas_evento_conclusao";

    public void Configure(EntityTypeBuilder<TarefaEvento> builder)
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
        builder.Property(tarefa => tarefa.EventoId).IsRequired();
        builder.Property(tarefa => tarefa.Titulo).HasMaxLength(TarefaEvento.TamanhoMaximoTitulo).IsRequired();
        builder.Property(tarefa => tarefa.Descricao).HasMaxLength(TarefaEvento.TamanhoMaximoDescricao);
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

        builder.HasIndex(tarefa => new { tarefa.OrganizacaoId, tarefa.EventoId }).HasDatabaseName(IndiceOrganizacaoEvento);
        builder.HasIndex(tarefa => new { tarefa.OrganizacaoId, tarefa.Status, tarefa.Prazo }).HasDatabaseName(IndiceOrganizacaoStatusPrazo);

        builder.HasOne<Evento>()
            .WithMany()
            .HasForeignKey(tarefa => tarefa.EventoId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(tarefa => new { tarefa.EventoId, tarefa.OrigemModeloItemId })
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
