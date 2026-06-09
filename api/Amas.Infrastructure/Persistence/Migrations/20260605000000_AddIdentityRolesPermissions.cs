using Amas.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Amas.Infrastructure.Persistence.Migrations;

[DbContext(typeof(AmasDbContext))]
[Migration("20260605000000_AddIdentityRolesPermissions")]
public partial class AddIdentityRolesPermissions : Migration
{
    private static readonly Guid AdminRoleId = Guid.Parse("11111111-1111-1111-1111-111111111111");

    private static readonly (Guid Id, string Code, string Description)[] Permissions =
    [
        (Guid.Parse("22222222-2222-2222-2222-222222222201"), "admin.full_access", "Acceso completo al administrador."),
        (Guid.Parse("22222222-2222-2222-2222-222222222202"), "products.read", "Ver inventario."),
        (Guid.Parse("22222222-2222-2222-2222-222222222203"), "products.create", "Crear productos."),
        (Guid.Parse("22222222-2222-2222-2222-222222222204"), "products.update", "Actualizar productos."),
        (Guid.Parse("22222222-2222-2222-2222-222222222205"), "products.delete", "Eliminar productos."),
        (Guid.Parse("22222222-2222-2222-2222-222222222206"), "categories.read", "Ver categorias."),
        (Guid.Parse("22222222-2222-2222-2222-222222222207"), "categories.create", "Crear categorias."),
        (Guid.Parse("22222222-2222-2222-2222-222222222208"), "categories.update", "Actualizar categorias."),
        (Guid.Parse("22222222-2222-2222-2222-222222222209"), "categories.delete", "Eliminar categorias."),
        (Guid.Parse("22222222-2222-2222-2222-222222222210"), "content.read", "Ver contenido de landing."),
        (Guid.Parse("22222222-2222-2222-2222-222222222211"), "content.update", "Actualizar contenido de landing."),
        (Guid.Parse("22222222-2222-2222-2222-222222222212"), "images.read", "Ver banco de imagenes."),
        (Guid.Parse("22222222-2222-2222-2222-222222222213"), "images.create", "Cargar imagenes."),
        (Guid.Parse("22222222-2222-2222-2222-222222222214"), "users.read", "Ver usuarios y roles."),
        (Guid.Parse("22222222-2222-2222-2222-222222222215"), "users.create", "Crear usuarios."),
        (Guid.Parse("22222222-2222-2222-2222-222222222216"), "users.update", "Actualizar usuarios."),
        (Guid.Parse("22222222-2222-2222-2222-222222222217"), "roles.create", "Crear roles."),
        (Guid.Parse("22222222-2222-2222-2222-222222222218"), "roles.update", "Actualizar roles.")
    ];

    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "role_permissions",
            schema: "identity",
            columns: table => new
            {
                RoleId = table.Column<Guid>(type: "uuid", nullable: false),
                PermissionId = table.Column<Guid>(type: "uuid", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_role_permissions", x => new { x.RoleId, x.PermissionId });
                table.ForeignKey(
                    name: "FK_role_permissions_permissions_PermissionId",
                    column: x => x.PermissionId,
                    principalSchema: "identity",
                    principalTable: "permissions",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_role_permissions_roles_RoleId",
                    column: x => x.RoleId,
                    principalSchema: "identity",
                    principalTable: "roles",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "user_roles",
            schema: "identity",
            columns: table => new
            {
                UserId = table.Column<Guid>(type: "uuid", nullable: false),
                RoleId = table.Column<Guid>(type: "uuid", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_user_roles", x => new { x.UserId, x.RoleId });
                table.ForeignKey(
                    name: "FK_user_roles_roles_RoleId",
                    column: x => x.RoleId,
                    principalSchema: "identity",
                    principalTable: "roles",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_user_roles_users_UserId",
                    column: x => x.UserId,
                    principalSchema: "identity",
                    principalTable: "users",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_role_permissions_PermissionId",
            schema: "identity",
            table: "role_permissions",
            column: "PermissionId");

        migrationBuilder.CreateIndex(
            name: "IX_user_roles_RoleId",
            schema: "identity",
            table: "user_roles",
            column: "RoleId");

        migrationBuilder.Sql($"""
            INSERT INTO identity.roles ("Id", "Name", "Description", "CreatedAt", "UpdatedAt")
            VALUES ('{AdminRoleId}', 'Admin', 'Administracion completa de AMAS.', NOW(), NULL)
            ON CONFLICT ("Id") DO NOTHING;
            """);

        foreach (var permission in Permissions)
        {
            migrationBuilder.Sql($"""
                INSERT INTO identity.permissions ("Id", "Code", "Description", "CreatedAt", "UpdatedAt")
                VALUES ('{permission.Id}', '{permission.Code}', '{permission.Description}', NOW(), NULL)
                ON CONFLICT ("Id") DO NOTHING;

                INSERT INTO identity.role_permissions ("RoleId", "PermissionId")
                VALUES ('{AdminRoleId}', '{permission.Id}')
                ON CONFLICT ("RoleId", "PermissionId") DO NOTHING;
                """);
        }
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "role_permissions", schema: "identity");
        migrationBuilder.DropTable(name: "user_roles", schema: "identity");

        migrationBuilder.Sql($"""DELETE FROM identity.roles WHERE "Id" = '{AdminRoleId}';""");

        foreach (var permission in Permissions)
        {
            migrationBuilder.Sql($"""DELETE FROM identity.permissions WHERE "Id" = '{permission.Id}';""");
        }
    }
}
