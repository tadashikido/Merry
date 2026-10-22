using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Casamento.Infraestrutura.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class ModelosChecklist : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_tarefas_casamento_casamento_id",
                table: "tarefas_casamento");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "modelo_checklist_sugerido_em",
                table: "organizacoes",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<uint>(
                name: "xmin",
                table: "organizacoes",
                type: "xid",
                rowVersion: true,
                nullable: false,
                defaultValue: 0u);

            migrationBuilder.CreateTable(
                name: "modelos_checklist",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organizacao_id = table.Column<Guid>(type: "uuid", nullable: false),
                    nome = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    descricao = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    sugerido = table.Column<bool>(type: "boolean", nullable: false),
                    criado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    atualizado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_modelos_checklist", x => x.id);
                    table.ForeignKey(
                        name: "fk_modelos_checklist_organizacoes_organizacao_id",
                        column: x => x.organizacao_id,
                        principalTable: "organizacoes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "itens_modelo_checklist",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organizacao_id = table.Column<Guid>(type: "uuid", nullable: false),
                    modelo_id = table.Column<Guid>(type: "uuid", nullable: false),
                    titulo = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    descricao = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    responsavel = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    categoria = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    dias_antes_do_casamento = table.Column<int>(type: "integer", nullable: false),
                    criado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    atualizado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_itens_modelo_checklist", x => x.id);
                    table.CheckConstraint("ck_itens_modelo_checklist_categoria", "categoria IN ('Geral', 'Cerimonia', 'Recepcao', 'Fornecedores', 'Convidados', 'Financeiro', 'Documentos', 'TrajesBeleza')");
                    table.CheckConstraint("ck_itens_modelo_checklist_dias", "dias_antes_do_casamento BETWEEN -365 AND 1095");
                    table.CheckConstraint("ck_itens_modelo_checklist_responsavel", "responsavel IN ('Assessoria', 'Casal')");
                    table.ForeignKey(
                        name: "fk_itens_modelo_checklist_modelos_checklist_modelo_id",
                        column: x => x.modelo_id,
                        principalTable: "modelos_checklist",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_itens_modelo_checklist_organizacoes_organizacao_id",
                        column: x => x.organizacao_id,
                        principalTable: "organizacoes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_tarefas_casamento_origem_modelo_item_id",
                table: "tarefas_casamento",
                column: "origem_modelo_item_id");

            migrationBuilder.CreateIndex(
                name: "ux_tarefas_casamento_casamento_id_origem_modelo_item_id",
                table: "tarefas_casamento",
                columns: new[] { "casamento_id", "origem_modelo_item_id" },
                unique: true,
                filter: "origem_modelo_item_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_itens_modelo_checklist_modelo_id",
                table: "itens_modelo_checklist",
                column: "modelo_id");

            migrationBuilder.CreateIndex(
                name: "ix_itens_modelo_checklist_organizacao_id_modelo_id",
                table: "itens_modelo_checklist",
                columns: new[] { "organizacao_id", "modelo_id" });

            migrationBuilder.CreateIndex(
                name: "ix_modelos_checklist_organizacao_id_nome",
                table: "modelos_checklist",
                columns: new[] { "organizacao_id", "nome" });

            migrationBuilder.AddForeignKey(
                name: "fk_tarefas_casamento_itens_modelo_checklist_origem_modelo_item",
                table: "tarefas_casamento",
                column: "origem_modelo_item_id",
                principalTable: "itens_modelo_checklist",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_tarefas_casamento_itens_modelo_checklist_origem_modelo_item",
                table: "tarefas_casamento");

            migrationBuilder.DropTable(
                name: "itens_modelo_checklist");

            migrationBuilder.DropTable(
                name: "modelos_checklist");

            migrationBuilder.DropIndex(
                name: "ix_tarefas_casamento_origem_modelo_item_id",
                table: "tarefas_casamento");

            migrationBuilder.DropIndex(
                name: "ux_tarefas_casamento_casamento_id_origem_modelo_item_id",
                table: "tarefas_casamento");

            migrationBuilder.DropColumn(
                name: "modelo_checklist_sugerido_em",
                table: "organizacoes");

            migrationBuilder.DropColumn(
                name: "xmin",
                table: "organizacoes");

            migrationBuilder.CreateIndex(
                name: "ix_tarefas_casamento_casamento_id",
                table: "tarefas_casamento",
                column: "casamento_id");
        }
    }
}
