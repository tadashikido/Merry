using Casamento.Dominio.Casamentos;
using Casamento.Dominio.Organizacoes;
using Casamento.Dominio.Usuarios;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Casamento.Infraestrutura.Persistencia.Configuracoes;

public class UsuarioConfiguration : IEntityTypeConfiguration<Usuario>
{
    public const string IndiceEmailUnico = "ix_usuarios_email";
    public const string RestricaoPapelCasamento = "ck_usuarios_papel_casamento";

    public void Configure(EntityTypeBuilder<Usuario> builder)
    {
        builder.ToTable("usuarios", tabela =>
            tabela.HasCheckConstraint(RestricaoPapelCasamento, $"(papel = '{nameof(PapelUsuario.Casal)}') = (casamento_id IS NOT NULL)"));
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
        builder.HasIndex(usuario => usuario.CasamentoId);

        builder.HasOne<Organizacao>()
            .WithMany()
            .HasForeignKey(usuario => usuario.OrganizacaoId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<CasamentoAssessorado>()
            .WithMany()
            .HasForeignKey(usuario => usuario.CasamentoId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
