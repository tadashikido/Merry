using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Celebri.Infraestrutura.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class LinksCronograma : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "acessos_cronograma",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organizacao_id = table.Column<Guid>(type: "uuid", nullable: false),
                    casamento_id = table.Column<Guid>(type: "uuid", nullable: false),
                    tipo = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    fornecedor_casamento_id = table.Column<Guid>(type: "uuid", nullable: true),
                    responsavel_chave = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    token_hash = table.Column<string>(type: "character(64)", fixedLength: true, maxLength: 64, nullable: false),
                    token_cifrado = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    gerado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_acessos_cronograma", x => x.id);
                    table.CheckConstraint("ck_acessos_cronograma_destino", "(tipo = 'Geral' AND fornecedor_casamento_id IS NULL AND responsavel_chave IS NULL) OR (tipo = 'Fornecedor' AND fornecedor_casamento_id IS NOT NULL AND responsavel_chave IS NULL) OR (tipo = 'Responsavel' AND fornecedor_casamento_id IS NULL AND responsavel_chave IS NOT NULL)");
                    table.CheckConstraint("ck_acessos_cronograma_tipo", "tipo IN ('Geral', 'Fornecedor', 'Responsavel')");
                    table.ForeignKey(
                        name: "fk_acessos_cronograma_casamentos_casamento_id",
                        column: x => x.casamento_id,
                        principalTable: "casamentos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_acessos_cronograma_fornecedores_casamento_fornecedor_casame",
                        column: x => x.fornecedor_casamento_id,
                        principalTable: "fornecedores_casamento",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_acessos_cronograma_organizacoes_organizacao_id",
                        column: x => x.organizacao_id,
                        principalTable: "organizacoes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_acessos_cronograma_fornecedor_casamento_id",
                table: "acessos_cronograma",
                column: "fornecedor_casamento_id");

            migrationBuilder.CreateIndex(
                name: "ix_acessos_cronograma_organizacao_id",
                table: "acessos_cronograma",
                column: "organizacao_id");

            migrationBuilder.CreateIndex(
                name: "ix_acessos_cronograma_token_hash",
                table: "acessos_cronograma",
                column: "token_hash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_acessos_cronograma_destino",
                table: "acessos_cronograma",
                columns: new[] { "casamento_id", "tipo", "fornecedor_casamento_id", "responsavel_chave" },
                unique: true)
                .Annotation("Npgsql:NullsDistinct", false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "acessos_cronograma");
        }
    }
}
