using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Casamento.Infraestrutura.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class ModelosCronograma : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "modelo_cronograma_sugerido_em",
                table: "organizacoes",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "minutos_relativos_cerimonia",
                table: "itens_cronograma",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "origem_modelo_item_id",
                table: "itens_cronograma",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "modelos_cronograma",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organizacao_id = table.Column<Guid>(type: "uuid", nullable: false),
                    nome = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    descricao = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    horario_referencia = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    sugerido = table.Column<bool>(type: "boolean", nullable: false),
                    criado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    atualizado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_modelos_cronograma", x => x.id);
                    table.ForeignKey(
                        name: "fk_modelos_cronograma_organizacoes_organizacao_id",
                        column: x => x.organizacao_id,
                        principalTable: "organizacoes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "itens_modelo_cronograma",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organizacao_id = table.Column<Guid>(type: "uuid", nullable: false),
                    modelo_id = table.Column<Guid>(type: "uuid", nullable: false),
                    minutos_desde_cerimonia = table.Column<int>(type: "integer", nullable: false),
                    duracao_minutos = table.Column<int>(type: "integer", nullable: true),
                    atividade = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    referencia_local = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    local = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    responsavel = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    categoria_fornecedor = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    instrucoes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    criado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    atualizado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_itens_modelo_cronograma", x => x.id);
                    table.CheckConstraint("ck_itens_modelo_cronograma_categoria_fornecedor", "categoria_fornecedor IS NULL OR categoria_fornecedor IN ('Buffet', 'EspacoLocal', 'Decoracao', 'Fotografia', 'Filmagem', 'Musica', 'BoloDoces', 'ConvitesPapelaria', 'Beleza', 'Vestuario', 'IluminacaoSom', 'Transporte', 'Seguranca', 'CerimonialApoio', 'Outros')");
                    table.CheckConstraint("ck_itens_modelo_cronograma_duracao", "duracao_minutos IS NULL OR duracao_minutos BETWEEN 5 AND 1440");
                    table.CheckConstraint("ck_itens_modelo_cronograma_minutos", "minutos_desde_cerimonia BETWEEN -2879 AND 2879");
                    table.CheckConstraint("ck_itens_modelo_cronograma_referencia_local", "referencia_local IS NULL OR referencia_local IN ('Cerimonia', 'Recepcao')");
                    table.ForeignKey(
                        name: "fk_itens_modelo_cronograma_modelos_cronograma_modelo_id",
                        column: x => x.modelo_id,
                        principalTable: "modelos_cronograma",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_itens_modelo_cronograma_organizacoes_organizacao_id",
                        column: x => x.organizacao_id,
                        principalTable: "organizacoes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_itens_cronograma_origem_modelo_item_id",
                table: "itens_cronograma",
                column: "origem_modelo_item_id");

            migrationBuilder.CreateIndex(
                name: "ux_itens_cronograma_casamento_id_origem_modelo_item_id",
                table: "itens_cronograma",
                columns: new[] { "casamento_id", "origem_modelo_item_id" },
                unique: true,
                filter: "origem_modelo_item_id IS NOT NULL");

            migrationBuilder.AddCheckConstraint(
                name: "ck_itens_cronograma_minutos_relativos_cerimonia",
                table: "itens_cronograma",
                sql: "minutos_relativos_cerimonia IS NULL OR minutos_relativos_cerimonia BETWEEN -2879 AND 2879");

            migrationBuilder.CreateIndex(
                name: "ix_itens_modelo_cronograma_modelo_id",
                table: "itens_modelo_cronograma",
                column: "modelo_id");

            migrationBuilder.CreateIndex(
                name: "ix_itens_modelo_cronograma_organizacao_id_modelo_id",
                table: "itens_modelo_cronograma",
                columns: new[] { "organizacao_id", "modelo_id" });

            migrationBuilder.CreateIndex(
                name: "ix_modelos_cronograma_organizacao_id_nome",
                table: "modelos_cronograma",
                columns: new[] { "organizacao_id", "nome" });

            migrationBuilder.AddForeignKey(
                name: "fk_itens_cronograma_itens_modelo_cronograma_origem_modelo_item",
                table: "itens_cronograma",
                column: "origem_modelo_item_id",
                principalTable: "itens_modelo_cronograma",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_itens_cronograma_itens_modelo_cronograma_origem_modelo_item",
                table: "itens_cronograma");

            migrationBuilder.DropTable(
                name: "itens_modelo_cronograma");

            migrationBuilder.DropTable(
                name: "modelos_cronograma");

            migrationBuilder.DropIndex(
                name: "ix_itens_cronograma_origem_modelo_item_id",
                table: "itens_cronograma");

            migrationBuilder.DropIndex(
                name: "ux_itens_cronograma_casamento_id_origem_modelo_item_id",
                table: "itens_cronograma");

            migrationBuilder.DropCheckConstraint(
                name: "ck_itens_cronograma_minutos_relativos_cerimonia",
                table: "itens_cronograma");

            migrationBuilder.DropColumn(
                name: "modelo_cronograma_sugerido_em",
                table: "organizacoes");

            migrationBuilder.DropColumn(
                name: "minutos_relativos_cerimonia",
                table: "itens_cronograma");

            migrationBuilder.DropColumn(
                name: "origem_modelo_item_id",
                table: "itens_cronograma");
        }
    }
}
