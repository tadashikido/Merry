using Celebri.Dominio.Eventos;
using Celebri.Dominio.Fornecedores;
using Celebri.Dominio.Organizacoes;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Celebri.Infraestrutura.Persistencia.Configuracoes;

public class FornecedorEventoConfiguration : IEntityTypeConfiguration<FornecedorEvento>
{
    public const string Tabela = "fornecedores_evento";
    public const string IndiceFornecedorUnico = "ux_fornecedores_evento_evento_id_fornecedor_id";
    public const string IndiceOrganizacaoEvento = "ix_fornecedores_evento_organizacao_id_evento_id";
    public const string IndiceOrganizacaoFornecedor = "ix_fornecedores_evento_organizacao_id_fornecedor_id";
    public const string ChaveEstrangeiraFornecedor = "fk_fornecedores_evento_fornecedores_fornecedor_id";
    public const string RestricaoStatus = "ck_fornecedores_evento_status";
    public const string RestricaoValores = "ck_fornecedores_evento_valores";
    public const string RestricaoContratado = "ck_fornecedores_evento_contratado";
    public const string RestricaoContrato = "ck_fornecedores_evento_contrato";
    public const string TipoValor = "numeric(12,2)";

    public void Configure(EntityTypeBuilder<FornecedorEvento> builder)
    {
        builder.ToTable(Tabela, tabela =>
        {
            tabela.HasCheckConstraint(RestricaoStatus, $"status IN ({ConviteConfiguration.ValoresPermitidos<StatusFornecedorEvento>()})");
            tabela.HasCheckConstraint(
                RestricaoValores,
                "(valor_orcado IS NULL OR valor_orcado >= 0) AND (valor_contratado IS NULL OR valor_contratado >= 0)");
            tabela.HasCheckConstraint(
                RestricaoContratado,
                $"status <> '{nameof(StatusFornecedorEvento.Contratado)}' OR valor_contratado IS NOT NULL");
            tabela.HasCheckConstraint(
                RestricaoContrato,
                "(contrato_arquivo_id IS NULL) = (contrato_nome_arquivo IS NULL) "
                + "AND (contrato_arquivo_id IS NULL) = (contrato_tamanho_bytes IS NULL) "
                + "AND (contrato_arquivo_id IS NULL) = (contrato_enviado_em IS NULL)");
        });

        builder.HasKey(vinculo => vinculo.Id);
        builder.Property(vinculo => vinculo.Id).ValueGeneratedNever();
        builder.Property(vinculo => vinculo.EventoId).IsRequired();
        builder.Property(vinculo => vinculo.FornecedorId).IsRequired();
        builder.Property(vinculo => vinculo.Servico).HasMaxLength(FornecedorEvento.TamanhoMaximoServico);
        builder.Property(vinculo => vinculo.ValorOrcado).HasColumnType(TipoValor);
        builder.Property(vinculo => vinculo.ValorContratado).HasColumnType(TipoValor);
        builder.Property(vinculo => vinculo.Status)
            .HasConversion<string>()
            .HasMaxLength(ConviteConfiguration.TamanhoMaximoEnum)
            .IsRequired();
        builder.Property(vinculo => vinculo.NotasInternas).HasMaxLength(FornecedorEvento.TamanhoMaximoNotas);
        builder.Property(vinculo => vinculo.ContratoArquivoId);
        builder.Property(vinculo => vinculo.ContratoNomeArquivo).HasMaxLength(FornecedorEvento.TamanhoMaximoNomeContrato);
        builder.Property(vinculo => vinculo.ContratoTamanhoBytes);
        builder.Property(vinculo => vinculo.ContratoEnviadoEm);
        builder.Property(vinculo => vinculo.CriadoPorUsuarioId);
        builder.Property(vinculo => vinculo.CriadoEm).IsRequired();
        builder.Property(vinculo => vinculo.AtualizadoEm).IsRequired();
        builder.Property<uint>("Versao").IsRowVersion().HasColumnName("xmin").HasColumnType("xid");
        builder.Ignore(vinculo => vinculo.PossuiContrato);
        builder.Ignore(vinculo => vinculo.Cancelado);

        builder.HasIndex(vinculo => new { vinculo.EventoId, vinculo.FornecedorId })
            .IsUnique()
            .HasDatabaseName(IndiceFornecedorUnico);
        builder.HasIndex(vinculo => new { vinculo.OrganizacaoId, vinculo.EventoId }).HasDatabaseName(IndiceOrganizacaoEvento);
        builder.HasIndex(vinculo => new { vinculo.OrganizacaoId, vinculo.FornecedorId }).HasDatabaseName(IndiceOrganizacaoFornecedor);

        builder.HasOne<Evento>()
            .WithMany()
            .HasForeignKey(vinculo => vinculo.EventoId)
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
