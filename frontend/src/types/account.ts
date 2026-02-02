import type { Currency, AccountType as ApiAccountType } from './api';

// Account types from API
export type AccountType = ApiAccountType; // "personal" | "family"

// Family member for account creation
export interface CreateAccountMember {
  name: string;
  email?: string;
}

// Family member (as returned by API in Account details)
export interface FamilyMember {
  id: string;
  name: string;
  email: string | null;
  isActive: boolean;
}

// Base Account interface (as returned by API)
export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  user_id: string;
  created_at: string;
  updated_at: string;
  members?: FamilyMember[];
  memberCount?: number; // For listing accounts
}

// Request body for creating a new account (Personal)
export interface CreatePersonalAccountRequest {
  name: string;
  type: 'personal';
  currency: Currency;
}

// Request body for creating a new account (Family)
export interface CreateFamilyAccountRequest {
  name: string;
  type: 'family';
  currency: Currency;
  members: CreateAccountMember[];
}

// Union type for account creation requests
export type CreateAccountRequest = CreatePersonalAccountRequest | CreateFamilyAccountRequest;

// Request body for updating an existing account
export interface UpdateAccountRequest {
  id: string;
  name?: string;
  currency?: Currency;
}
