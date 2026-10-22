using Casamento.Dominio.Casamentos;
using Casamento.Dominio.Cronogramas;
using Casamento.Dominio.Fornecedores;
using Casamento.Dominio.Organizacoes;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Casamento.Infraestrutura.Persistencia.Configuracoes;

public class AcessoCronogramaConfiguration : IEntityTypeConfiguration<AcessoCronograma>
{
    public const string Tabela = "acessos_cronograma";
    public const string IndiceTokenHash = "ix_acessos_cronograma_token_hash";
    public const string IndiceDestino = "ux_acessos_cronograma_destino";
    public const string RestricaoTipo = "ck_acessos_cronograma_tipo";
    public const string RestricaoDestino = "ck_acessos_cronograma_destino";

    public void Configure(EntityTypeBuilder<AcessoCronograma> builder)
    {
        builder.ToTable(Tabela, tabela =>
        {
            tabela.HasCheckConstraint(RestricaoTipo, $"tipo IN ({ConviteConfiguration.ValoresPermitidos<TipoAcessoCronograma>()})");
            tabela.HasCheckConstraint(
                RestricaoDestino,
                $"(tipo = '{nameof(TipoAcessoCronograma.Geral)}' AND fornecedor_casamento_id IS NULL AND responsavel_chave IS NULL)"
                + $" OR (tipo = '{nameof(TipoAcessoCronograma.Fornecedor)}' AND fornecedor_casamento_id IS NOT NULL AND responsavel_chave IS NULL)"
                + $" OR (tipo = '{nameof(TipoAcessoCronograma.Responsavel)}' AND fornecedor_casamento_id IS NULL AND responsavel_chave IS NOT NULL)");
        });

        builder.HasKey(acesso => acesso.Id);
        builder.Property(acesso => acesso.Id).ValueGeneratedNever();
        builder.Property(acesso => acesso.OrganizacaoId).IsRequired();
        builder.Property(acesso => acesso.CasamentoId).IsRequired();
        builder.Property(acesso => acesso.Tipo)
            .HasConversion<string>()
            .HasMaxLength(ConviteConfiguration.TamanhoMaximoEnum)
            .IsRequired();
        builder.Property(acesso => acesso.FornecedorCasamentoId);
        builder.Property(acesso => acesso.ResponsavelChave).HasMaxLength(ItemCronograma.TamanhoMaximoResponsavel);
        builder.Property(acesso => acesso.TokenHash).HasMaxLength(AcessoCronograma.TamanhoHash).IsFixedLength().IsRequired();
        builder.Property(acesso => acesso.TokenCifrado).HasMaxLength(AcessoCronograma.TamanhoMaximoTokenCifrado).IsRequired();
        builder.Property(acesso => acesso.GeradoEm).IsRequired();
        builder.Ignore(acesso => acesso.Destino);

        builder.HasIndex(acesso => acesso.TokenHash).IsUnique().HasDatabaseName(IndiceTokenHash);
        builder.HasIndex(acesso => new { acesso.CasamentoId, acesso.Tipo, acesso.FornecedorCasamentoId, acesso.ResponsavelChave })
            .IsUnique()
            .AreNullsDistinct(false)
            .HasDatabaseName(IndiceDestino);
        builder.HasIndex(acesso => acesso.OrganizacaoId);
        builder.HasIndex(acesso => acesso.FornecedorCasamentoId);

        builder.HasOne<CasamentoAssessorado>()
            .WithMany()
            .HasForeignKey(acesso => acesso.CasamentoId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<FornecedorCasamento>()
            .WithMany()
            .HasForeignKey(acesso => acesso.FornecedorCasamentoId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<Organizacao>()
            .WithMany()
            .HasForeignKey(acesso => acesso.OrganizacaoId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
