using Celebri.Dominio.Eventos;
using Celebri.Dominio.Organizacoes;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Celebri.Infraestrutura.Persistencia.Configuracoes;

public class EventoConfiguration : IEntityTypeConfiguration<Evento>
{
    public const string Tabela = "eventos";
    public const string IndiceOrganizacaoData = "ix_eventos_organizacao_id_data";
    public const string RestricaoConvidados = "ck_eventos_convidados_estimados";
    public const string RestricaoData = "ck_eventos_data";
    public const string RestricaoDataLimiteRsvp = "ck_eventos_data_limite_rsvp";

    public void Configure(EntityTypeBuilder<Evento> builder)
    {
        builder.ToTable(Tabela, tabela =>
        {
            tabela.HasCheckConstraint(
                RestricaoConvidados,
                $"convidados_estimados IS NULL OR convidados_estimados BETWEEN {Evento.ConvidadosMinimo} AND {Evento.ConvidadosMaximo}");
            tabela.HasCheckConstraint(
                RestricaoData,
                $"data BETWEEN DATE '{Evento.DataMinima:yyyy-MM-dd}' AND DATE '{Evento.DataMaxima:yyyy-MM-dd}'");
            tabela.HasCheckConstraint(
                RestricaoDataLimiteRsvp,
                $"data_limite_rsvp IS NULL OR (data_limite_rsvp >= DATE '{Evento.DataMinima:yyyy-MM-dd}' AND data_limite_rsvp <= data)");
        });

        builder.HasKey(evento => evento.Id);
        builder.Property(evento => evento.Id).ValueGeneratedNever();
        builder.Property(evento => evento.NomePrimeiraPessoa).HasMaxLength(Evento.TamanhoMaximoNome).IsRequired();
        builder.Property(evento => evento.NomeSegundaPessoa).HasMaxLength(Evento.TamanhoMaximoNome);
        builder.Property(evento => evento.Tipo)
            .HasConversion<string>()
            .HasMaxLength(ConviteConfiguration.TamanhoMaximoEnum)
            .IsRequired();
        builder.Property(evento => evento.Data).HasColumnType("date").IsRequired();
        builder.Property(evento => evento.Horario).HasColumnType("time without time zone");
        builder.Property(evento => evento.DataLimiteRsvp).HasColumnType("date");
        builder.Property(evento => evento.LocalCerimonia).HasMaxLength(Evento.TamanhoMaximoLocal);
        builder.Property(evento => evento.LocalRecepcao).HasMaxLength(Evento.TamanhoMaximoLocal);
        builder.Property(evento => evento.Observacoes).HasMaxLength(Evento.TamanhoMaximoObservacoes);
        builder.Property(evento => evento.CriadoEm).IsRequired();
        builder.Property(evento => evento.AtualizadoEm).IsRequired();
        builder.Ignore(evento => evento.Arquivado);

        builder.HasIndex(evento => new { evento.OrganizacaoId, evento.Data }).HasDatabaseName(IndiceOrganizacaoData);

        builder.HasOne<Organizacao>()
            .WithMany()
            .HasForeignKey(evento => evento.OrganizacaoId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
