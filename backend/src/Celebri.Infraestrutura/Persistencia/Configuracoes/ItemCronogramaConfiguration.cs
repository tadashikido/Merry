using Celebri.Dominio.Cronogramas;
using Celebri.Dominio.Eventos;
using Celebri.Dominio.Fornecedores;
using Celebri.Dominio.Organizacoes;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Celebri.Infraestrutura.Persistencia.Configuracoes;

public class ItemCronogramaConfiguration : IEntityTypeConfiguration<ItemCronograma>
{
    public const string Tabela = "itens_cronograma";
    public const string IndiceOrganizacaoEvento = "ix_itens_cronograma_organizacao_id_evento_id";
    public const string IndiceEventoFornecedor = "ix_itens_cronograma_evento_id_fornecedor_evento_id";
    public const string IndiceEventoResponsavel = "ix_itens_cronograma_evento_id_responsavel_chave";
    public const string ChaveEstrangeiraFornecedor = "fk_itens_cronograma_fornecedores_evento_fornecedor_evento_id";
    public const string RestricaoDia = "ck_itens_cronograma_dia";
    public const string RestricaoStatus = "ck_itens_cronograma_status";
    public const string RestricaoDuracao = "ck_itens_cronograma_duracao";
    public const string RestricaoConclusao = "ck_itens_cronograma_conclusao";
    public const string RestricaoMinutosRelativos = "ck_itens_cronograma_minutos_relativos_cerimonia";
    public const string IndiceOrigemModeloUnica = "ux_itens_cronograma_evento_id_origem_modelo_item_id";

    public void Configure(EntityTypeBuilder<ItemCronograma> builder)
    {
        builder.ToTable(Tabela, tabela =>
        {
            tabela.HasCheckConstraint(RestricaoDia, $"dia IN ({ConviteConfiguration.ValoresPermitidos<DiaCronograma>()})");
            tabela.HasCheckConstraint(RestricaoStatus, $"status IN ({ConviteConfiguration.ValoresPermitidos<StatusItemCronograma>()})");
            tabela.HasCheckConstraint(
                RestricaoDuracao,
                $"duracao_minutos IS NULL OR duracao_minutos BETWEEN {ItemCronograma.DuracaoMinima} AND {ItemCronograma.DuracaoMaxima}");
            tabela.HasCheckConstraint(
                RestricaoConclusao,
                $"(status = '{nameof(StatusItemCronograma.Concluido)}') = (concluido_em IS NOT NULL)");
            tabela.HasCheckConstraint(
                RestricaoMinutosRelativos,
                $"minutos_relativos_cerimonia IS NULL OR minutos_relativos_cerimonia BETWEEN {-ItemCronograma.MinutosRelativosMaximo} AND {ItemCronograma.MinutosRelativosMaximo}");
        });

        builder.HasKey(item => item.Id);
        builder.Property(item => item.Id).ValueGeneratedNever();
        builder.Property(item => item.EventoId).IsRequired();
        builder.Property(item => item.Dia)
            .HasConversion<string>()
            .HasMaxLength(ConviteConfiguration.TamanhoMaximoEnum)
            .IsRequired();
        builder.Property(item => item.Inicio).IsRequired();
        builder.Property(item => item.DuracaoMinutos);
        builder.Property(item => item.Atividade).HasMaxLength(ItemCronograma.TamanhoMaximoAtividade).IsRequired();
        builder.Property(item => item.Local).HasMaxLength(ItemCronograma.TamanhoMaximoLocal);
        builder.Property(item => item.Responsavel).HasMaxLength(ItemCronograma.TamanhoMaximoResponsavel);
        builder.Property(item => item.ResponsavelChave).HasMaxLength(ItemCronograma.TamanhoMaximoResponsavel);
        builder.Property(item => item.FornecedorEventoId);
        builder.Property(item => item.Instrucoes).HasMaxLength(ItemCronograma.TamanhoMaximoTexto);
        builder.Property(item => item.NotasInternas).HasMaxLength(ItemCronograma.TamanhoMaximoTexto);
        builder.Property(item => item.Status)
            .HasConversion<string>()
            .HasMaxLength(ConviteConfiguration.TamanhoMaximoEnum)
            .IsRequired();
        builder.Property(item => item.ConcluidoEm);
        builder.Property(item => item.CriadoPorUsuarioId);
        builder.Property(item => item.CriadoEm).IsRequired();
        builder.Property(item => item.AtualizadoEm).IsRequired();
        builder.Property(item => item.OrigemModeloItemId);
        builder.Property(item => item.MinutosRelativosCerimonia);
        builder.Property<uint>("Versao").IsRowVersion().HasColumnName("xmin").HasColumnType("xid");

        builder.Ignore(item => item.MinutoInicial);
        builder.Ignore(item => item.MinutoFinal);
        builder.Ignore(item => item.Termino);
        builder.Ignore(item => item.TerminaEmOutroDia);
        builder.Ignore(item => item.AncoradoEmModelo);

        builder.HasIndex(item => new { item.OrganizacaoId, item.EventoId }).HasDatabaseName(IndiceOrganizacaoEvento);
        builder.HasIndex(item => new { item.EventoId, item.FornecedorEventoId }).HasDatabaseName(IndiceEventoFornecedor);
        builder.HasIndex(item => new { item.EventoId, item.ResponsavelChave }).HasDatabaseName(IndiceEventoResponsavel);

        builder.HasOne<Evento>()
            .WithMany()
            .HasForeignKey(item => item.EventoId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<FornecedorEvento>()
            .WithMany()
            .HasForeignKey(item => item.FornecedorEventoId)
            .HasConstraintName(ChaveEstrangeiraFornecedor)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(item => new { item.EventoId, item.OrigemModeloItemId })
            .IsUnique()
            .HasFilter("origem_modelo_item_id IS NOT NULL")
            .HasDatabaseName(IndiceOrigemModeloUnica);

        builder.HasOne<ItemModeloCronograma>()
            .WithMany()
            .HasForeignKey(item => item.OrigemModeloItemId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne<Organizacao>()
            .WithMany()
            .HasForeignKey(item => item.OrganizacaoId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
