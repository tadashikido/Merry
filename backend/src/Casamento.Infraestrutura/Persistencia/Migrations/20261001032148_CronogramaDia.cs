using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Casamento.Infraestrutura.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class CronogramaDia : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "itens_cronograma",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organizacao_id = table.Column<Guid>(type: "uuid", nullable: false),
                    casamento_id = table.Column<Guid>(type: "uuid", nullable: false),
                    dia = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    inicio = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    duracao_minutos = table.Column<int>(type: "integer", nullable: true),
                    atividade = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    local = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    responsavel = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    responsavel_chave = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    fornecedor_casamento_id = table.Column<Guid>(type: "uuid", nullable: true),
                    instrucoes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    notas_internas = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    concluido_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    criado_por_usuario_id = table.Column<Guid>(type: "uuid", nullable: true),
                    criado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    atualizado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_itens_cronograma", x => x.id);
                    table.CheckConstraint("ck_itens_cronograma_conclusao", "(status = 'Concluido') = (concluido_em IS NOT NULL)");
                    table.CheckConstraint("ck_itens_cronograma_dia", "dia IN ('DiaDoCasamento', 'DiaSeguinte', 'Vespera')");
                    table.CheckConstraint("ck_itens_cronograma_duracao", "duracao_minutos IS NULL OR duracao_minutos BETWEEN 5 AND 1440");
                    table.CheckConstraint("ck_itens_cronograma_status", "status IN ('Previsto', 'Concluido')");
                    table.ForeignKey(
                        name: "fk_itens_cronograma_casamentos_casamento_id",
                        column: x => x.casamento_id,
                        principalTable: "casamentos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_itens_cronograma_fornecedores_casamento_fornecedor_casamento_id",
                        column: x => x.fornecedor_casamento_id,
                        principalTable: "fornecedores_casamento",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_itens_cronograma_organizacoes_organizacao_id",
                        column: x => x.organizacao_id,
                        principalTable: "organizacoes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_itens_cronograma_casamento_id_fornecedor_casamento_id",
                table: "itens_cronograma",
                columns: new[] { "casamento_id", "fornecedor_casamento_id" });

            migrationBuilder.CreateIndex(
                name: "ix_itens_cronograma_casamento_id_responsavel_chave",
                table: "itens_cronograma",
                columns: new[] { "casamento_id", "responsavel_chave" });

            migrationBuilder.CreateIndex(
                name: "ix_itens_cronograma_fornecedor_casamento_id",
                table: "itens_cronograma",
                column: "fornecedor_casamento_id");

            migrationBuilder.CreateIndex(
                name: "ix_itens_cronograma_organizacao_id_casamento_id",
                table: "itens_cronograma",
                columns: new[] { "organizacao_id", "casamento_id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "itens_cronograma");
        }
    }
}
