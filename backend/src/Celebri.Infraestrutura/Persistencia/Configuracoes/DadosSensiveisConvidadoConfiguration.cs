using Casamento.Dominio.Casamentos;
using Casamento.Dominio.Convidados;
using Casamento.Dominio.DadosSensiveis;
using Casamento.Dominio.Organizacoes;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Casamento.Infraestrutura.Persistencia.Configuracoes;

public class DadosSensiveisConvidadoConfiguration : IEntityTypeConfiguration<DadosSensiveisConvidado>
{
    public const string Tabela = "dados_sensiveis_convidados";
    public const string IndiceOrganizacaoCasamento = "ix_dados_sensiveis_convidados_organizacao_id_casamento_id";
    public const string RestricaoOrigem = "ck_dados_sensiveis_convidados_origem_consentimento";
    public const string RestricaoUsuarioRegistro = "ck_dados_sensiveis_convidados_registrado_por";
    public const string RestricaoExclusao = "ck_dados_sensiveis_convidados_exclusao";

    public void Configure(EntityTypeBuilder<DadosSensiveisConvidado> builder)
    {
        builder.ToTable(Tabela, tabela =>
        {
            tabela.HasCheckConstraint(
                RestricaoOrigem,
                $"origem_consentimento IN ({ConviteConfiguration.ValoresPermitidos<OrigemConsentimento>()})");
            tabela.HasCheckConstraint(
                RestricaoUsuarioRegistro,
                $"(origem_consentimento = '{nameof(OrigemConsentimento.Cerimonialista)}') = (registrado_por_usuario_id IS NOT NULL)");
            tabela.HasCheckConstraint(RestricaoExclusao, "(conteudo_cifrado IS NULL) = (excluido_em IS NOT NULL)");
        });

        builder.HasKey(dados => dados.ConvidadoId);
        builder.Property(dados => dados.ConvidadoId).ValueGeneratedNever();
        builder.Property(dados => dados.CasamentoId).IsRequired();
        builder.Property(dados => dados.ConteudoCifrado).HasMaxLength(DadosSensiveisConvidado.TamanhoMaximoConteudoCifrado);
        builder.Property(dados => dados.ConsentidoEm).IsRequired();
        builder.Property(dados => dados.VersaoTermo).HasMaxLength(DadosSensiveisConvidado.TamanhoMaximoVersaoTermo).IsRequired();
        builder.Property(dados => dados.OrigemConsentimento)
            .HasConversion<string>()
            .HasMaxLength(ConviteConfiguration.TamanhoMaximoEnum)
            .IsRequired();
        builder.Property(dados => dados.RegistradoPorUsuarioId);
        builder.Property(dados => dados.AtualizadoEm).IsRequired();
        builder.Property(dados => dados.ExcluidoEm);
        builder.Ignore(dados => dados.Vigente);

        builder.HasIndex(dados => new { dados.OrganizacaoId, dados.CasamentoId }).HasDatabaseName(IndiceOrganizacaoCasamento);

        builder.HasOne<Convidado>()
            .WithOne(convidado => convidado.DadosSensiveis)
            .HasForeignKey<DadosSensiveisConvidado>(dados => dados.ConvidadoId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<CasamentoAssessorado>()
            .WithMany()
            .HasForeignKey(dados => dados.CasamentoId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Organizacao>()
            .WithMany()
            .HasForeignKey(dados => dados.OrganizacaoId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
