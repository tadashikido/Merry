using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Celebri.Infraestrutura.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class FornecedoresCasamento : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "fornecedores_casamento",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organizacao_id = table.Column<Guid>(type: "uuid", nullable: false),
                    casamento_id = table.Column<Guid>(type: "uuid", nullable: false),
                    fornecedor_id = table.Column<Guid>(type: "uuid", nullable: false),
                    servico = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    valor_orcado = table.Column<decimal>(type: "numeric(12,2)", nullable: true),
                    valor_contratado = table.Column<decimal>(type: "numeric(12,2)", nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    notas_internas = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    contrato_arquivo_id = table.Column<Guid>(type: "uuid", nullable: true),
                    contrato_nome_arquivo = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    contrato_tamanho_bytes = table.Column<long>(type: "bigint", nullable: true),
                    contrato_enviado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    criado_por_usuario_id = table.Column<Guid>(type: "uuid", nullable: true),
                    criado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    atualizado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_fornecedores_casamento", x => x.id);
                    table.CheckConstraint("ck_fornecedores_casamento_contratado", "status <> 'Contratado' OR valor_contratado IS NOT NULL");
                    table.CheckConstraint("ck_fornecedores_casamento_contrato", "(contrato_arquivo_id IS NULL) = (contrato_nome_arquivo IS NULL) AND (contrato_arquivo_id IS NULL) = (contrato_tamanho_bytes IS NULL) AND (contrato_arquivo_id IS NULL) = (contrato_enviado_em IS NULL)");
                    table.CheckConstraint("ck_fornecedores_casamento_status", "status IN ('Cotacao', 'EmNegociacao', 'Contratado', 'Cancelado')");
                    table.CheckConstraint("ck_fornecedores_casamento_valores", "(valor_orcado IS NULL OR valor_orcado >= 0) AND (valor_contratado IS NULL OR valor_contratado >= 0)");
                    table.ForeignKey(
                        name: "fk_fornecedores_casamento_casamentos_casamento_id",
                        column: x => x.casamento_id,
                        principalTable: "casamentos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_fornecedores_casamento_fornecedores_fornecedor_id",
                        column: x => x.fornecedor_id,
                        principalTable: "fornecedores",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_fornecedores_casamento_organizacoes_organizacao_id",
                        column: x => x.organizacao_id,
                        principalTable: "organizacoes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_fornecedores_casamento_fornecedor_id",
                table: "fornecedores_casamento",
                column: "fornecedor_id");

            migrationBuilder.CreateIndex(
                name: "ix_fornecedores_casamento_organizacao_id_casamento_id",
                table: "fornecedores_casamento",
                columns: new[] { "organizacao_id", "casamento_id" });

            migrationBuilder.CreateIndex(
                name: "ix_fornecedores_casamento_organizacao_id_fornecedor_id",
                table: "fornecedores_casamento",
                columns: new[] { "organizacao_id", "fornecedor_id" });

            migrationBuilder.CreateIndex(
                name: "ux_fornecedores_casamento_casamento_id_fornecedor_id",
                table: "fornecedores_casamento",
                columns: new[] { "casamento_id", "fornecedor_id" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "fornecedores_casamento");
        }
    }
}
