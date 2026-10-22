using Celebri.Dominio.Casamentos;
using Celebri.Dominio.Fornecedores;
using Celebri.Dominio.Organizacoes;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Celebri.Infraestrutura.Persistencia.Configuracoes;

public class FornecedorCasamentoConfiguration : IEntityTypeConfiguration<FornecedorCasamento>
{
    public const string Tabela = "fornecedores_casamento";
    public const string IndiceFornecedorUnico = "ux_fornecedores_casamento_casamento_id_fornecedor_id";
    public const string IndiceOrganizacaoCasamento = "ix_fornecedores_casamento_organizacao_id_casamento_id";
    public const string IndiceOrganizacaoFornecedor = "ix_fornecedores_casamento_organizacao_id_fornecedor_id";
    public const string ChaveEstrangeiraFornecedor = "fk_fornecedores_casamento_fornecedores_fornecedor_id";
    public const string RestricaoStatus = "ck_fornecedores_casamento_status";
    public const string RestricaoValores = "ck_fornecedores_casamento_valores";
    public const string RestricaoContratado = "ck_fornecedores_casamento_contratado";
    public const string RestricaoContrato = "ck_fornecedores_casamento_contrato";
    public const string TipoValor = "numeric(12,2)";

    public void Configure(EntityTypeBuilder<FornecedorCasamento> builder)
    {
        builder.ToTable(Tabela, tabela =>
        {
            tabela.HasCheckConstraint(RestricaoStatus, $"status IN ({ConviteConfiguration.ValoresPermitidos<StatusFornecedorCasamento>()})");
            tabela.HasCheckConstraint(
                RestricaoValores,
                "(valor_orcado IS NULL OR valor_orcado >= 0) AND (valor_contratado IS NULL OR valor_contratado >= 0)");
            tabela.HasCheckConstraint(
                RestricaoContratado,
                $"status <> '{nameof(StatusFornecedorCasamento.Contratado)}' OR valor_contratado IS NOT NULL");
            tabela.HasCheckConstraint(
                RestricaoContrato,
                "(contrato_arquivo_id IS NULL) = (contrato_nome_arquivo IS NULL) "
                + "AND (contrato_arquivo_id IS NULL) = (contrato_tamanho_bytes IS NULL) "
                + "AND (contrato_arquivo_id IS NULL) = (contrato_enviado_em IS NULL)");
        });

        builder.HasKey(vinculo => vinculo.Id);
        builder.Property(vinculo => vinculo.Id).ValueGeneratedNever();
        builder.Property(vinculo => vinculo.CasamentoId).IsRequired();
        builder.Property(vinculo => vinculo.FornecedorId).IsRequired();
        builder.Property(vinculo => vinculo.Servico).HasMaxLength(FornecedorCasamento.TamanhoMaximoServico);
        builder.Property(vinculo => vinculo.ValorOrcado).HasColumnType(TipoValor);
        builder.Property(vinculo => vinculo.ValorContratado).HasColumnType(TipoValor);
        builder.Property(vinculo => vinculo.Status)
            .HasConversion<string>()
            .HasMaxLength(ConviteConfiguration.TamanhoMaximoEnum)
            .IsRequired();
        builder.Property(vinculo => vinculo.NotasInternas).HasMaxLength(FornecedorCasamento.TamanhoMaximoNotas);
        builder.Property(vinculo => vinculo.ContratoArquivoId);
        builder.Property(vinculo => vinculo.ContratoNomeArquivo).HasMaxLength(FornecedorCasamento.TamanhoMaximoNomeContrato);
        builder.Property(vinculo => vinculo.ContratoTamanhoBytes);
        builder.Property(vinculo => vinculo.ContratoEnviadoEm);
        builder.Property(vinculo => vinculo.CriadoPorUsuarioId);
        builder.Property(vinculo => vinculo.CriadoEm).IsRequired();
        builder.Property(vinculo => vinculo.AtualizadoEm).IsRequired();
        builder.Property<uint>("Versao").IsRowVersion().HasColumnName("xmin").HasColumnType("xid");
        builder.Ignore(vinculo => vinculo.PossuiContrato);
        builder.Ignore(vinculo => vinculo.Cancelado);

        builder.HasIndex(vinculo => new { vinculo.CasamentoId, vinculo.FornecedorId })
            .IsUnique()
            .HasDatabaseName(IndiceFornecedorUnico);
        builder.HasIndex(vinculo => new { vinculo.OrganizacaoId, vinculo.CasamentoId }).HasDatabaseName(IndiceOrganizacaoCasamento);
        builder.HasIndex(vinculo => new { vinculo.OrganizacaoId, vinculo.FornecedorId }).HasDatabaseName(IndiceOrganizacaoFornecedor);

        builder.HasOne<CasamentoAssessorado>()
            .WithMany()
            .HasForeignKey(vinculo => vinculo.CasamentoId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Fornecedor>()
            .WithMany()
            .HasForeignKey(vinculo => vinculo.FornecedorId)
            .HasConstraintName(ChaveEstrangeiraFornecedor)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Organizacao>()
            .WithMany()
            .HasForeignKey(vinculo => vinculo.OrganizacaoId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
