import { StatusBadge } from "./StatusBadge";

export type EnvCardData = {
  id: string;
  name: string;
  description: string;
  status: string;
  containerUrl?: string | null;
};

export function EnvironmentCard({
  env,
  actions,
}: {
  env: EnvCardData;
  actions?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-3 hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-zinc-100">{env.name}</h3>
        <StatusBadge status={env.status} />
      </div>
      <p className="text-sm text-zinc-400 line-clamp-3">{env.description}</p>
      <div className="mt-auto flex items-center justify-between gap-2">
        {env.containerUrl ? (
          <a
            href={env.containerUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="btn btn-primary"
          >
            Access ↗
          </a>
        ) : (
          <span className="text-xs text-zinc-500">No container assigned</span>
        )}
        {actions}
      </div>
    </div>
  );
}
