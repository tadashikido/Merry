using Celebri.Dominio.Casamentos;
using Celebri.Dominio.Financeiro;
using Celebri.Dominio.Fornecedores;
using Celebri.Dominio.Organizacoes;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Celebri.Infraestrutura.Persistencia.Configuracoes;

public class ParcelaFornecedorConfiguration : IEntityTypeConfiguration<ParcelaFornecedor>
{
    public const string Tabela = "parcelas_fornecedor";
    public const string IndiceOrganizacaoCasamento = "ix_parcelas_fornecedor_organizacao_id_casamento_id";
    public const string IndiceOrganizacaoVinculo = "ix_parcelas_fornecedor_organizacao_id_fornecedor_casamento_id";
    public const string IndiceOrganizacaoStatusVencimento = "ix_parcelas_fornecedor_organizacao_id_status_vencimento";
    public const string ChaveEstrangeiraVinculo = "fk_parcelas_fornecedor_fornecedores_casamento_fornecedor_casamento_id";
    public const string RestricaoValor = "ck_parcelas_fornecedor_valor";
    public const string RestricaoStatus = "ck_parcelas_fornecedor_status";
    public const string RestricaoPagamento = "ck_parcelas_fornecedor_pagamento";
    public const string RestricaoComprovante = "ck_parcelas_fornecedor_comprovante";
    public const string RestricaoTipoComprovante = "ck_parcelas_fornecedor_tipo_comprovante";

    public void Configure(EntityTypeBuilder<ParcelaFornecedor> builder)
    {
        builder.ToTable(Tabela, tabela =>
        {
            tabela.HasCheckConstraint(RestricaoValor, "valor > 0");
            tabela.HasCheckConstraint(RestricaoStatus, $"status IN ({ConviteConfiguration.ValoresPermitidos<StatusParcela>()})");
            tabela.HasCheckConstraint(RestricaoPagamento, $"(status = '{nameof(StatusParcela.Paga)}') = (paga_em IS NOT NULL)");
            tabela.HasCheckConstraint(
                RestricaoComprovante,
                "(comprovante_arquivo_id IS NULL) = (comprovante_nome_arquivo IS NULL) "
                + "AND (comprovante_arquivo_id IS NULL) = (comprovante_tipo_conteudo IS NULL) "
                + "AND (comprovante_arquivo_id IS NULL) = (comprovante_tamanho_bytes IS NULL) "
                + "AND (comprovante_arquivo_id IS NULL) = (comprovante_enviado_em IS NULL) "
                + $"AND (comprovante_arquivo_id IS NULL OR status = '{nameof(StatusParcela.Paga)}')");
            tabela.HasCheckConstraint(
                RestricaoTipoComprovante,
                "comprovante_tipo_conteudo IS NULL OR comprovante_tipo_conteudo IN ('application/pdf', 'image/jpeg', 'image/png')");
        });

        builder.HasKey(parcela => parcela.Id);
        builder.Property(parcela => parcela.Id).ValueGeneratedNever();
        builder.Property(parcela => parcela.CasamentoId).IsRequired();
        builder.Property(parcela => parcela.FornecedorCasamentoId).IsRequired();
        builder.Property(parcela => parcela.Valor).HasColumnType(FornecedorCasamentoConfiguration.TipoValor).IsRequired();
        builder.Property(parcela => parcela.Vencimento).IsRequired();
        builder.Property(parcela => parcela.Observacao).HasMaxLength(ParcelaFornecedor.TamanhoMaximoObservacao);
        builder.Property(parcela => parcela.Status)
            .HasConversion<string>()
            .HasMaxLength(ConviteConfiguration.TamanhoMaximoEnum)
            .IsRequired();
        builder.Property(parcela => parcela.PagaEm);
        builder.Property(parcela => parcela.ComprovanteArquivoId);
        builder.Property(parcela => parcela.ComprovanteNomeArquivo).HasMaxLength(ParcelaFornecedor.TamanhoMaximoNomeComprovante);
        builder.Property(parcela => parcela.ComprovanteTipoConteudo).HasMaxLength(ParcelaFornecedor.TamanhoMaximoTipoComprovante);
        builder.Property(parcela => parcela.ComprovanteTamanhoBytes);
        builder.Property(parcela => parcela.ComprovanteEnviadoEm);
        builder.Property(parcela => parcela.CriadoPorUsuarioId);
        builder.Property(parcela => parcela.CriadoEm).IsRequired();
        builder.Property(parcela => parcela.AtualizadoEm).IsRequired();
        builder.Property<uint>("Versao").IsRowVersion().HasColumnName("xmin").HasColumnType("xid");
        builder.Ignore(parcela => parcela.Paga);
        builder.Ignore(parcela => parcela.PossuiComprovante);

        builder.HasIndex(parcela => new { parcela.OrganizacaoId, parcela.CasamentoId }).HasDatabaseName(IndiceOrganizacaoCasamento);
        builder.HasIndex(parcela => new { parcela.OrganizacaoId, parcela.FornecedorCasamentoId }).HasDatabaseName(IndiceOrganizacaoVinculo);
        builder.HasIndex(parcela => new { parcela.OrganizacaoId, parcela.Status, parcela.Vencimento })
            .HasDatabaseName(IndiceOrganizacaoStatusVencimento);

        builder.HasOne<FornecedorCasamento>()
            .WithMany()
            .HasForeignKey(parcela => parcela.FornecedorCasamentoId)
            .HasConstraintName(ChaveEstrangeiraVinculo)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<CasamentoAssessorado>()
            .WithMany()
            .HasForeignKey(parcela => parcela.CasamentoId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Organizacao>()
            .WithMany()
            .HasForeignKey(parcela => parcela.OrganizacaoId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
