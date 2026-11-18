import { supabase } from "@/integrations/supabase/client";

export type SocialProvider = "google" | "apple" | "facebook";

/** Para onde o provedor devolve a pessoa: a tela que conclui o cadastro (ou leva ao painel, se já tinha conta). */
export const SOCIAL_REDIRECT_PATH = "/auth/social";

const ROLE_KEY = "signup-role";

/** Guarda o tipo de uso escolhido no cadastro, para a conta social nova já nascer como professor ou aluno. */
export const rememberSignupRole = (role: "student" | "trainer" | undefined) => {
  try {
    if (role) localStorage.setItem(ROLE_KEY, role);
    else localStorage.removeItem(ROLE_KEY);
  } catch {
    /* sem storage */
  }
};

export const takeSignupRole = (): "student" | "trainer" | null => {
  try {
    const value = localStorage.getItem(ROLE_KEY);
    localStorage.removeItem(ROLE_KEY);
    return value === "student" || value === "trainer" ? value : null;
  } catch {
    return null;
  }
};

// Se o projeto tiver o login social gerenciado pelo Lovable Cloud (src/integrations/lovable), usa ele; senão, o do Supabase.
const lovableModules = import.meta.glob("/src/integrations/lovable/index.ts");

type LovableAuth = {
  lovable: { auth: { signInWithOAuth: (provider: string, options: { redirect_uri: string }) => Promise<{ error?: unknown; redirected?: boolean }> } };
};

/** Abre o login do provedor. Em caso de sucesso a página é redirecionada; só retorna se algo der errado (lança o erro). */
export const signInWithProvider = async (provider: SocialProvider): Promise<void> => {
  const redirectTo = `${window.location.origin}${SOCIAL_REDIRECT_PATH}`;
  const loader = Object.values(lovableModules)[0];
  if (loader && provider !== "facebook") {
    const mod = (await loader()) as LovableAuth;
    const result = await mod.lovable.auth.signInWithOAuth(provider, { redirect_uri: redirectTo });
    if (result.error) throw result.error instanceof Error ? result.error : new Error("Não foi possível entrar com essa conta.");
    return;
  }
  const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
  if (error) throw error;
};
