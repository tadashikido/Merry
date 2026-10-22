using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Celebri.Infraestrutura.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class FornecedoresOrganizacao : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "fornecedores",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organizacao_id = table.Column<Guid>(type: "uuid", nullable: false),
                    categoria = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    nome_empresa = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    nome_normalizado = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    responsavel = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    telefone = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    email = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: true),
                    site = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    instagram = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    observacoes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    arquivado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    criado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    atualizado_em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_fornecedores", x => x.id);
                    table.CheckConstraint("ck_fornecedores_categoria", "categoria IN ('Buffet', 'EspacoLocal', 'Decoracao', 'Fotografia', 'Filmagem', 'Musica', 'BoloDoces', 'ConvitesPapelaria', 'Beleza', 'Vestuario', 'IluminacaoSom', 'Transporte', 'Seguranca', 'CerimonialApoio', 'Outros')");
                    table.ForeignKey(
                        name: "fk_fornecedores_organizacoes_organizacao_id",
                        column: x => x.organizacao_id,
                        principalTable: "organizacoes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ux_fornecedores_organizacao_id_categoria_nome_normalizado",
                table: "fornecedores",
                columns: new[] { "organizacao_id", "categoria", "nome_normalizado" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "fornecedores");
        }
    }
}
