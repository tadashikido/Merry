using Celebri.Dominio.Eventos;
using Celebri.Dominio.Organizacoes;
using Celebri.Dominio.Usuarios;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Celebri.Infraestrutura.Persistencia.Configuracoes;

public class UsuarioConfiguration : IEntityTypeConfiguration<Usuario>
{
    public const string IndiceEmailUnico = "ix_usuarios_email";
    public const string RestricaoPapelEvento = "ck_usuarios_papel_evento";

    public void Configure(EntityTypeBuilder<Usuario> builder)
    {
        builder.ToTable("usuarios", tabela =>
            tabela.HasCheckConstraint(RestricaoPapelEvento, $"(papel = '{nameof(PapelUsuario.Anfitriao)}') = (evento_id IS NOT NULL)"));
        builder.HasKey(usuario => usuario.Id);
        builder.Property(usuario => usuario.Id).ValueGeneratedNever();
        builder.Property(usuario => usuario.Nome).HasMaxLength(Usuario.TamanhoMaximoNome).IsRequired();
        builder.Property(usuario => usuario.Email).HasMaxLength(NormalizadorEmail.TamanhoMaximo).IsRequired();
        builder.Property(usuario => usuario.SenhaHash).HasMaxLength(Usuario.TamanhoMaximoSenhaHash).IsRequired();
        builder.Property(usuario => usuario.Papel).HasConversion<string>().HasMaxLength(Usuario.TamanhoMaximoPapel).IsRequired();
        builder.Property(usuario => usuario.Ativo).IsRequired();
        builder.Property(usuario => usuario.FalhasLoginConsecutivas).HasDefaultValue(0);
        builder.Property(usuario => usuario.CriadoEm).IsRequired();
        builder.Property<uint>("Versao").IsRowVersion().HasColumnName("xmin").HasColumnType("xid");

        builder.HasIndex(usuario => usuario.Email).IsUnique().HasDatabaseName(IndiceEmailUnico);
        builder.HasIndex(usuario => usuario.OrganizacaoId);
        builder.HasIndex(usuario => usuario.EventoId);

        builder.HasOne<Organizacao>()
            .WithMany()
            .HasForeignKey(usuario => usuario.OrganizacaoId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Evento>()
            .WithMany()
            .HasForeignKey(usuario => usuario.EventoId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
