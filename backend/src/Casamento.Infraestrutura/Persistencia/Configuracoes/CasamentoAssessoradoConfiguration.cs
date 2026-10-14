using Casamento.Dominio.Casamentos;
using Casamento.Dominio.Organizacoes;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Casamento.Infraestrutura.Persistencia.Configuracoes;

public class CasamentoAssessoradoConfiguration : IEntityTypeConfiguration<CasamentoAssessorado>
{
    public const string Tabela = "casamentos";
    public const string IndiceOrganizacaoData = "ix_casamentos_organizacao_id_data";
    public const string RestricaoConvidados = "ck_casamentos_convidados_estimados";
    public const string RestricaoData = "ck_casamentos_data";
    public const string RestricaoDataLimiteRsvp = "ck_casamentos_data_limite_rsvp";

    public void Configure(EntityTypeBuilder<CasamentoAssessorado> builder)
    {
        builder.ToTable(Tabela, tabela =>
        {
            tabela.HasCheckConstraint(
                RestricaoConvidados,
                $"convidados_estimados IS NULL OR convidados_estimados BETWEEN {CasamentoAssessorado.ConvidadosMinimo} AND {CasamentoAssessorado.ConvidadosMaximo}");
            tabela.HasCheckConstraint(
                RestricaoData,
                $"data BETWEEN DATE '{CasamentoAssessorado.DataMinima:yyyy-MM-dd}' AND DATE '{CasamentoAssessorado.DataMaxima:yyyy-MM-dd}'");
            tabela.HasCheckConstraint(
                RestricaoDataLimiteRsvp,
                $"data_limite_rsvp IS NULL OR (data_limite_rsvp >= DATE '{CasamentoAssessorado.DataMinima:yyyy-MM-dd}' AND data_limite_rsvp <= data)");
        });

        builder.HasKey(casamento => casamento.Id);
        builder.Property(casamento => casamento.Id).ValueGeneratedNever();
        builder.Property(casamento => casamento.NomePrimeiraPessoa).HasMaxLength(CasamentoAssessorado.TamanhoMaximoNome).IsRequired();
        builder.Property(casamento => casamento.NomeSegundaPessoa).HasMaxLength(CasamentoAssessorado.TamanhoMaximoNome).IsRequired();
        builder.Property(casamento => casamento.Data).HasColumnType("date").IsRequired();
        builder.Property(casamento => casamento.Horario).HasColumnType("time without time zone");
        builder.Property(casamento => casamento.DataLimiteRsvp).HasColumnType("date");
        builder.Property(casamento => casamento.LocalCerimonia).HasMaxLength(CasamentoAssessorado.TamanhoMaximoLocal);
        builder.Property(casamento => casamento.LocalRecepcao).HasMaxLength(CasamentoAssessorado.TamanhoMaximoLocal);
        builder.Property(casamento => casamento.Observacoes).HasMaxLength(CasamentoAssessorado.TamanhoMaximoObservacoes);
        builder.Property(casamento => casamento.CriadoEm).IsRequired();
        builder.Property(casamento => casamento.AtualizadoEm).IsRequired();
        builder.Ignore(casamento => casamento.Arquivado);

        builder.HasIndex(casamento => new { casamento.OrganizacaoId, casamento.Data }).HasDatabaseName(IndiceOrganizacaoData);

        builder.HasOne<Organizacao>()
            .WithMany()
            .HasForeignKey(casamento => casamento.OrganizacaoId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
