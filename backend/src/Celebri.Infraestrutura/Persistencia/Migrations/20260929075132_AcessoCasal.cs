using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Casamento.Infraestrutura.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class AcessoCasal : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<bool>(
                name: "ativo",
                table: "usuarios",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: true);

            migrationBuilder.AddColumn<Guid>(
                name: "casamento_id",
                table: "usuarios",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "acessos_casal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organizacao_id = table.Column<Guid>(type: "uuid", nullable: false),
                    casamento_id = table.Column<Guid>(type: "uuid", nullable: false),
                    nome = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    email = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: false),
                    convidado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    convidado_por_usuario_id = table.Column<Guid>(type: "uuid", nullable: false),
                    convite_expira_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    reenviado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    aceito_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    usuario_id = table.Column<Guid>(type: "uuid", nullable: true),
                    revogado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    revogado_por_usuario_id = table.Column<Guid>(type: "uuid", nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_acessos_casal", x => x.id);
                    table.CheckConstraint("ck_acessos_casal_aceite", "(aceito_em IS NULL) = (usuario_id IS NULL)");
                    table.CheckConstraint("ck_acessos_casal_revogacao", "(revogado_em IS NULL) = (revogado_por_usuario_id IS NULL)");
                    table.ForeignKey(
                        name: "fk_acessos_casal_casamentos_casamento_id",
                        column: x => x.casamento_id,
                        principalTable: "casamentos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_acessos_casal_organizacoes_organizacao_id",
                        column: x => x.organizacao_id,
                        principalTable: "organizacoes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_acessos_casal_usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "registros_alteracao_convites",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organizacao_id = table.Column<Guid>(type: "uuid", nullable: false),
                    casamento_id = table.Column<Guid>(type: "uuid", nullable: false),
                    convite_id = table.Column<Guid>(type: "uuid", nullable: false),
                    acao = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    usuario_id = table.Column<Guid>(type: "uuid", nullable: true),
                    papel_usuario = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    ocorrido_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_registros_alteracao_convites", x => x.id);
                    table.CheckConstraint("ck_registros_alteracao_convites_acao", "acao IN ('Criacao', 'Alteracao', 'Remocao')");
                    table.ForeignKey(
                        name: "fk_registros_alteracao_convites_casamentos_casamento_id",
                        column: x => x.casamento_id,
                        principalTable: "casamentos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_registros_alteracao_convites_organizacoes_organizacao_id",
                        column: x => x.organizacao_id,
                        principalTable: "organizacoes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tokens_acesso_casal",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    acesso_casal_id = table.Column<Guid>(type: "uuid", nullable: false),
                    casamento_id = table.Column<Guid>(type: "uuid", nullable: false),
                    organizacao_id = table.Column<Guid>(type: "uuid", nullable: false),
                    token_hash = table.Column<string>(type: "character(64)", fixedLength: true, maxLength: 64, nullable: false),
                    gerado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_tokens_acesso_casal", x => x.id);
                    table.ForeignKey(
                        name: "fk_tokens_acesso_casal_acessos_casal_acesso_casal_id",
                        column: x => x.acesso_casal_id,
                        principalTable: "acessos_casal",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_usuarios_casamento_id",
                table: "usuarios",
                column: "casamento_id");

            migrationBuilder.AddCheckConstraint(
                name: "ck_usuarios_papel_casamento",
                table: "usuarios",
                sql: "(papel = 'Casal') = (casamento_id IS NOT NULL)");

            migrationBuilder.CreateIndex(
                name: "ix_acessos_casal_casamento_id_email_nao_revogado",
                table: "acessos_casal",
                columns: new[] { "casamento_id", "email" },
                unique: true,
                filter: "revogado_em IS NULL");

            migrationBuilder.CreateIndex(
                name: "ix_acessos_casal_organizacao_id_casamento_id",
                table: "acessos_casal",
                columns: new[] { "organizacao_id", "casamento_id" });

            migrationBuilder.CreateIndex(
                name: "ix_acessos_casal_usuario_id",
                table: "acessos_casal",
                column: "usuario_id");

            migrationBuilder.CreateIndex(
                name: "ix_registros_alteracao_convites_casamento_id",
                table: "registros_alteracao_convites",
                column: "casamento_id");

            migrationBuilder.CreateIndex(
                name: "ix_registros_alteracao_convites_convite_id_ocorrido_em",
                table: "registros_alteracao_convites",
                columns: new[] { "convite_id", "ocorrido_em" });

            migrationBuilder.CreateIndex(
                name: "ix_registros_alteracao_convites_organizacao_id_casamento_id",
                table: "registros_alteracao_convites",
                columns: new[] { "organizacao_id", "casamento_id" });

            migrationBuilder.CreateIndex(
                name: "ix_tokens_acesso_casal_acesso_casal_id",
                table: "tokens_acesso_casal",
                column: "acesso_casal_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_tokens_acesso_casal_token_hash",
                table: "tokens_acesso_casal",
                column: "token_hash",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "fk_usuarios_casamentos_casamento_id",
                table: "usuarios",
                column: "casamento_id",
                principalTable: "casamentos",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_usuarios_casamentos_casamento_id",
                table: "usuarios");

            migrationBuilder.DropTable(
                name: "registros_alteracao_convites");

            migrationBuilder.DropTable(
                name: "tokens_acesso_casal");

            migrationBuilder.DropTable(
                name: "acessos_casal");

            migrationBuilder.DropIndex(
                name: "ix_usuarios_casamento_id",
                table: "usuarios");

            migrationBuilder.DropCheckConstraint(
                name: "ck_usuarios_papel_casamento",
                table: "usuarios");

            migrationBuilder.DropColumn(
                name: "casamento_id",
                table: "usuarios");

            migrationBuilder.AlterColumn<bool>(
                name: "ativo",
                table: "usuarios",
                type: "boolean",
                nullable: false,
                defaultValue: true,
                oldClrType: typeof(bool),
                oldType: "boolean");
        }
    }
}
