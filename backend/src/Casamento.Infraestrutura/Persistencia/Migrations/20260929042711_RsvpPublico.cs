using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Casamento.Infraestrutura.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class RsvpPublico : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "respondido_em",
                table: "convites",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<uint>(
                name: "xmin",
                table: "convites",
                type: "xid",
                rowVersion: true,
                nullable: false,
                defaultValue: 0u);

            migrationBuilder.AddColumn<bool>(
                name: "acompanhante",
                table: "convidados",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateOnly>(
                name: "data_limite_rsvp",
                table: "casamentos",
                type: "date",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "acessos_rsvp",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    convite_id = table.Column<Guid>(type: "uuid", nullable: false),
                    casamento_id = table.Column<Guid>(type: "uuid", nullable: false),
                    organizacao_id = table.Column<Guid>(type: "uuid", nullable: false),
                    token_hash = table.Column<string>(type: "character(64)", fixedLength: true, maxLength: 64, nullable: false),
                    token_cifrado = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    gerado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_acessos_rsvp", x => x.id);
                    table.ForeignKey(
                        name: "fk_acessos_rsvp_casamentos_casamento_id",
                        column: x => x.casamento_id,
                        principalTable: "casamentos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_acessos_rsvp_convites_convite_id",
                        column: x => x.convite_id,
                        principalTable: "convites",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_acessos_rsvp_organizacoes_organizacao_id",
                        column: x => x.organizacao_id,
                        principalTable: "organizacoes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.AddCheckConstraint(
                name: "ck_casamentos_data_limite_rsvp",
                table: "casamentos",
                sql: "data_limite_rsvp IS NULL OR (data_limite_rsvp >= DATE '2000-01-01' AND data_limite_rsvp <= data)");

            migrationBuilder.CreateIndex(
                name: "ix_acessos_rsvp_casamento_id",
                table: "acessos_rsvp",
                column: "casamento_id");

            migrationBuilder.CreateIndex(
                name: "ix_acessos_rsvp_convite_id",
                table: "acessos_rsvp",
                column: "convite_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_acessos_rsvp_organizacao_id",
                table: "acessos_rsvp",
                column: "organizacao_id");

            migrationBuilder.CreateIndex(
                name: "ix_acessos_rsvp_token_hash",
                table: "acessos_rsvp",
                column: "token_hash",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "acessos_rsvp");

            migrationBuilder.DropCheckConstraint(
                name: "ck_casamentos_data_limite_rsvp",
                table: "casamentos");

            migrationBuilder.DropColumn(
                name: "respondido_em",
                table: "convites");

            migrationBuilder.DropColumn(
                name: "xmin",
                table: "convites");

            migrationBuilder.DropColumn(
                name: "acompanhante",
                table: "convidados");

            migrationBuilder.DropColumn(
                name: "data_limite_rsvp",
                table: "casamentos");
        }
    }
}
