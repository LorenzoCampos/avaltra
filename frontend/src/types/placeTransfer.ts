export type PlaceTransfer = {
  id: string;
  account_id: string;
  source_container_id: string;
  source_container_name: string;
  destination_container_id: string;
  destination_container_name: string;
  amount: number;
  currency: 'ARS';
  date: string;
  note: string | null;
  created_at: string;
  updated_at: string;
  canceled_at?: string | null;
  deleted_at?: string | null;
};
export type PlaceTransfersResponse = {
  place_transfers: PlaceTransfer[];
  count: number;
};
export type CreatePlaceTransferRequest = {
  source_container_id: string;
  destination_container_id: string;
  amount: number;
  date: string;
  note?: string;
  currency?: 'ARS';
};

export type CancelPlaceTransferResponse = {
  id: string;
  status: 'canceled';
  canceled_at: string;
};
