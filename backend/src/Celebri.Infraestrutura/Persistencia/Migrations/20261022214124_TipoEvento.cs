using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Celebri.Infraestrutura.Persistencia.Migrations;

public partial class TipoEvento : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "tipo",
            table: "eventos",
            type: "character varying(20)",
            maxLength: 20,
            nullable: false,
            defaultValue: "Casamento");

        migrationBuilder.AlterColumn<string>(
            name: "nome_segunda_pessoa",
            table: "eventos",
            type: "character varying(80)",
            maxLength: 80,
            nullable: true,
            oldClrType: typeof(string),
            oldType: "character varying(80)",
            oldMaxLength: 80);

        migrationBuilder.AddColumn<string>(
            name: "tipo_evento",
            table: "modelos_checklist",
            type: "character varying(20)",
            maxLength: 20,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "tipo_evento",
            table: "modelos_cronograma",
            type: "character varying(20)",
            maxLength: 20,
            nullable: true);

        migrationBuilder.Sql("UPDATE modelos_checklist SET tipo_evento = 'Casamento' WHERE sugerido;");
        migrationBuilder.Sql("UPDATE modelos_cronograma SET tipo_evento = 'Casamento' WHERE sugerido;");

        migrationBuilder.AddColumn<DateTimeOffset>(
            name: "modelos_checklist_por_tipo_em",
            table: "organizacoes",
            type: "timestamp with time zone",
            nullable: true);

        migrationBuilder.AddColumn<DateTimeOffset>(
            name: "modelos_cronograma_por_tipo_em",
            table: "organizacoes",
            type: "timestamp with time zone",
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "modelos_cronograma_por_tipo_em", table: "organizacoes");
        migrationBuilder.DropColumn(name: "modelos_checklist_por_tipo_em", table: "organizacoes");
        migrationBuilder.DropColumn(name: "tipo_evento", table: "modelos_cronograma");
        migrationBuilder.DropColumn(name: "tipo_evento", table: "modelos_checklist");

        migrationBuilder.Sql("UPDATE eventos SET nome_segunda_pessoa = '' WHERE nome_segunda_pessoa IS NULL;");

        migrationBuilder.AlterColumn<string>(
            name: "nome_segunda_pessoa",
            table: "eventos",
            type: "character varying(80)",
            maxLength: 80,
            nullable: false,
            defaultValue: "",
            oldClrType: typeof(string),
            oldType: "character varying(80)",
            oldMaxLength: 80,
            oldNullable: true);

        migrationBuilder.DropColumn(name: "tipo", table: "eventos");
    }
}
