using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Celebri.Infraestrutura.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class CadastroCasamentos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "casamentos",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organizacao_id = table.Column<Guid>(type: "uuid", nullable: false),
                    nome_primeira_pessoa = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    nome_segunda_pessoa = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    data = table.Column<DateOnly>(type: "date", nullable: false),
                    horario = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    local_cerimonia = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    local_recepcao = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    convidados_estimados = table.Column<int>(type: "integer", nullable: true),
                    observacoes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    arquivado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    criado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    atualizado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_casamentos", x => x.id);
                    table.CheckConstraint("ck_casamentos_convidados_estimados", "convidados_estimados IS NULL OR convidados_estimados BETWEEN 1 AND 5000");
                    table.CheckConstraint("ck_casamentos_data", "data BETWEEN DATE '2000-01-01' AND DATE '2100-12-31'");
                    table.ForeignKey(
                        name: "fk_casamentos_organizacoes_organizacao_id",
                        column: x => x.organizacao_id,
                        principalTable: "organizacoes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_casamentos_organizacao_id_data",
                table: "casamentos",
                columns: new[] { "organizacao_id", "data" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "casamentos");
        }
    }
}
