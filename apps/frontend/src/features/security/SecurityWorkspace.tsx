import { FormEvent, useEffect, useMemo, useState } from "react";
import { KeyRound, RefreshCw, ShieldCheck, UserCog, UserPlus } from "lucide-react";
import {
  SecurityPermission,
  SecurityRole,
  SecurityUser,
  securityApi
} from "./security-api";

type SecurityWorkspaceProps = {
  accessToken: string;
};

type Feedback = {
  tone: "success" | "error";
  message: string;
} | null;

export function SecurityWorkspace({ accessToken }: SecurityWorkspaceProps) {
  const [users, setUsers] = useState<SecurityUser[]>([]);
  const [roles, setRoles] = useState<SecurityRole[]>([]);
  const [permissions, setPermissions] = useState<SecurityPermission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [permissionIds, setPermissionIds] = useState<string[]>([]);
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId),
    [roles, selectedRoleId]
  );
  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId),
    [users, selectedUserId]
  );

  useEffect(() => {
    void loadSecurityData();
  }, [accessToken]);

  useEffect(() => {
    setPermissionIds(selectedRole?.rolePermissions?.map((entry) => entry.permission.id) ?? []);
  }, [selectedRole]);

  useEffect(() => {
    setRoleIds(selectedUser?.userRoles.map((entry) => entry.role.id) ?? []);
  }, [selectedUser]);

  const loadSecurityData = async () => {
    setIsLoading(true);
    setFeedback(null);

    try {
      const [nextUsers, nextRoles, nextPermissions] = await Promise.all([
        securityApi.listUsers(accessToken),
        securityApi.listRoles(accessToken),
        securityApi.listPermissions(accessToken)
      ]);
      setUsers(nextUsers);
      setRoles(nextRoles);
      setPermissions(nextPermissions);
      setSelectedRoleId((current) => current || nextRoles[0]?.id || "");
      setSelectedUserId((current) => current || nextUsers[0]?.id || "");
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "No fue posible cargar seguridad."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runAction = async (action: () => Promise<void>, successMessage: string) => {
    setIsLoading(true);
    setFeedback(null);

    try {
      await action();
      await loadSecurityData();
      setFeedback({
        tone: "success",
        message: successMessage
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "La operacion no pudo completarse."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateStoreAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const storeId = String(formData.get("storeId") ?? "").trim();
    const storeName = String(formData.get("storeName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();

    await runAction(
      () =>
        securityApi.createStoreAdmin(accessToken, {
          ...(storeId ? { storeId } : { storeName }),
          username: String(formData.get("username") ?? ""),
          password: String(formData.get("password") ?? ""),
          displayName: String(formData.get("displayName") ?? ""),
          ...(email ? { email } : {})
        }).then(() => undefined),
      "Administrador de tienda creado."
    );
  };

  const handleCreateRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    await runAction(
      () =>
        securityApi.createRole(accessToken, {
          name: String(formData.get("name") ?? ""),
          description: String(formData.get("description") ?? ""),
          isSystemRole: formData.get("isSystemRole") === "on"
        }).then(() => undefined),
      "Rol creado."
    );
  };

  const handleCreatePermission = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    await runAction(
      () =>
        securityApi.createPermission(accessToken, {
          code: String(formData.get("code") ?? ""),
          description: String(formData.get("description") ?? "")
        }).then(() => undefined),
      "Permiso creado."
    );
  };

  const handleAssignPermissions = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedRoleId) {
      setFeedback({ tone: "error", message: "Selecciona un rol." });
      return;
    }

    await runAction(
      () => securityApi.assignPermissionsToRole(accessToken, selectedRoleId, permissionIds).then(() => undefined),
      "Permisos asignados al rol."
    );
  };

  const handleAssignRoles = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedUserId) {
      setFeedback({ tone: "error", message: "Selecciona un usuario." });
      return;
    }

    await runAction(
      () => securityApi.assignRolesToUser(accessToken, selectedUserId, roleIds).then(() => undefined),
      "Roles asignados al usuario."
    );
  };

  return (
    <div className="security-layout">
      <div className="section-header">
        <div>
          <p className="eyebrow">Seguridad</p>
          <h3>Usuarios, roles y permisos</h3>
        </div>
        <button className="secondary-button" disabled={isLoading} type="button" onClick={loadSecurityData}>
          <RefreshCw size={18} aria-hidden="true" />
          <span>{isLoading ? "Cargando" : "Actualizar"}</span>
        </button>
      </div>

      {feedback ? (
        <div className={`feedback ${feedback.tone}`} role="status">
          <ShieldCheck size={18} aria-hidden="true" />
          <span>{feedback.message}</span>
        </div>
      ) : null}

      <section className="security-grid" aria-label="Resumen de seguridad">
        <Metric label="Usuarios" value={users.length} />
        <Metric label="Roles" value={roles.length} />
        <Metric label="Permisos" value={permissions.length} />
      </section>

      <section className="data-panel" aria-label="Usuarios registrados">
        <h4>Usuarios</h4>
        <div className="table-list">
          {users.map((user) => (
            <article key={user.id} className="table-row">
              <div>
                <strong>{user.displayName}</strong>
                <span>{user.username}</span>
              </div>
              <span>{user.store?.name ?? "Global"}</span>
              <span>{user.userRoles.map((entry) => entry.role.name).join(", ") || "Sin roles"}</span>
            </article>
          ))}
        </div>
      </section>

      <div className="form-grid">
        <form className="auth-form" aria-label="Crear administrador de tienda" onSubmit={handleCreateStoreAdmin}>
          <h4>Primer administrador</h4>
          <label>
            Store ID existente
            <input name="storeId" type="text" />
          </label>
          <label>
            Nombre de tienda nueva
            <input name="storeName" type="text" />
          </label>
          <label>
            Usuario
            <input name="username" required type="text" />
          </label>
          <label>
            Nombre visible
            <input name="displayName" required type="text" />
          </label>
          <label>
            Email
            <input name="email" type="email" />
          </label>
          <label>
            Contrasena
            <input minLength={8} name="password" required type="password" />
          </label>
          <button className="primary-button" disabled={isLoading} type="submit">
            <UserPlus size={18} aria-hidden="true" />
            <span>Crear admin</span>
          </button>
        </form>

        <form className="auth-form" aria-label="Crear rol" onSubmit={handleCreateRole}>
          <h4>Nuevo rol</h4>
          <label>
            Nombre
            <input name="name" required type="text" />
          </label>
          <label>
            Descripcion
            <input name="description" type="text" />
          </label>
          <label className="inline-check">
            <input name="isSystemRole" type="checkbox" />
            Rol de sistema
          </label>
          <button className="primary-button" disabled={isLoading} type="submit">
            <KeyRound size={18} aria-hidden="true" />
            <span>Crear rol</span>
          </button>
        </form>

        <form className="auth-form" aria-label="Crear permiso" onSubmit={handleCreatePermission}>
          <h4>Nuevo permiso</h4>
          <label>
            Codigo
            <input name="code" required type="text" />
          </label>
          <label>
            Descripcion
            <input name="description" type="text" />
          </label>
          <button className="primary-button" disabled={isLoading} type="submit">
            <ShieldCheck size={18} aria-hidden="true" />
            <span>Crear permiso</span>
          </button>
        </form>
      </div>

      <div className="form-grid two">
        <form className="auth-form" aria-label="Asignar permisos a rol" onSubmit={handleAssignPermissions}>
          <h4>Permisos por rol</h4>
          <label>
            Rol
            <select value={selectedRoleId} onChange={(event) => setSelectedRoleId(event.target.value)}>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
          <CheckboxList
            items={permissions.map((permission) => ({
              id: permission.id,
              label: permission.code
            }))}
            selectedIds={permissionIds}
            onChange={setPermissionIds}
          />
          <button className="primary-button" disabled={isLoading} type="submit">
            <UserCog size={18} aria-hidden="true" />
            <span>Guardar permisos</span>
          </button>
        </form>

        <form className="auth-form" aria-label="Asignar roles a usuario" onSubmit={handleAssignRoles}>
          <h4>Roles por usuario</h4>
          <label>
            Usuario
            <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username}
                </option>
              ))}
            </select>
          </label>
          <CheckboxList
            items={roles.map((role) => ({
              id: role.id,
              label: role.name
            }))}
            selectedIds={roleIds}
            onChange={setRoleIds}
          />
          <button className="primary-button" disabled={isLoading} type="submit">
            <UserCog size={18} aria-hidden="true" />
            <span>Guardar roles</span>
          </button>
        </form>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CheckboxList({
  items,
  selectedIds,
  onChange
}: {
  items: Array<{ id: string; label: string }>;
  selectedIds: string[];
  onChange: (nextIds: string[]) => void;
}) {
  return (
    <fieldset className="check-list">
      {items.map((item) => {
        const isSelected = selectedIds.includes(item.id);

        return (
          <label key={item.id} className="inline-check">
            <input
              checked={isSelected}
              type="checkbox"
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...selectedIds, item.id]
                    : selectedIds.filter((selectedId) => selectedId !== item.id)
                )
              }
            />
            {item.label}
          </label>
        );
      })}
    </fieldset>
  );
}
