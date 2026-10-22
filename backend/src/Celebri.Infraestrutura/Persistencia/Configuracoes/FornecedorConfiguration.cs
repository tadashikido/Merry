using Celebri.Dominio.Convidados;
using Celebri.Dominio.Fornecedores;
using Celebri.Dominio.Organizacoes;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Celebri.Infraestrutura.Persistencia.Configuracoes;

public class FornecedorConfiguration : IEntityTypeConfiguration<Fornecedor>
{
    public const string Tabela = "fornecedores";
    public const string IndiceNomeUnico = "ux_fornecedores_organizacao_id_categoria_nome_normalizado";
    public const string RestricaoCategoria = "ck_fornecedores_categoria";

    public void Configure(EntityTypeBuilder<Fornecedor> builder)
    {
        builder.ToTable(Tabela, tabela =>
        {
            tabela.HasCheckConstraint(RestricaoCategoria, $"categoria IN ({ConviteConfiguration.ValoresPermitidos<CategoriaFornecedor>()})");
        });

        builder.HasKey(fornecedor => fornecedor.Id);
        builder.Property(fornecedor => fornecedor.Id).ValueGeneratedNever();
        builder.Property(fornecedor => fornecedor.Categoria)
            .HasConversion<string>()
            .HasMaxLength(ConviteConfiguration.TamanhoMaximoEnum)
            .IsRequired();
        builder.Property(fornecedor => fornecedor.NomeEmpresa).HasMaxLength(Fornecedor.TamanhoMaximoNomeEmpresa).IsRequired();
        builder.Property(fornecedor => fornecedor.NomeNormalizado).HasMaxLength(Fornecedor.TamanhoMaximoNomeEmpresa).IsRequired();
        builder.Property(fornecedor => fornecedor.Responsavel).HasMaxLength(Fornecedor.TamanhoMaximoResponsavel);
        builder.Property(fornecedor => fornecedor.Telefone).HasMaxLength(NormalizadorTelefone.TamanhoMaximoArmazenado);
        builder.Property(fornecedor => fornecedor.Email).HasMaxLength(ValidadorEmailConvidado.TamanhoMaximo);
        builder.Property(fornecedor => fornecedor.Site).HasMaxLength(NormalizadorContatoFornecedor.TamanhoMaximoSite);
        builder.Property(fornecedor => fornecedor.Instagram).HasMaxLength(NormalizadorContatoFornecedor.TamanhoMaximoInstagram);
        builder.Property(fornecedor => fornecedor.Observacoes).HasMaxLength(Fornecedor.TamanhoMaximoObservacoes);
        builder.Property(fornecedor => fornecedor.ArquivadoEm);
        builder.Property(fornecedor => fornecedor.CriadoEm).IsRequired();
        builder.Property(fornecedor => fornecedor.AtualizadoEm).IsRequired();
        builder.Property<uint>("Versao").IsRowVersion().HasColumnName("xmin").HasColumnType("xid");
        builder.Ignore(fornecedor => fornecedor.Arquivado);

        builder.HasIndex(fornecedor => new { fornecedor.OrganizacaoId, fornecedor.Categoria, fornecedor.NomeNormalizado })
            .IsUnique()
            .HasDatabaseName(IndiceNomeUnico);

        builder.HasOne<Organizacao>()
            .WithMany()
            .HasForeignKey(fornecedor => fornecedor.OrganizacaoId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
