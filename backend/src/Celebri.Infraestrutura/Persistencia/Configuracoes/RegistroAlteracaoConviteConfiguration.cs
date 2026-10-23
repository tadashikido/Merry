using Celebri.Dominio.Convidados;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Organizacoes;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Celebri.Infraestrutura.Persistencia.Configuracoes;

public class RegistroAlteracaoConviteConfiguration : IEntityTypeConfiguration<RegistroAlteracaoConvite>
{
    public const string Tabela = "registros_alteracao_convites";
    public const string IndiceOrganizacaoEvento = "ix_registros_alteracao_convites_organizacao_id_evento_id";
    public const string IndiceConvite = "ix_registros_alteracao_convites_convite_id_ocorrido_em";
    public const string RestricaoAcao = "ck_registros_alteracao_convites_acao";

    public void Configure(EntityTypeBuilder<RegistroAlteracaoConvite> builder)
    {
        builder.ToTable(Tabela, tabela =>
            tabela.HasCheckConstraint(RestricaoAcao, $"acao IN ({ConviteConfiguration.ValoresPermitidos<AcaoAlteracaoConvite>()})"));

        builder.HasKey(registro => registro.Id);
        builder.Property(registro => registro.Id).ValueGeneratedNever();
        builder.Property(registro => registro.EventoId).IsRequired();
        builder.Property(registro => registro.ConviteId).IsRequired();
        builder.Property(registro => registro.Acao)
            .HasConversion<string>()
            .HasMaxLength(ConviteConfiguration.TamanhoMaximoEnum)
            .IsRequired();
        builder.Property(registro => registro.PapelUsuario).HasMaxLength(RegistroAlteracaoConvite.TamanhoMaximoPapel);
        builder.Property(registro => registro.OcorridoEm).IsRequired();

        builder.HasIndex(registro => new { registro.OrganizacaoId, registro.EventoId }).HasDatabaseName(IndiceOrganizacaoEvento);
        builder.HasIndex(registro => new { registro.ConviteId, registro.OcorridoEm }).HasDatabaseName(IndiceConvite);

        builder.HasOne<Evento>()
            .WithMany()
            .HasForeignKey(registro => registro.EventoId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Organizacao>()
            .WithMany()
            .HasForeignKey(registro => registro.OrganizacaoId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
