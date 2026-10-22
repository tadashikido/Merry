using Celebri.Dominio.Eventos;
using Celebri.Dominio.Convidados;
using Celebri.Dominio.Mesas;
using Celebri.Dominio.Organizacoes;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Celebri.Infraestrutura.Persistencia.Configuracoes;

public class ConvidadoConfiguration : IEntityTypeConfiguration<Convidado>
{
    public const string Tabela = "convidados";
    public const string IndiceOrganizacaoEvento = "ix_convidados_organizacao_id_evento_id";
    public const string IndiceConvite = "ix_convidados_convite_id";
    public const string RestricaoFaixaEtaria = "ck_convidados_faixa_etaria";
    public const string RestricaoResposta = "ck_convidados_resposta";
    public const string RestricaoOrdem = "ck_convidados_ordem";
    public const string IndiceMesa = "ix_convidados_mesa_id";
    public const string IndiceMesaSaida = "ix_convidados_mesa_saida_id";
    public const string RestricaoMesaSomenteConfirmado = "ck_convidados_mesa_somente_confirmado";
    public const string RestricaoSaidaMesa = "ck_convidados_saida_mesa";
    public const string ChaveEstrangeiraMesa = "fk_convidados_mesas_mesa_id";
    public const string ChaveEstrangeiraMesaSaida = "fk_convidados_mesas_mesa_saida_id";

    public void Configure(EntityTypeBuilder<Convidado> builder)
    {
        builder.ToTable(Tabela, tabela =>
        {
            tabela.HasCheckConstraint(
                RestricaoFaixaEtaria,
                $"faixa_etaria IN ({ConviteConfiguration.ValoresPermitidos<FaixaEtaria>()})");
            tabela.HasCheckConstraint(
                RestricaoResposta,
                $"resposta IN ({ConviteConfiguration.ValoresPermitidos<RespostaRsvp>()})");
            tabela.HasCheckConstraint(RestricaoOrdem, "ordem >= 0");
            tabela.HasCheckConstraint(
                RestricaoMesaSomenteConfirmado,
                $"mesa_id IS NULL OR resposta = '{nameof(RespostaRsvp.Confirmado)}'");
            tabela.HasCheckConstraint(RestricaoSaidaMesa, "mesa_saida_id IS NULL OR saiu_da_mesa_em IS NOT NULL");
        });

        builder.HasKey(convidado => convidado.Id);
        builder.Property(convidado => convidado.Id).ValueGeneratedNever();
        builder.Property(convidado => convidado.EventoId).IsRequired();
        builder.Property(convidado => convidado.ConviteId).IsRequired();
        builder.Property(convidado => convidado.Nome).HasMaxLength(Convidado.TamanhoMaximoNome).IsRequired();
        builder.Property(convidado => convidado.Telefone).HasMaxLength(NormalizadorTelefone.TamanhoMaximoArmazenado);
        builder.Property(convidado => convidado.Email).HasMaxLength(ValidadorEmailConvidado.TamanhoMaximo);
        builder.Property(convidado => convidado.FaixaEtaria)
            .HasConversion<string>()
            .HasMaxLength(ConviteConfiguration.TamanhoMaximoEnum)
            .IsRequired();
        builder.Property(convidado => convidado.Resposta)
            .HasConversion<string>()
            .HasMaxLength(ConviteConfiguration.TamanhoMaximoEnum)
            .IsRequired();
        builder.Property(convidado => convidado.Ordem).IsRequired();
        builder.Property(convidado => convidado.Acompanhante).HasDefaultValue(false).IsRequired();
        builder.Property(convidado => convidado.MesaId);
        builder.Property(convidado => convidado.MesaSaidaId);
        builder.Property(convidado => convidado.SaiuDaMesaEm);
        builder.Property(convidado => convidado.CriadoEm).IsRequired();
        builder.Property(convidado => convidado.AtualizadoEm).IsRequired();

        builder.HasIndex(convidado => new { convidado.OrganizacaoId, convidado.EventoId }).HasDatabaseName(IndiceOrganizacaoEvento);
        builder.HasIndex(convidado => convidado.ConviteId).HasDatabaseName(IndiceConvite);
        builder.HasIndex(convidado => convidado.MesaId).HasDatabaseName(IndiceMesa);
        builder.HasIndex(convidado => convidado.MesaSaidaId).HasDatabaseName(IndiceMesaSaida);

        builder.HasOne<Mesa>()
            .WithMany()
            .HasForeignKey(convidado => convidado.MesaId)
            .HasConstraintName(ChaveEstrangeiraMesa)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne<Mesa>()
            .WithMany()
            .HasForeignKey(convidado => convidado.MesaSaidaId)
            .HasConstraintName(ChaveEstrangeiraMesaSaida)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne<Evento>()
            .WithMany()
            .HasForeignKey(convidado => convidado.EventoId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Organizacao>()
            .WithMany()
            .HasForeignKey(convidado => convidado.OrganizacaoId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
