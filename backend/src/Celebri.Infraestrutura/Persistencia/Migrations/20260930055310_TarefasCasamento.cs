using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Celebri.Infraestrutura.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class TarefasCasamento : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tarefas_casamento",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organizacao_id = table.Column<Guid>(type: "uuid", nullable: false),
                    casamento_id = table.Column<Guid>(type: "uuid", nullable: false),
                    titulo = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    descricao = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    responsavel = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    categoria = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    prazo = table.Column<DateOnly>(type: "date", nullable: true),
                    concluida_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    concluida_por = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    concluida_por_usuario_id = table.Column<Guid>(type: "uuid", nullable: true),
                    origem_modelo_item_id = table.Column<Guid>(type: "uuid", nullable: true),
                    criado_por_usuario_id = table.Column<Guid>(type: "uuid", nullable: true),
                    criado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    atualizado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_tarefas_casamento", x => x.id);
                    table.CheckConstraint("ck_tarefas_casamento_categoria", "categoria IN ('Geral', 'Cerimonia', 'Recepcao', 'Fornecedores', 'Convidados', 'Financeiro', 'Documentos', 'TrajesBeleza')");
                    table.CheckConstraint("ck_tarefas_casamento_concluida_por", "concluida_por IS NULL OR concluida_por IN ('Assessoria', 'Casal')");
                    table.CheckConstraint("ck_tarefas_casamento_conclusao", "(status = 'Concluida') = (concluida_em IS NOT NULL AND concluida_por IS NOT NULL)");
                    table.CheckConstraint("ck_tarefas_casamento_responsavel", "responsavel IN ('Assessoria', 'Casal')");
                    table.CheckConstraint("ck_tarefas_casamento_status", "status IN ('AFazer', 'EmAndamento', 'Concluida', 'Cancelada')");
                    table.ForeignKey(
                        name: "fk_tarefas_casamento_casamentos_casamento_id",
                        column: x => x.casamento_id,
                        principalTable: "casamentos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_tarefas_casamento_organizacoes_organizacao_id",
                        column: x => x.organizacao_id,
                        principalTable: "organizacoes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_tarefas_casamento_casamento_id",
                table: "tarefas_casamento",
                column: "casamento_id");

            migrationBuilder.CreateIndex(
                name: "ix_tarefas_casamento_organizacao_id_casamento_id",
                table: "tarefas_casamento",
                columns: new[] { "organizacao_id", "casamento_id" });

            migrationBuilder.CreateIndex(
                name: "ix_tarefas_casamento_organizacao_id_status_prazo",
                table: "tarefas_casamento",
                columns: new[] { "organizacao_id", "status", "prazo" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tarefas_casamento");
        }
    }
}
