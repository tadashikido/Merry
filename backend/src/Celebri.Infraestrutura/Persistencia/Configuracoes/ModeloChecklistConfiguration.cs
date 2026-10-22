using Casamento.Dominio.Checklists;
using Casamento.Dominio.Organizacoes;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Casamento.Infraestrutura.Persistencia.Configuracoes;

public class ModeloChecklistConfiguration : IEntityTypeConfiguration<ModeloChecklist>
{
    public const string Tabela = "modelos_checklist";
    public const string IndiceOrganizacaoNome = "ix_modelos_checklist_organizacao_id_nome";

    public void Configure(EntityTypeBuilder<ModeloChecklist> builder)
    {
        builder.ToTable(Tabela);

        builder.HasKey(modelo => modelo.Id);
        builder.Property(modelo => modelo.Id).ValueGeneratedNever();
        builder.Property(modelo => modelo.Nome).HasMaxLength(ModeloChecklist.TamanhoMaximoNome).IsRequired();
        builder.Property(modelo => modelo.Descricao).HasMaxLength(ModeloChecklist.TamanhoMaximoDescricao);
        builder.Property(modelo => modelo.Sugerido).IsRequired();
        builder.Property(modelo => modelo.CriadoEm).IsRequired();
        builder.Property(modelo => modelo.AtualizadoEm).IsRequired();
        builder.Property<uint>("Versao").IsRowVersion().HasColumnName("xmin").HasColumnType("xid");

        builder.HasIndex(modelo => new { modelo.OrganizacaoId, modelo.Nome }).HasDatabaseName(IndiceOrganizacaoNome);

        builder.HasMany(modelo => modelo.Itens)
            .WithOne()
            .HasForeignKey(item => item.ModeloId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Navigation(modelo => modelo.Itens).UsePropertyAccessMode(PropertyAccessMode.Field);

        builder.HasOne<Organizacao>()
            .WithMany()
            .HasForeignKey(modelo => modelo.OrganizacaoId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
