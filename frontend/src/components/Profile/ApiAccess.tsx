import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "react-toast";
import { Check, Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import {
  createApiClient,
  listApiClients,
  revokeApiClient,
  type ApiClient,
  type CreatedApiClient,
} from "../../utils/api/userService/apiClientsApi";

const API_CLIENTS_KEY = ["api-clients"];

function CopyField({ label, value }: { label: string; value: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  };

  return (
    <div>
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400">{label}</span>
      <div className="flex items-stretch gap-2">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100">
          {value}
        </code>
        <button
          type="button"
          onClick={copy}
          className="flex shrink-0 items-center gap-1 rounded-lg bg-white/10 px-3 text-sm text-white transition hover:bg-white/20"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? t("profile.api.copied") : t("profile.api.copy")}
        </button>
      </div>
    </div>
  );
}

function ApiAccess() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [created, setCreated] = useState<CreatedApiClient | null>(null);

  const clientsQuery = useQuery({ queryKey: API_CLIENTS_KEY, queryFn: listApiClients });

  const createMutation = useMutation({
    mutationFn: (clientName: string) => createApiClient(clientName),
    onSuccess: (client) => {
      setCreated(client);
      setName("");
      toast.success(t("profile.api.created"));
      queryClient.invalidateQueries({ queryKey: API_CLIENTS_KEY });
    },
    onError: () => toast.error(t("profile.api.createFailed")),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: number) => revokeApiClient(id),
    onSuccess: (_, id) => {
      if (created?.id === id) setCreated(null);
      toast.success(t("profile.api.revoked"));
      queryClient.invalidateQueries({ queryKey: API_CLIENTS_KEY });
    },
    onError: () => toast.error(t("profile.api.revokeFailed")),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const clientName = name.trim();
    if (!clientName || createMutation.isPending) return;
    createMutation.mutate(clientName);
  };

  const revoke = (client: ApiClient) => {
    if (window.confirm(t("profile.api.revokeConfirm", { name: client.name }))) {
      revokeMutation.mutate(client.id);
    }
  };

  const formatDate = (value: string) => new Date(value).toLocaleDateString(i18n.language);
  const tokenUrl = `${import.meta.env.VITE_BACKEND_URL}/api/oauth/token`;

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl sm:p-8">
      <div className="mb-6">
        <h3 className="mb-2 text-xl font-semibold text-white">
          <KeyRound className="mr-2 inline h-5 w-5" />
          {t("profile.api.title")}
        </h3>
        <p className="text-sm text-gray-400">{t("profile.api.description")}</p>
      </div>

      <form onSubmit={submit} className="mb-6 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          required
          placeholder={t("profile.api.namePlaceholder")}
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-hidden transition focus:border-white focus:ring-2 focus:ring-white/30"
        />
        <button
          type="submit"
          disabled={createMutation.isPending || !name.trim()}
          className="flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-medium text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {createMutation.isPending ? t("profile.api.creating") : t("profile.api.create")}
        </button>
      </form>

      {created && (
        <div className="mb-6 space-y-4 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
          <p className="text-sm font-medium text-amber-200">{t("profile.api.secretOnce")}</p>
          <CopyField label={t("profile.api.clientId")} value={created.client_id} />
          <CopyField label={t("profile.api.clientSecret")} value={created.client_secret} />
          <CopyField
            label={t("profile.api.example")}
            value={`curl -X POST ${tokenUrl} -d grant_type=client_credentials -d client_id=${created.client_id} -d client_secret=${created.client_secret}`}
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setCreated(null)}
              className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
            >
              {t("profile.api.dismiss")}
            </button>
          </div>
        </div>
      )}

      {clientsQuery.isPending ? null : clientsQuery.isError ? (
        <p className="text-sm text-gray-400">{t("profile.api.loadFailed")}</p>
      ) : clientsQuery.data.length === 0 ? (
        <p className="border-t border-white/10 pt-6 text-sm text-gray-400">{t("profile.api.noClients")}</p>
      ) : (
        <ul className="divide-y divide-white/10 border-t border-white/10">
          {clientsQuery.data.map((client) => (
            <li key={client.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{client.name}</p>
                <p className="truncate font-mono text-xs text-gray-400">{client.client_id}</p>
                <p className="text-xs text-gray-500">
                  {t("profile.api.createdOn", { date: formatDate(client.created_at) })}
                  {" · "}
                  {client.last_used_at
                    ? t("profile.api.lastUsed", { date: formatDate(client.last_used_at) })
                    : t("profile.api.neverUsed")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => revoke(client)}
                disabled={revokeMutation.isPending}
                className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {t("profile.api.revoke")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ApiAccess;
