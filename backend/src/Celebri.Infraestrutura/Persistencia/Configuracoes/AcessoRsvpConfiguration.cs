using Celebri.Dominio.Convidados;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Organizacoes;
using Celebri.Dominio.Rsvp;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Celebri.Infraestrutura.Persistencia.Configuracoes;

public class AcessoRsvpConfiguration : IEntityTypeConfiguration<AcessoRsvp>
{
    public const string Tabela = "acessos_rsvp";
    public const string IndiceTokenHash = "ix_acessos_rsvp_token_hash";
    public const string IndiceConvite = "ix_acessos_rsvp_convite_id";

    public void Configure(EntityTypeBuilder<AcessoRsvp> builder)
    {
        builder.ToTable(Tabela);
        builder.HasKey(acesso => acesso.Id);
        builder.Property(acesso => acesso.Id).ValueGeneratedNever();
        builder.Property(acesso => acesso.ConviteId).IsRequired();
        builder.Property(acesso => acesso.EventoId).IsRequired();
        builder.Property(acesso => acesso.OrganizacaoId).IsRequired();
        builder.Property(acesso => acesso.TokenHash).HasMaxLength(AcessoRsvp.TamanhoHash).IsFixedLength().IsRequired();
        builder.Property(acesso => acesso.TokenCifrado).HasMaxLength(AcessoRsvp.TamanhoMaximoTokenCifrado).IsRequired();
        builder.Property(acesso => acesso.GeradoEm).IsRequired();

        builder.HasIndex(acesso => acesso.TokenHash).IsUnique().HasDatabaseName(IndiceTokenHash);
        builder.HasIndex(acesso => acesso.ConviteId).IsUnique().HasDatabaseName(IndiceConvite);
        builder.HasIndex(acesso => acesso.EventoId);
        builder.HasIndex(acesso => acesso.OrganizacaoId);

        builder.HasOne<Convite>()
            .WithMany()
            .HasForeignKey(acesso => acesso.ConviteId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<Evento>()
            .WithMany()
            .HasForeignKey(acesso => acesso.EventoId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Organizacao>()
            .WithMany()
            .HasForeignKey(acesso => acesso.OrganizacaoId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
