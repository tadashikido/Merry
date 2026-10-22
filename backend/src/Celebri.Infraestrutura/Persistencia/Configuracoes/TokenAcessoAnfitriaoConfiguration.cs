using Celebri.Dominio.AcessosAnfitriao;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Celebri.Infraestrutura.Persistencia.Configuracoes;

public class TokenAcessoAnfitriaoConfiguration : IEntityTypeConfiguration<TokenAcessoAnfitriao>
{
    public const string Tabela = "tokens_acesso_anfitriao";
    public const string IndiceTokenHash = "ix_tokens_acesso_anfitriao_token_hash";
    public const string IndiceAcesso = "ix_tokens_acesso_anfitriao_acesso_anfitriao_id";

    public void Configure(EntityTypeBuilder<TokenAcessoAnfitriao> builder)
    {
        builder.ToTable(Tabela);
        builder.HasKey(token => token.Id);
        builder.Property(token => token.Id).ValueGeneratedNever();
        builder.Property(token => token.AcessoAnfitriaoId).IsRequired();
        builder.Property(token => token.EventoId).IsRequired();
        builder.Property(token => token.OrganizacaoId).IsRequired();
        builder.Property(token => token.TokenHash).HasMaxLength(TokenAcessoAnfitriao.TamanhoHash).IsFixedLength().IsRequired();
        builder.Property(token => token.GeradoEm).IsRequired();
        builder.Property<uint>("Versao").IsRowVersion().HasColumnName("xmin").HasColumnType("xid");

        builder.HasIndex(token => token.TokenHash).IsUnique().HasDatabaseName(IndiceTokenHash);
        builder.HasIndex(token => token.AcessoAnfitriaoId).IsUnique().HasDatabaseName(IndiceAcesso);

        builder.HasOne<AcessoAnfitriao>()
            .WithMany()
            .HasForeignKey(token => token.AcessoAnfitriaoId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
