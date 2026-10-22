using Celebri.Dominio.AcessosAnfitriao;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Organizacoes;
using Celebri.Dominio.Usuarios;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Celebri.Infraestrutura.Persistencia.Configuracoes;

public class AcessoAnfitriaoConfiguration : IEntityTypeConfiguration<AcessoAnfitriao>
{
    public const string Tabela = "acessos_anfitriao";
    public const string IndiceOrganizacaoEvento = "ix_acessos_anfitriao_organizacao_id_evento_id";
    public const string IndiceEmailNaoRevogado = "ix_acessos_anfitriao_evento_id_email_nao_revogado";
    public const string RestricaoAceite = "ck_acessos_anfitriao_aceite";
    public const string RestricaoRevogacao = "ck_acessos_anfitriao_revogacao";

    public void Configure(EntityTypeBuilder<AcessoAnfitriao> builder)
    {
        builder.ToTable(Tabela, tabela =>
        {
            tabela.HasCheckConstraint(RestricaoAceite, "(aceito_em IS NULL) = (usuario_id IS NULL)");
            tabela.HasCheckConstraint(RestricaoRevogacao, "(revogado_em IS NULL) = (revogado_por_usuario_id IS NULL)");
        });

        builder.HasKey(acesso => acesso.Id);
        builder.Property(acesso => acesso.Id).ValueGeneratedNever();
        builder.Property(acesso => acesso.EventoId).IsRequired();
        builder.Property(acesso => acesso.Nome).HasMaxLength(AcessoAnfitriao.TamanhoMaximoNome).IsRequired();
        builder.Property(acesso => acesso.Email).HasMaxLength(NormalizadorEmail.TamanhoMaximo).IsRequired();
        builder.Property(acesso => acesso.ConvidadoEm).IsRequired();
        builder.Property(acesso => acesso.ConvidadoPorUsuarioId).IsRequired();
        builder.Property(acesso => acesso.ConviteExpiraEm).IsRequired();
        builder.Property<uint>("Versao").IsRowVersion().HasColumnName("xmin").HasColumnType("xid");

        builder.HasIndex(acesso => new { acesso.OrganizacaoId, acesso.EventoId }).HasDatabaseName(IndiceOrganizacaoEvento);
        builder.HasIndex(acesso => new { acesso.EventoId, acesso.Email })
            .IsUnique()
            .HasFilter("revogado_em IS NULL")
            .HasDatabaseName(IndiceEmailNaoRevogado);
        builder.HasIndex(acesso => acesso.UsuarioId);

        builder.HasOne<Evento>()
            .WithMany()
            .HasForeignKey(acesso => acesso.EventoId)
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
