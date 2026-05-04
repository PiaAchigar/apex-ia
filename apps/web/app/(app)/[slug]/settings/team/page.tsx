"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Users, Pencil, Trash2, Loader2 } from "lucide-react";
import { useTeam } from "@/hooks/useTeam";
import { useAuth } from "@/hooks/useAuth";

export default function TeamPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { session } = useAuth();
  const currentUserId = session?.user?.id;
  const {
    members,
    roles,
    isLoading,
    invite,
    updateRole,
    remove,
  } = useTeam();

  // Modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showChangeRoleModal, setShowChangeRoleModal] = useState<string | null>(
    null
  );
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState(roles[0]?.id || "");
  const [changeRoleId, setChangeRoleId] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [changeRoleError, setChangeRoleError] = useState("");
  const [inviteSaving, setInviteSaving] = useState(false);
  const [changeRoleSaving, setChangeRoleSaving] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [changeRoleSuccess, setChangeRoleSuccess] = useState(false);

  const handleInvite = async () => {
    setInviteError("");
    if (!inviteEmail.trim() || !inviteRoleId) {
      setInviteError("Email y rol son requeridos");
      return;
    }

    setInviteSaving(true);
    try {
      await invite({ email: inviteEmail.trim(), roleId: inviteRoleId });
      setInviteEmail("");
      setInviteRoleId(roles[0]?.id || "");
      setShowInviteModal(false);
      setInviteSuccess(true);
      setTimeout(() => setInviteSuccess(false), 3000);
    } catch (err) {
      const error = err as any;
      setInviteError(error.message || "Error al invitar miembro");
    } finally {
      setInviteSaving(false);
    }
  };

  const handleChangeRole = async (userId: string) => {
    if (!changeRoleId) {
      setChangeRoleError("Rol requerido");
      return;
    }

    setChangeRoleSaving(true);
    try {
      await updateRole({ userId, roleId: changeRoleId });
      setShowChangeRoleModal(null);
      setChangeRoleSuccess(true);
      setTimeout(() => setChangeRoleSuccess(false), 3000);
    } catch (err) {
      const error = err as any;
      setChangeRoleError(error.message || "Error al actualizar rol");
    } finally {
      setChangeRoleSaving(false);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!window.confirm("¿Estás seguro? Esta acción no se puede deshacer.")) {
      return;
    }

    try {
      await remove(userId);
    } catch (err) {
      const error = err as any;
      console.error(error.message || "Error al remover miembro");
    }
  };

  const openChangeRoleModal = (userId: string) => {
    const member = members.find((m) => m.id === userId);
    if (member) {
      setChangeRoleId(member.roleId);
      setShowChangeRoleModal(userId);
      setChangeRoleError("");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#111827]">
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/${slug}/settings`}
            className="text-emerald-400 hover:text-emerald-300 text-sm mb-4 inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Configuración
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Equipo</h1>
              <p className="text-gray-400">Gestiona los miembros de tu equipo</p>
            </div>
            <button
              onClick={() => {
                setShowInviteModal(true);
                setInviteError("");
              }}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              + Invitar miembro
            </button>
          </div>
        </div>

        {/* Success message */}
        {inviteSuccess && (
          <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-lg text-sm">
            Miembro invitado correctamente
          </div>
        )}
        {changeRoleSuccess && (
          <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-lg text-sm">
            Rol actualizado correctamente
          </div>
        )}

        {/* Members List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-400">Cargando miembros...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">No hay miembros en el equipo</p>
            <button
              onClick={() => setShowInviteModal(true)}
              className="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
            >
              Invitar el primer miembro
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="bg-[#1F2937] border border-[#374151] rounded-lg p-4 flex items-center justify-between hover:border-[#4B5563] transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-400 font-semibold text-sm">
                      {(member.fullName || member.email)[0].toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {member.fullName || "Sin nombre"}
                    </p>
                    <p className="text-gray-400 text-sm truncate">
                      {member.email}
                    </p>
                  </div>

                  {/* Role and date */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        member.roleName === "admin"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-blue-500/20 text-blue-300"
                      }`}
                    >
                      {member.roleDisplayName}
                    </span>
                    <span className="text-gray-500 text-xs whitespace-nowrap">
                      {new Date(member.joinedAt).toLocaleDateString("es-AR")}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => openChangeRoleModal(member.id)}
                    className="p-2 hover:bg-[#374151] rounded-lg transition-colors text-gray-400 hover:text-emerald-400"
                    title="Cambiar rol"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRemove(member.id)}
                    disabled={member.id === currentUserId}
                    className={`p-2 rounded-lg transition-colors ${
                      member.id === currentUserId
                        ? "text-gray-600 cursor-not-allowed"
                        : "hover:bg-red-500/10 text-red-400 hover:text-red-300"
                    }`}
                    title={
                      member.id === currentUserId
                        ? "No puedes removerte a ti mismo"
                        : "Remover miembro"
                    }
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-[#1F2937] border border-[#374151] shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                Invitar miembro
              </h2>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteError("");
                }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="ejemplo@empresa.com"
                  className="w-full bg-[#111827] border border-[#374151] text-white rounded-lg px-3 py-2 focus:border-emerald-500/50 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Rol
                </label>
                <select
                  value={inviteRoleId}
                  onChange={(e) => setInviteRoleId(e.target.value)}
                  className="w-full bg-[#111827] border border-[#374151] text-white rounded-lg px-3 py-2 focus:border-emerald-500/50 focus:outline-none transition-colors"
                >
                  <option value="">Selecciona un rol</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.displayName}
                    </option>
                  ))}
                </select>
              </div>

              {inviteError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-lg text-sm">
                  {inviteError}
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteError("");
                }}
                className="flex-1 px-4 py-2 bg-[#111827] border border-[#374151] text-gray-300 rounded-lg hover:border-[#4B5563] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleInvite}
                disabled={inviteSaving}
                className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {inviteSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Invitar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Role Modal */}
      {showChangeRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-[#1F2937] border border-[#374151] shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Cambiar rol</h2>
              <button
                onClick={() => {
                  setShowChangeRoleModal(null);
                  setChangeRoleError("");
                }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Rol
                </label>
                <select
                  value={changeRoleId}
                  onChange={(e) => setChangeRoleId(e.target.value)}
                  className="w-full bg-[#111827] border border-[#374151] text-white rounded-lg px-3 py-2 focus:border-emerald-500/50 focus:outline-none transition-colors"
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.displayName}
                    </option>
                  ))}
                </select>
              </div>

              {changeRoleError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-lg text-sm">
                  {changeRoleError}
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowChangeRoleModal(null);
                  setChangeRoleError("");
                }}
                className="flex-1 px-4 py-2 bg-[#111827] border border-[#374151] text-gray-300 rounded-lg hover:border-[#4B5563] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleChangeRole(showChangeRoleModal)}
                disabled={changeRoleSaving}
                className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {changeRoleSaving && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
