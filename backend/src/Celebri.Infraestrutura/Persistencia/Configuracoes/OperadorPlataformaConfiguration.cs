using Celebri.Dominio.Operadores;
using Celebri.Dominio.Usuarios;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Celebri.Infraestrutura.Persistencia.Configuracoes;

public class OperadorPlataformaConfiguration : IEntityTypeConfiguration<OperadorPlataforma>
{
    public const string IndiceEmailUnico = "ix_operadores_plataforma_email";

    public void Configure(EntityTypeBuilder<OperadorPlataforma> builder)
    {
        builder.ToTable("operadores_plataforma");
        builder.HasKey(operador => operador.Id);
        builder.Property(operador => operador.Id).ValueGeneratedNever();
        builder.Property(operador => operador.Nome).HasMaxLength(OperadorPlataforma.TamanhoMaximoNome).IsRequired();
        builder.Property(operador => operador.Email).HasMaxLength(NormalizadorEmail.TamanhoMaximo).IsRequired();
        builder.Property(operador => operador.SenhaHash).HasMaxLength(OperadorPlataforma.TamanhoMaximoSenhaHash).IsRequired();
        builder.Property(operador => operador.Ativo).IsRequired();
        builder.Property(operador => operador.FalhasLoginConsecutivas).HasDefaultValue(0);
        builder.Property(operador => operador.CriadoEm).IsRequired();
        builder.Property<uint>("Versao").IsRowVersion().HasColumnName("xmin").HasColumnType("xid");

        builder.HasIndex(operador => operador.Email).IsUnique().HasDatabaseName(IndiceEmailUnico);
    }
}
