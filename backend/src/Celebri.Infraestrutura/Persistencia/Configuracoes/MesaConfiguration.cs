using Celebri.Dominio.Casamentos;
using Celebri.Dominio.Mesas;
using Celebri.Dominio.Organizacoes;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Celebri.Infraestrutura.Persistencia.Configuracoes;

public class MesaConfiguration : IEntityTypeConfiguration<Mesa>
{
    public const string Tabela = "mesas";
    public const string IndiceOrganizacaoCasamento = "ix_mesas_organizacao_id_casamento_id";
    public const string IndiceNumeroUnico = "ux_mesas_casamento_id_numero";
    public const string IndiceEspecialUnica = "ux_mesas_casamento_id_especial";
    public const string RestricaoNumero = "ck_mesas_numero";
    public const string RestricaoCapacidade = "ck_mesas_capacidade";

    public void Configure(EntityTypeBuilder<Mesa> builder)
    {
        builder.ToTable(Tabela, tabela =>
        {
            tabela.HasCheckConstraint(RestricaoNumero, $"numero BETWEEN {Mesa.NumeroMinimo} AND {Mesa.NumeroMaximo}");
            tabela.HasCheckConstraint(RestricaoCapacidade, $"capacidade BETWEEN {Mesa.CapacidadeMinima} AND {Mesa.CapacidadeMaxima}");
        });

        builder.HasKey(mesa => mesa.Id);
        builder.Property(mesa => mesa.Id).ValueGeneratedNever();
        builder.Property(mesa => mesa.CasamentoId).IsRequired();
        builder.Property(mesa => mesa.Numero).IsRequired();
        builder.Property(mesa => mesa.Nome).HasMaxLength(Mesa.TamanhoMaximoNome);
        builder.Property(mesa => mesa.Capacidade).IsRequired();
        builder.Property(mesa => mesa.Especial).HasDefaultValue(false).IsRequired();
        builder.Property(mesa => mesa.CriadoEm).IsRequired();
        builder.Property(mesa => mesa.AtualizadoEm).IsRequired();
        builder.Property<uint>("Versao").IsRowVersion().HasColumnName("xmin").HasColumnType("xid");
        builder.Ignore(mesa => mesa.Rotulo);

        builder.HasIndex(mesa => new { mesa.OrganizacaoId, mesa.CasamentoId }).HasDatabaseName(IndiceOrganizacaoCasamento);
        builder.HasIndex(mesa => new { mesa.CasamentoId, mesa.Numero }).IsUnique().HasDatabaseName(IndiceNumeroUnico);
        builder.HasIndex(mesa => mesa.CasamentoId).IsUnique().HasFilter("especial").HasDatabaseName(IndiceEspecialUnica);

        builder.HasOne<CasamentoAssessorado>()
            .WithMany()
            .HasForeignKey(mesa => mesa.CasamentoId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Organizacao>()
            .WithMany()
            .HasForeignKey(mesa => mesa.OrganizacaoId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
