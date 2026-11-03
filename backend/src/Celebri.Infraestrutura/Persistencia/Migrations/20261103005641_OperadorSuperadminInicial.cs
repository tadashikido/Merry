using Celebri.Infraestrutura.Seguranca;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Celebri.Infraestrutura.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class OperadorSuperadminInicial : Migration
    {
        private const string Email = "guilherme_tk_@hotmail.com";
        private const string Nome = "Guilherme";
        private const string SenhaInicial = "123456";

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            var senhaHash = new HashSenhaService().GerarHash(SenhaInicial).Replace("'", "''");

            migrationBuilder.Sql(
                $"""
                INSERT INTO operadores_plataforma (id, nome, email, senha_hash, ativo, falhas_login_consecutivas, criado_em)
                VALUES (gen_random_uuid(), '{Nome}', '{Email}', '{senhaHash}', TRUE, 0, now())
                ON CONFLICT (email) DO NOTHING;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql($"DELETE FROM operadores_plataforma WHERE email = '{Email}';");
        }
    }
}
