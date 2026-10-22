using Casamento.Dominio.Organizacoes;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Casamento.Infraestrutura.Persistencia.Configuracoes;

public class OrganizacaoConfiguration : IEntityTypeConfiguration<Organizacao>
{
    public void Configure(EntityTypeBuilder<Organizacao> builder)
    {
        builder.ToTable("organizacoes");
        builder.HasKey(organizacao => organizacao.Id);
        builder.Property(organizacao => organizacao.Id).ValueGeneratedNever();
        builder.Property(organizacao => organizacao.Nome).HasMaxLength(Organizacao.TamanhoMaximoNome).IsRequired();
        builder.Property(organizacao => organizacao.CriadaEm).IsRequired();
        builder.Property(organizacao => organizacao.ModeloChecklistSugeridoEm);
        builder.Property(organizacao => organizacao.ModeloCronogramaSugeridoEm);
        builder.Property<uint>("Versao").IsRowVersion().HasColumnName("xmin").HasColumnType("xid");
        builder.Ignore(organizacao => organizacao.PossuiModeloChecklistSugerido);
        builder.Ignore(organizacao => organizacao.PossuiModeloCronogramaSugerido);
    }
}
