using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Celebri.Infraestrutura.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class DadosSensiveisConvidados : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "dados_sensiveis_convidados",
                columns: table => new
                {
                    convidado_id = table.Column<Guid>(type: "uuid", nullable: false),
                    organizacao_id = table.Column<Guid>(type: "uuid", nullable: false),
                    casamento_id = table.Column<Guid>(type: "uuid", nullable: false),
                    conteudo_cifrado = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: true),
                    consentido_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    versao_termo = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    origem_consentimento = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    registrado_por_usuario_id = table.Column<Guid>(type: "uuid", nullable: true),
                    atualizado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    excluido_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_dados_sensiveis_convidados", x => x.convidado_id);
                    table.CheckConstraint("ck_dados_sensiveis_convidados_exclusao", "(conteudo_cifrado IS NULL) = (excluido_em IS NOT NULL)");
                    table.CheckConstraint("ck_dados_sensiveis_convidados_origem_consentimento", "origem_consentimento IN ('Convidado', 'Cerimonialista')");
                    table.CheckConstraint("ck_dados_sensiveis_convidados_registrado_por", "(origem_consentimento = 'Cerimonialista') = (registrado_por_usuario_id IS NOT NULL)");
                    table.ForeignKey(
                        name: "fk_dados_sensiveis_convidados_casamentos_casamento_id",
                        column: x => x.casamento_id,
                        principalTable: "casamentos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_dados_sensiveis_convidados_convidados_convidado_id",
                        column: x => x.convidado_id,
                        principalTable: "convidados",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_dados_sensiveis_convidados_organizacoes_organizacao_id",
                        column: x => x.organizacao_id,
                        principalTable: "organizacoes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_dados_sensiveis_convidados_casamento_id",
                table: "dados_sensiveis_convidados",
                column: "casamento_id");

            migrationBuilder.CreateIndex(
                name: "ix_dados_sensiveis_convidados_organizacao_id_casamento_id",
                table: "dados_sensiveis_convidados",
                columns: new[] { "organizacao_id", "casamento_id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "dados_sensiveis_convidados");
        }
    }
}
