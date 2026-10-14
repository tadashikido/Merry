using Casamento.Dominio.Organizacoes;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace Casamento.Testes.Integracao.Isolamento;

public class CustomizadorModeloIsolamento : ModelCustomizer
{
    public const string SqlCriarTabela = """
        CREATE TABLE IF NOT EXISTS registros_isolados (
            id uuid PRIMARY KEY,
            organizacao_id uuid NOT NULL REFERENCES organizacoes (id) ON DELETE RESTRICT,
            descricao varchar(200) NOT NULL
        );
        CREATE INDEX IF NOT EXISTS ix_registros_isolados_organizacao_id ON registros_isolados (organizacao_id);
        """;

    public CustomizadorModeloIsolamento(ModelCustomizerDependencies dependencias)
        : base(dependencias)
    {
    }

    public override void Customize(ModelBuilder modelBuilder, DbContext context)
    {
        modelBuilder.Entity<RegistroIsolado>(registro =>
        {
            registro.ToTable(RegistroIsolado.Tabela);
            registro.HasKey(item => item.Id);
            registro.Property(item => item.Id).ValueGeneratedNever();
            registro.Property(item => item.Descricao).HasMaxLength(RegistroIsolado.TamanhoMaximoDescricao).IsRequired();
            registro.HasIndex(item => item.OrganizacaoId);
            registro.HasOne<Organizacao>()
                .WithMany()
                .HasForeignKey(item => item.OrganizacaoId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        base.Customize(modelBuilder, context);
    }
}
