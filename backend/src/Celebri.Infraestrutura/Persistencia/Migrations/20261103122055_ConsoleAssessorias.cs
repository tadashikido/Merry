using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Celebri.Infraestrutura.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class ConsoleAssessorias : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ultimo_login_em",
                table: "usuarios",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "suspensa_em",
                table: "organizacoes",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ultimo_login_em",
                table: "usuarios");

            migrationBuilder.DropColumn(
                name: "suspensa_em",
                table: "organizacoes");
        }
    }
}
