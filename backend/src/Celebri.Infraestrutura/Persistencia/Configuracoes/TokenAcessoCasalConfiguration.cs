using Casamento.Dominio.AcessosCasal;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Casamento.Infraestrutura.Persistencia.Configuracoes;

public class TokenAcessoCasalConfiguration : IEntityTypeConfiguration<TokenAcessoCasal>
{
    public const string Tabela = "tokens_acesso_casal";
    public const string IndiceTokenHash = "ix_tokens_acesso_casal_token_hash";
    public const string IndiceAcesso = "ix_tokens_acesso_casal_acesso_casal_id";

    public void Configure(EntityTypeBuilder<TokenAcessoCasal> builder)
    {
        builder.ToTable(Tabela);
        builder.HasKey(token => token.Id);
        builder.Property(token => token.Id).ValueGeneratedNever();
        builder.Property(token => token.AcessoCasalId).IsRequired();
        builder.Property(token => token.CasamentoId).IsRequired();
        builder.Property(token => token.OrganizacaoId).IsRequired();
        builder.Property(token => token.TokenHash).HasMaxLength(TokenAcessoCasal.TamanhoHash).IsFixedLength().IsRequired();
        builder.Property(token => token.GeradoEm).IsRequired();
        builder.Property<uint>("Versao").IsRowVersion().HasColumnName("xmin").HasColumnType("xid");

        builder.HasIndex(token => token.TokenHash).IsUnique().HasDatabaseName(IndiceTokenHash);
        builder.HasIndex(token => token.AcessoCasalId).IsUnique().HasDatabaseName(IndiceAcesso);

        builder.HasOne<AcessoCasal>()
            .WithMany()
            .HasForeignKey(token => token.AcessoCasalId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
