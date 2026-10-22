using Celebri.Dominio.Casamentos;
using Celebri.Dominio.Convidados;
using Celebri.Dominio.Organizacoes;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Celebri.Infraestrutura.Persistencia.Configuracoes;

public class RegistroAlteracaoConviteConfiguration : IEntityTypeConfiguration<RegistroAlteracaoConvite>
{
    public const string Tabela = "registros_alteracao_convites";
    public const string IndiceOrganizacaoCasamento = "ix_registros_alteracao_convites_organizacao_id_casamento_id";
    public const string IndiceConvite = "ix_registros_alteracao_convites_convite_id_ocorrido_em";
    public const string RestricaoAcao = "ck_registros_alteracao_convites_acao";

    public void Configure(EntityTypeBuilder<RegistroAlteracaoConvite> builder)
    {
        builder.ToTable(Tabela, tabela =>
            tabela.HasCheckConstraint(RestricaoAcao, $"acao IN ({ConviteConfiguration.ValoresPermitidos<AcaoAlteracaoConvite>()})"));

        builder.HasKey(registro => registro.Id);
        builder.Property(registro => registro.Id).ValueGeneratedNever();
        builder.Property(registro => registro.CasamentoId).IsRequired();
        builder.Property(registro => registro.ConviteId).IsRequired();
        builder.Property(registro => registro.Acao)
            .HasConversion<string>()
            .HasMaxLength(ConviteConfiguration.TamanhoMaximoEnum)
            .IsRequired();
        builder.Property(registro => registro.PapelUsuario).HasMaxLength(RegistroAlteracaoConvite.TamanhoMaximoPapel);
        builder.Property(registro => registro.OcorridoEm).IsRequired();

        builder.HasIndex(registro => new { registro.OrganizacaoId, registro.CasamentoId }).HasDatabaseName(IndiceOrganizacaoCasamento);
        builder.HasIndex(registro => new { registro.ConviteId, registro.OcorridoEm }).HasDatabaseName(IndiceConvite);

        builder.HasOne<CasamentoAssessorado>()
            .WithMany()
            .HasForeignKey(registro => registro.CasamentoId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Organizacao>()
            .WithMany()
            .HasForeignKey(registro => registro.OrganizacaoId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
