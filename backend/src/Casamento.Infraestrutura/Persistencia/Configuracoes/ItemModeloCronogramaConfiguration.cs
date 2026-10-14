using Casamento.Dominio.Cronogramas;
using Casamento.Dominio.Fornecedores;
using Casamento.Dominio.Organizacoes;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Casamento.Infraestrutura.Persistencia.Configuracoes;

public class ItemModeloCronogramaConfiguration : IEntityTypeConfiguration<ItemModeloCronograma>
{
    public const string Tabela = "itens_modelo_cronograma";
    public const string IndiceOrganizacaoModelo = "ix_itens_modelo_cronograma_organizacao_id_modelo_id";
    public const string RestricaoMinutos = "ck_itens_modelo_cronograma_minutos";
    public const string RestricaoDuracao = "ck_itens_modelo_cronograma_duracao";
    public const string RestricaoReferenciaLocal = "ck_itens_modelo_cronograma_referencia_local";
    public const string RestricaoCategoria = "ck_itens_modelo_cronograma_categoria_fornecedor";

    public void Configure(EntityTypeBuilder<ItemModeloCronograma> builder)
    {
        builder.ToTable(Tabela, tabela =>
        {
            tabela.HasCheckConstraint(
                RestricaoMinutos,
                $"minutos_desde_cerimonia BETWEEN {-ItemCronograma.MinutosRelativosMaximo} AND {ItemCronograma.MinutosRelativosMaximo}");
            tabela.HasCheckConstraint(
                RestricaoDuracao,
                $"duracao_minutos IS NULL OR duracao_minutos BETWEEN {ItemCronograma.DuracaoMinima} AND {ItemCronograma.DuracaoMaxima}");
            tabela.HasCheckConstraint(
                RestricaoReferenciaLocal,
                $"referencia_local IS NULL OR referencia_local IN ({ConviteConfiguration.ValoresPermitidos<ReferenciaLocalCronograma>()})");
            tabela.HasCheckConstraint(
                RestricaoCategoria,
                $"categoria_fornecedor IS NULL OR categoria_fornecedor IN ({ConviteConfiguration.ValoresPermitidos<CategoriaFornecedor>()})");
        });

        builder.HasKey(item => item.Id);
        builder.Property(item => item.Id).ValueGeneratedNever();
        builder.Property(item => item.ModeloId).IsRequired();
        builder.Property(item => item.MinutosDesdeCerimonia).IsRequired();
        builder.Property(item => item.DuracaoMinutos);
        builder.Property(item => item.Atividade).HasMaxLength(ItemCronograma.TamanhoMaximoAtividade).IsRequired();
        builder.Property(item => item.ReferenciaLocal)
            .HasConversion<string>()
            .HasMaxLength(ConviteConfiguration.TamanhoMaximoEnum);
        builder.Property(item => item.Local).HasMaxLength(ItemCronograma.TamanhoMaximoLocal);
        builder.Property(item => item.Responsavel).HasMaxLength(ItemCronograma.TamanhoMaximoResponsavel);
        builder.Property(item => item.CategoriaFornecedor)
            .HasConversion<string>()
            .HasMaxLength(ConviteConfiguration.TamanhoMaximoEnum);
        builder.Property(item => item.Instrucoes).HasMaxLength(ItemCronograma.TamanhoMaximoTexto);
        builder.Property(item => item.CriadoEm).IsRequired();
        builder.Property(item => item.AtualizadoEm).IsRequired();
        builder.Property<uint>("Versao").IsRowVersion().HasColumnName("xmin").HasColumnType("xid");

        builder.HasIndex(item => new { item.OrganizacaoId, item.ModeloId }).HasDatabaseName(IndiceOrganizacaoModelo);

        builder.HasOne<Organizacao>()
            .WithMany()
            .HasForeignKey(item => item.OrganizacaoId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
