using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Celebri.Infraestrutura.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class MesasEmLista : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "mesa_id",
                table: "convidados",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "mesa_saida_id",
                table: "convidados",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "saiu_da_mesa_em",
                table: "convidados",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "mesas",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organizacao_id = table.Column<Guid>(type: "uuid", nullable: false),
                    casamento_id = table.Column<Guid>(type: "uuid", nullable: false),
                    numero = table.Column<int>(type: "integer", nullable: false),
                    nome = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: true),
                    capacidade = table.Column<int>(type: "integer", nullable: false),
                    especial = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    criado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    atualizado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_mesas", x => x.id);
                    table.CheckConstraint("ck_mesas_capacidade", "capacidade BETWEEN 1 AND 30");
                    table.CheckConstraint("ck_mesas_numero", "numero BETWEEN 1 AND 999");
                    table.ForeignKey(
                        name: "fk_mesas_casamentos_casamento_id",
                        column: x => x.casamento_id,
                        principalTable: "casamentos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_mesas_organizacoes_organizacao_id",
                        column: x => x.organizacao_id,
                        principalTable: "organizacoes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_convidados_mesa_id",
                table: "convidados",
                column: "mesa_id");

            migrationBuilder.CreateIndex(
                name: "ix_convidados_mesa_saida_id",
                table: "convidados",
                column: "mesa_saida_id");

            migrationBuilder.AddCheckConstraint(
                name: "ck_convidados_mesa_somente_confirmado",
                table: "convidados",
                sql: "mesa_id IS NULL OR resposta = 'Confirmado'");

            migrationBuilder.AddCheckConstraint(
                name: "ck_convidados_saida_mesa",
                table: "convidados",
                sql: "mesa_saida_id IS NULL OR saiu_da_mesa_em IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_mesas_organizacao_id_casamento_id",
                table: "mesas",
                columns: new[] { "organizacao_id", "casamento_id" });

            migrationBuilder.CreateIndex(
                name: "ux_mesas_casamento_id_especial",
                table: "mesas",
                column: "casamento_id",
                unique: true,
                filter: "especial");

            migrationBuilder.CreateIndex(
                name: "ux_mesas_casamento_id_numero",
                table: "mesas",
                columns: new[] { "casamento_id", "numero" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "fk_convidados_mesas_mesa_id",
                table: "convidados",
                column: "mesa_id",
                principalTable: "mesas",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_convidados_mesas_mesa_saida_id",
                table: "convidados",
                column: "mesa_saida_id",
                principalTable: "mesas",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_convidados_mesas_mesa_id",
                table: "convidados");

            migrationBuilder.DropForeignKey(
                name: "fk_convidados_mesas_mesa_saida_id",
                table: "convidados");

            migrationBuilder.DropTable(
                name: "mesas");

            migrationBuilder.DropIndex(
                name: "ix_convidados_mesa_id",
                table: "convidados");

            migrationBuilder.DropIndex(
                name: "ix_convidados_mesa_saida_id",
                table: "convidados");

            migrationBuilder.DropCheckConstraint(
                name: "ck_convidados_mesa_somente_confirmado",
                table: "convidados");

            migrationBuilder.DropCheckConstraint(
                name: "ck_convidados_saida_mesa",
                table: "convidados");

            migrationBuilder.DropColumn(
                name: "mesa_id",
                table: "convidados");

            migrationBuilder.DropColumn(
                name: "mesa_saida_id",
                table: "convidados");

            migrationBuilder.DropColumn(
                name: "saiu_da_mesa_em",
                table: "convidados");
        }
    }
}
