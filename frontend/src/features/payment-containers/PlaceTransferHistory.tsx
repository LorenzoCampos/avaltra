import type { PlaceTransfer } from '@/types/placeTransfer';

type PlaceTransferHistoryProps = {
  transfers: PlaceTransfer[];
  isLoading?: boolean;
};
const formatDate = (date: string) => date.slice(0, 10);

export function PlaceTransferHistory({ transfers, isLoading = false }: PlaceTransferHistoryProps) {
  if (isLoading) {
    return <p className="rounded-2xl bg-white p-5 text-sm text-gray-500 shadow-sm dark:bg-gray-900 dark:text-gray-400">Cargando transferencias…</p>;
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="border-b border-gray-200 p-5 dark:border-gray-800">
        <h2 className="font-semibold text-gray-900 dark:text-white">Historial de transferencias</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Movimientos recientes de plata entre lugares.</p>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {transfers.length === 0 ? (
          <p className="p-5 text-sm text-gray-500 dark:text-gray-400">Todavía no hay transferencias.</p>
        ) : (
          transfers.map((transfer) => (
            <article key={transfer.id} className="p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {transfer.source_container_name} → {transfer.destination_container_name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(transfer.date)}</p>
                  {transfer.note && <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{transfer.note}</p>}
                </div>
                <p className="font-semibold text-gray-900 dark:text-white">{transfer.currency} {transfer.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
