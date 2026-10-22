using Casamento.Dominio.Cronogramas;
using Casamento.Dominio.Organizacoes;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Casamento.Infraestrutura.Persistencia.Configuracoes;

public class ModeloCronogramaConfiguration : IEntityTypeConfiguration<ModeloCronograma>
{
    public const string Tabela = "modelos_cronograma";
    public const string IndiceOrganizacaoNome = "ix_modelos_cronograma_organizacao_id_nome";

    public void Configure(EntityTypeBuilder<ModeloCronograma> builder)
    {
        builder.ToTable(Tabela);

        builder.HasKey(modelo => modelo.Id);
        builder.Property(modelo => modelo.Id).ValueGeneratedNever();
        builder.Property(modelo => modelo.Nome).HasMaxLength(ModeloCronograma.TamanhoMaximoNome).IsRequired();
        builder.Property(modelo => modelo.Descricao).HasMaxLength(ModeloCronograma.TamanhoMaximoDescricao);
        builder.Property(modelo => modelo.HorarioReferencia).IsRequired();
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
