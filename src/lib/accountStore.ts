// Store local (localStorage) de contas cadastradas — simula um backend
// de autenticação até termos um banco de dados real. Sem isso, o login
// aceitava qualquer email/senha e deixava escolher o papel livremente.

export interface Account {
  email: string;
  password: string;
  userType: "student" | "trainer";
  fullName: string;
  phone: string;
}

const STORAGE_KEY = "fit_accounts";

const load = (): Account[] => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Account[];
  } catch {
    return [];
  }
};

const persist = (accounts: Account[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
};

export const accountExists = (email: string): boolean =>
  load().some((a) => a.email.toLowerCase() === email.toLowerCase());

export const registerAccount = (account: Account) => {
  const accounts = load().filter((a) => a.email.toLowerCase() !== account.email.toLowerCase());
  accounts.push(account);
  persist(accounts);
};

export const findAccount = (email: string, password: string): Account | undefined =>
  load().find((a) => a.email.toLowerCase() === email.toLowerCase() && a.password === password);
