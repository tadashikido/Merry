using Celebri.Dominio.Operadores;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Celebri.Infraestrutura.Persistencia.Configuracoes;

public class RefreshTokenOperadorConfiguration : IEntityTypeConfiguration<RefreshTokenOperador>
{
    public void Configure(EntityTypeBuilder<RefreshTokenOperador> builder)
    {
        builder.ToTable("refresh_tokens_operador");
        builder.HasKey(token => token.Id);
        builder.Property(token => token.Id).ValueGeneratedNever();
        builder.Property(token => token.TokenHash).HasMaxLength(RefreshTokenOperador.TamanhoHash).IsFixedLength().IsRequired();
        builder.Property(token => token.Familia).IsRequired();
        builder.Property(token => token.CriadoEm).IsRequired();
        builder.Property(token => token.ExpiraEm).IsRequired();
        builder.Property<uint>("Versao").IsRowVersion().HasColumnName("xmin").HasColumnType("xid");
        builder.Ignore(token => token.FoiUtilizado);

        builder.HasIndex(token => token.TokenHash).IsUnique();
        builder.HasIndex(token => token.Familia);
        builder.HasIndex(token => token.OperadorId);

        builder.HasOne<OperadorPlataforma>()
            .WithMany()
            .HasForeignKey(token => token.OperadorId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
