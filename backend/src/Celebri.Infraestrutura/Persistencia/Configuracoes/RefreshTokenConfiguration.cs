using Casamento.Dominio.Autenticacao;
using Casamento.Dominio.Usuarios;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Casamento.Infraestrutura.Persistencia.Configuracoes;

public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.ToTable("refresh_tokens");
        builder.HasKey(token => token.Id);
        builder.Property(token => token.Id).ValueGeneratedNever();
        builder.Property(token => token.TokenHash).HasMaxLength(RefreshToken.TamanhoHash).IsFixedLength().IsRequired();
        builder.Property(token => token.Familia).IsRequired();
        builder.Property(token => token.CriadoEm).IsRequired();
        builder.Property(token => token.ExpiraEm).IsRequired();
        builder.Property<uint>("Versao").IsRowVersion().HasColumnName("xmin").HasColumnType("xid");
        builder.Ignore(token => token.FoiUtilizado);

        builder.HasIndex(token => token.TokenHash).IsUnique();
        builder.HasIndex(token => token.Familia);
        builder.HasIndex(token => token.UsuarioId);

        builder.HasOne<Usuario>()
            .WithMany()
            .HasForeignKey(token => token.UsuarioId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
