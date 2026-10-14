using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Casamento.Infraestrutura.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class ParcelasFornecedor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "parcelas_fornecedor",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organizacao_id = table.Column<Guid>(type: "uuid", nullable: false),
                    casamento_id = table.Column<Guid>(type: "uuid", nullable: false),
                    fornecedor_casamento_id = table.Column<Guid>(type: "uuid", nullable: false),
                    valor = table.Column<decimal>(type: "numeric(12,2)", nullable: false),
                    vencimento = table.Column<DateOnly>(type: "date", nullable: false),
                    observacao = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    paga_em = table.Column<DateOnly>(type: "date", nullable: true),
                    comprovante_arquivo_id = table.Column<Guid>(type: "uuid", nullable: true),
                    comprovante_nome_arquivo = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    comprovante_tipo_conteudo = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    comprovante_tamanho_bytes = table.Column<long>(type: "bigint", nullable: true),
                    comprovante_enviado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    criado_por_usuario_id = table.Column<Guid>(type: "uuid", nullable: true),
                    criado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    atualizado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_parcelas_fornecedor", x => x.id);
                    table.CheckConstraint("ck_parcelas_fornecedor_comprovante", "(comprovante_arquivo_id IS NULL) = (comprovante_nome_arquivo IS NULL) AND (comprovante_arquivo_id IS NULL) = (comprovante_tipo_conteudo IS NULL) AND (comprovante_arquivo_id IS NULL) = (comprovante_tamanho_bytes IS NULL) AND (comprovante_arquivo_id IS NULL) = (comprovante_enviado_em IS NULL) AND (comprovante_arquivo_id IS NULL OR status = 'Paga')");
                    table.CheckConstraint("ck_parcelas_fornecedor_pagamento", "(status = 'Paga') = (paga_em IS NOT NULL)");
                    table.CheckConstraint("ck_parcelas_fornecedor_status", "status IN ('Pendente', 'Paga')");
                    table.CheckConstraint("ck_parcelas_fornecedor_tipo_comprovante", "comprovante_tipo_conteudo IS NULL OR comprovante_tipo_conteudo IN ('application/pdf', 'image/jpeg', 'image/png')");
                    table.CheckConstraint("ck_parcelas_fornecedor_valor", "valor > 0");
                    table.ForeignKey(
                        name: "fk_parcelas_fornecedor_casamentos_casamento_id",
                        column: x => x.casamento_id,
                        principalTable: "casamentos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_parcelas_fornecedor_fornecedores_casamento_fornecedor_casamento_id",
                        column: x => x.fornecedor_casamento_id,
                        principalTable: "fornecedores_casamento",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_parcelas_fornecedor_organizacoes_organizacao_id",
                        column: x => x.organizacao_id,
                        principalTable: "organizacoes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_parcelas_fornecedor_casamento_id",
                table: "parcelas_fornecedor",
                column: "casamento_id");

            migrationBuilder.CreateIndex(
                name: "ix_parcelas_fornecedor_fornecedor_casamento_id",
                table: "parcelas_fornecedor",
                column: "fornecedor_casamento_id");

            migrationBuilder.CreateIndex(
                name: "ix_parcelas_fornecedor_organizacao_id_casamento_id",
                table: "parcelas_fornecedor",
                columns: new[] { "organizacao_id", "casamento_id" });

            migrationBuilder.CreateIndex(
                name: "ix_parcelas_fornecedor_organizacao_id_fornecedor_casamento_id",
                table: "parcelas_fornecedor",
                columns: new[] { "organizacao_id", "fornecedor_casamento_id" });

            migrationBuilder.CreateIndex(
                name: "ix_parcelas_fornecedor_organizacao_id_status_vencimento",
                table: "parcelas_fornecedor",
                columns: new[] { "organizacao_id", "status", "vencimento" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "parcelas_fornecedor");
        }
    }
}
