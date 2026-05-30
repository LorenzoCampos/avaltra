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
