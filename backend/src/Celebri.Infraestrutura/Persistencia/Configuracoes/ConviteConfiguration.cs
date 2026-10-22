using Celebri.Dominio.Casamentos;
using Celebri.Dominio.Convidados;
using Celebri.Dominio.Organizacoes;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Celebri.Infraestrutura.Persistencia.Configuracoes;

public class ConviteConfiguration : IEntityTypeConfiguration<Convite>
{
    public const string Tabela = "convites";
    public const string IndiceOrganizacaoCasamento = "ix_convites_organizacao_id_casamento_id";
    public const string RestricaoLimiteAcompanhantes = "ck_convites_limite_acompanhantes";
    public const string RestricaoStatusEnvio = "ck_convites_status_envio";
    public const string RestricaoQuantidadeCobrancas = "ck_convites_quantidade_cobrancas";
    public const int TamanhoMaximoEnum = 20;

    public void Configure(EntityTypeBuilder<Convite> builder)
    {
        builder.ToTable(Tabela, tabela =>
        {
            tabela.HasCheckConstraint(
                RestricaoLimiteAcompanhantes,
                $"limite_acompanhantes BETWEEN {Convite.LimiteAcompanhantesMinimo} AND {Convite.LimiteAcompanhantesMaximo}");
            tabela.HasCheckConstraint(
                RestricaoStatusEnvio,
                $"status_envio IN ({ValoresPermitidos<StatusEnvioConvite>()})");
            tabela.HasCheckConstraint(RestricaoQuantidadeCobrancas, "quantidade_cobrancas >= 0");
        });

        builder.HasKey(convite => convite.Id);
        builder.Property(convite => convite.Id).ValueGeneratedNever();
        builder.Property(convite => convite.CasamentoId).IsRequired();
        builder.Property(convite => convite.Nome).HasMaxLength(Convite.TamanhoMaximoNome).IsRequired();
        builder.Property(convite => convite.Grupo).HasMaxLength(Convite.TamanhoMaximoGrupo);
        builder.Property(convite => convite.LimiteAcompanhantes).IsRequired();
        builder.Property(convite => convite.StatusEnvio).HasConversion<string>().HasMaxLength(TamanhoMaximoEnum).IsRequired();
        builder.Property(convite => convite.CriadoEm).IsRequired();
        builder.Property(convite => convite.AtualizadoEm).IsRequired();
        builder.Property(convite => convite.RespondidoEm);
        builder.Property(convite => convite.UltimaCobrancaEm);
        builder.Property(convite => convite.QuantidadeCobrancas).IsRequired();
        builder.Property<uint>("Versao").IsRowVersion().HasColumnName("xmin").HasColumnType("xid");

        builder.HasIndex(convite => new { convite.OrganizacaoId, convite.CasamentoId }).HasDatabaseName(IndiceOrganizacaoCasamento);

        builder.HasMany(convite => convite.Convidados)
            .WithOne()
            .HasForeignKey(convidado => convidado.ConviteId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Navigation(convite => convite.Convidados).UsePropertyAccessMode(PropertyAccessMode.Field);

        builder.HasOne<CasamentoAssessorado>()
            .WithMany()
            .HasForeignKey(convite => convite.CasamentoId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Organizacao>()
            .WithMany()
            .HasForeignKey(convite => convite.OrganizacaoId)
            .OnDelete(DeleteBehavior.Restrict);
    }

    public static string ValoresPermitidos<TEnum>()
        where TEnum : struct, Enum
    {
        return string.Join(", ", Enum.GetNames<TEnum>().Select(nome => $"'{nome}'"));
    }
}
