using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Celebri.Infraestrutura.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class CobrancaRsvp : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "quantidade_cobrancas",
                table: "convites",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ultima_cobranca_em",
                table: "convites",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "ck_convites_quantidade_cobrancas",
                table: "convites",
                sql: "quantidade_cobrancas >= 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_convites_quantidade_cobrancas",
                table: "convites");

            migrationBuilder.DropColumn(
                name: "quantidade_cobrancas",
                table: "convites");

            migrationBuilder.DropColumn(
                name: "ultima_cobranca_em",
                table: "convites");
        }
    }
}
