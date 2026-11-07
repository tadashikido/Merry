using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Celebri.Infraestrutura.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class Impersonacao : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "sessoes_impersonacao",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    operador_id = table.Column<Guid>(type: "uuid", nullable: false),
                    organizacao_id = table.Column<Guid>(type: "uuid", nullable: false),
                    motivo = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    iniciada_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    expira_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    encerrada_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_sessoes_impersonacao", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_sessoes_impersonacao_iniciada_em",
                table: "sessoes_impersonacao",
                column: "iniciada_em");

            migrationBuilder.CreateIndex(
                name: "ix_sessoes_impersonacao_operador_id",
                table: "sessoes_impersonacao",
                column: "operador_id");

            migrationBuilder.CreateIndex(
                name: "ix_sessoes_impersonacao_organizacao_id",
                table: "sessoes_impersonacao",
                column: "organizacao_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "sessoes_impersonacao");
        }
    }
}
