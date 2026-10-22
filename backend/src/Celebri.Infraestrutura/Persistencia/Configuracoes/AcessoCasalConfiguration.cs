using Casamento.Dominio.AcessosCasal;
using Casamento.Dominio.Casamentos;
using Casamento.Dominio.Organizacoes;
using Casamento.Dominio.Usuarios;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Casamento.Infraestrutura.Persistencia.Configuracoes;

public class AcessoCasalConfiguration : IEntityTypeConfiguration<AcessoCasal>
{
    public const string Tabela = "acessos_casal";
    public const string IndiceOrganizacaoCasamento = "ix_acessos_casal_organizacao_id_casamento_id";
    public const string IndiceEmailNaoRevogado = "ix_acessos_casal_casamento_id_email_nao_revogado";
    public const string RestricaoAceite = "ck_acessos_casal_aceite";
    public const string RestricaoRevogacao = "ck_acessos_casal_revogacao";

    public void Configure(EntityTypeBuilder<AcessoCasal> builder)
    {
        builder.ToTable(Tabela, tabela =>
        {
            tabela.HasCheckConstraint(RestricaoAceite, "(aceito_em IS NULL) = (usuario_id IS NULL)");
            tabela.HasCheckConstraint(RestricaoRevogacao, "(revogado_em IS NULL) = (revogado_por_usuario_id IS NULL)");
        });

        builder.HasKey(acesso => acesso.Id);
        builder.Property(acesso => acesso.Id).ValueGeneratedNever();
        builder.Property(acesso => acesso.CasamentoId).IsRequired();
        builder.Property(acesso => acesso.Nome).HasMaxLength(AcessoCasal.TamanhoMaximoNome).IsRequired();
        builder.Property(acesso => acesso.Email).HasMaxLength(NormalizadorEmail.TamanhoMaximo).IsRequired();
        builder.Property(acesso => acesso.ConvidadoEm).IsRequired();
        builder.Property(acesso => acesso.ConvidadoPorUsuarioId).IsRequired();
        builder.Property(acesso => acesso.ConviteExpiraEm).IsRequired();
        builder.Property<uint>("Versao").IsRowVersion().HasColumnName("xmin").HasColumnType("xid");

        builder.HasIndex(acesso => new { acesso.OrganizacaoId, acesso.CasamentoId }).HasDatabaseName(IndiceOrganizacaoCasamento);
        builder.HasIndex(acesso => new { acesso.CasamentoId, acesso.Email })
            .IsUnique()
            .HasFilter("revogado_em IS NULL")
            .HasDatabaseName(IndiceEmailNaoRevogado);
        builder.HasIndex(acesso => acesso.UsuarioId);

        builder.HasOne<CasamentoAssessorado>()
            .WithMany()
            .HasForeignKey(acesso => acesso.CasamentoId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Organizacao>()
            .WithMany()
            .HasForeignKey(acesso => acesso.OrganizacaoId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Usuario>()
            .WithMany()
            .HasForeignKey(acesso => acesso.UsuarioId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
