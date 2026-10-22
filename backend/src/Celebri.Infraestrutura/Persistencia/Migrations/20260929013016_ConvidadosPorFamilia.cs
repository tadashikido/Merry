using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Casamento.Infraestrutura.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class ConvidadosPorFamilia : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "convites",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organizacao_id = table.Column<Guid>(type: "uuid", nullable: false),
                    casamento_id = table.Column<Guid>(type: "uuid", nullable: false),
                    nome = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    grupo = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: true),
                    limite_acompanhantes = table.Column<int>(type: "integer", nullable: false),
                    status_envio = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    criado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    atualizado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_convites", x => x.id);
                    table.CheckConstraint("ck_convites_limite_acompanhantes", "limite_acompanhantes BETWEEN 0 AND 10");
                    table.CheckConstraint("ck_convites_status_envio", "status_envio IN ('NaoEnviado', 'Enviado', 'Visualizado')");
                    table.ForeignKey(
                        name: "fk_convites_casamentos_casamento_id",
                        column: x => x.casamento_id,
                        principalTable: "casamentos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_convites_organizacoes_organizacao_id",
                        column: x => x.organizacao_id,
                        principalTable: "organizacoes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "convidados",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organizacao_id = table.Column<Guid>(type: "uuid", nullable: false),
                    casamento_id = table.Column<Guid>(type: "uuid", nullable: false),
                    convite_id = table.Column<Guid>(type: "uuid", nullable: false),
                    nome = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    telefone = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    email = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: true),
                    faixa_etaria = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    resposta = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ordem = table.Column<int>(type: "integer", nullable: false),
                    criado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    atualizado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_convidados", x => x.id);
                    table.CheckConstraint("ck_convidados_faixa_etaria", "faixa_etaria IN ('Adulto', 'Crianca')");
                    table.CheckConstraint("ck_convidados_ordem", "ordem >= 0");
                    table.CheckConstraint("ck_convidados_resposta", "resposta IN ('Pendente', 'Confirmado', 'Recusado')");
                    table.ForeignKey(
                        name: "fk_convidados_casamentos_casamento_id",
                        column: x => x.casamento_id,
                        principalTable: "casamentos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_convidados_convites_convite_id",
                        column: x => x.convite_id,
                        principalTable: "convites",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_convidados_organizacoes_organizacao_id",
                        column: x => x.organizacao_id,
                        principalTable: "organizacoes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_convidados_casamento_id",
                table: "convidados",
                column: "casamento_id");

            migrationBuilder.CreateIndex(
                name: "ix_convidados_convite_id",
                table: "convidados",
                column: "convite_id");

            migrationBuilder.CreateIndex(
                name: "ix_convidados_organizacao_id_casamento_id",
                table: "convidados",
                columns: new[] { "organizacao_id", "casamento_id" });

            migrationBuilder.CreateIndex(
                name: "ix_convites_casamento_id",
                table: "convites",
                column: "casamento_id");

            migrationBuilder.CreateIndex(
                name: "ix_convites_organizacao_id_casamento_id",
                table: "convites",
                columns: new[] { "organizacao_id", "casamento_id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "convidados");

            migrationBuilder.DropTable(
                name: "convites");
        }
    }
}
