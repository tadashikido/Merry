using Celebri.Dominio.Impersonacao;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Celebri.Infraestrutura.Persistencia.Configuracoes;

public class SessaoImpersonacaoConfiguration : IEntityTypeConfiguration<SessaoImpersonacao>
{
    public void Configure(EntityTypeBuilder<SessaoImpersonacao> builder)
    {
        builder.ToTable("sessoes_impersonacao");
        builder.HasKey(sessao => sessao.Id);
        builder.Property(sessao => sessao.Id).ValueGeneratedNever();
        builder.Property(sessao => sessao.OperadorId).IsRequired();
        builder.Property(sessao => sessao.OrganizacaoId).IsRequired();
        builder.Property(sessao => sessao.Motivo).HasMaxLength(SessaoImpersonacao.TamanhoMaximoMotivo).IsRequired();
        builder.Property(sessao => sessao.IniciadaEm).IsRequired();
        builder.Property(sessao => sessao.ExpiraEm).IsRequired();
        builder.Property<uint>("Versao").IsRowVersion().HasColumnName("xmin").HasColumnType("xid");

        builder.HasIndex(sessao => sessao.OperadorId);
        builder.HasIndex(sessao => sessao.OrganizacaoId);
        builder.HasIndex(sessao => sessao.IniciadaEm);
    }
}
