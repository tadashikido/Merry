using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Celebri.Infraestrutura.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class OperadorPlataforma : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "operadores_plataforma",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    nome = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    email = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: false),
                    senha_hash = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    ativo = table.Column<bool>(type: "boolean", nullable: false),
                    falhas_login_consecutivas = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    bloqueado_ate = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    criado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    senha_alterada_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_operadores_plataforma", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "refresh_tokens_operador",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    operador_id = table.Column<Guid>(type: "uuid", nullable: false),
                    token_hash = table.Column<string>(type: "character(64)", fixedLength: true, maxLength: 64, nullable: false),
                    familia = table.Column<Guid>(type: "uuid", nullable: false),
                    criado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    expira_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    substituido_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    revogado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_refresh_tokens_operador", x => x.id);
                    table.ForeignKey(
                        name: "fk_refresh_tokens_operador_operadores_plataforma_operador_id",
                        column: x => x.operador_id,
                        principalTable: "operadores_plataforma",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_operadores_plataforma_email",
                table: "operadores_plataforma",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_refresh_tokens_operador_familia",
                table: "refresh_tokens_operador",
                column: "familia");

            migrationBuilder.CreateIndex(
                name: "ix_refresh_tokens_operador_operador_id",
                table: "refresh_tokens_operador",
                column: "operador_id");

            migrationBuilder.CreateIndex(
                name: "ix_refresh_tokens_operador_token_hash",
                table: "refresh_tokens_operador",
                column: "token_hash",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "refresh_tokens_operador");

            migrationBuilder.DropTable(
                name: "operadores_plataforma");
        }
    }
}
