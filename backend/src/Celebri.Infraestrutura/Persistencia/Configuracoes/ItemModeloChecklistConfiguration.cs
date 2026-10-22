using Celebri.Dominio.Checklists;
using Celebri.Dominio.Organizacoes;
using Celebri.Dominio.Tarefas;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Celebri.Infraestrutura.Persistencia.Configuracoes;

public class ItemModeloChecklistConfiguration : IEntityTypeConfiguration<ItemModeloChecklist>
{
    public const string Tabela = "itens_modelo_checklist";
    public const string IndiceOrganizacaoModelo = "ix_itens_modelo_checklist_organizacao_id_modelo_id";
    public const string RestricaoResponsavel = "ck_itens_modelo_checklist_responsavel";
    public const string RestricaoCategoria = "ck_itens_modelo_checklist_categoria";
    public const string RestricaoDias = "ck_itens_modelo_checklist_dias";

    public void Configure(EntityTypeBuilder<ItemModeloChecklist> builder)
    {
        builder.ToTable(Tabela, tabela =>
        {
            tabela.HasCheckConstraint(RestricaoResponsavel, $"responsavel IN ({ConviteConfiguration.ValoresPermitidos<ResponsavelTarefa>()})");
            tabela.HasCheckConstraint(RestricaoCategoria, $"categoria IN ({ConviteConfiguration.ValoresPermitidos<CategoriaTarefa>()})");
            tabela.HasCheckConstraint(
                RestricaoDias,
                $"dias_antes_do_casamento BETWEEN {-ItemModeloChecklist.DiasDepoisMaximo} AND {ItemModeloChecklist.DiasAntesMaximo}");
        });

        builder.HasKey(item => item.Id);
        builder.Property(item => item.Id).ValueGeneratedNever();
        builder.Property(item => item.ModeloId).IsRequired();
        builder.Property(item => item.Titulo).HasMaxLength(TarefaCasamento.TamanhoMaximoTitulo).IsRequired();
        builder.Property(item => item.Descricao).HasMaxLength(TarefaCasamento.TamanhoMaximoDescricao);
        builder.Property(item => item.Responsavel)
            .HasConversion<string>()
            .HasMaxLength(ConviteConfiguration.TamanhoMaximoEnum)
            .IsRequired();
        builder.Property(item => item.Categoria)
            .HasConversion<string>()
            .HasMaxLength(ConviteConfiguration.TamanhoMaximoEnum)
            .IsRequired();
        builder.Property(item => item.DiasAntesDoCasamento).IsRequired();
        builder.Property(item => item.CriadoEm).IsRequired();
        builder.Property(item => item.AtualizadoEm).IsRequired();
        builder.Property<uint>("Versao").IsRowVersion().HasColumnName("xmin").HasColumnType("xid");

        builder.HasIndex(item => new { item.OrganizacaoId, item.ModeloId }).HasDatabaseName(IndiceOrganizacaoModelo);

        builder.HasOne<Organizacao>()
            .WithMany()
            .HasForeignKey(item => item.OrganizacaoId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
