import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FEATURES } from "@/lib/features";
import { SocialProvider, rememberSignupRole, signInWithProvider } from "@/lib/socialAuth";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
  </svg>
);

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
    <path d="M16.37 1.43c0 1.14-.46 2.22-1.2 3-.8.86-2.1 1.5-3.15 1.42-.13-1.1.4-2.26 1.14-3.03.82-.86 2.2-1.5 3.21-1.39zM20.5 17.2c-.57 1.3-.84 1.88-1.58 3.03-1.02 1.6-2.47 3.6-4.27 3.6-1.6.02-2.01-1.04-4.18-1.03-2.17.01-2.62 1.05-4.22 1.03-1.8-.02-3.18-1.82-4.2-3.42C-.84 16.5-1.14 11.2.66 8.4c1.28-2 3.3-3.16 5.2-3.16 1.93 0 3.14 1.06 4.74 1.06 1.55 0 2.5-1.06 4.73-1.06 1.69 0 3.48.92 4.76 2.5-4.18 2.29-3.5 8.27.41 9.46z" />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
    <path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
  </svg>
);

const PROVIDERS: { key: SocialProvider; label: string; Icon: () => JSX.Element }[] = [
  { key: "google", label: "Google", Icon: GoogleIcon },
  { key: "apple", label: "Apple", Icon: AppleIcon },
  { key: "facebook", label: "Facebook", Icon: FacebookIcon },
];

interface SocialButtonsProps {
  /** No cadastro, o tipo de uso já escolhido (a conta social nova nasce como professor ou aluno). */
  role?: "student" | "trainer";
  /** Texto do traço separador. */
  dividerText?: string;
  /** Separador antes dos botões (cadastro) ou depois (login). */
  dividerFirst?: boolean;
  /** Prefixo do texto dos botões. */
  action?: string;
}

/** Botões "Continuar com Google/Apple/Facebook". Só mostra os provedores ligados em FEATURES.socialLogin. */
export const SocialButtons = ({ role, dividerText = "ou", dividerFirst = false, action = "Continuar com" }: SocialButtonsProps) => {
  const { toast } = useToast();
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  const providers = PROVIDERS.filter((p) => FEATURES.socialLogin[p.key]);
  if (providers.length === 0) return null;

  const start = async (provider: SocialProvider) => {
    setBusy(provider);
    try {
      rememberSignupRole(role);
      await signInWithProvider(provider);
      // A página vai para o provedor; se voltar aqui, nada mais a fazer.
    } catch (error) {
      setBusy(null);
      toast({
        title: "Não foi possível continuar",
        description: error instanceof Error && error.message ? error.message : "Tente novamente ou use seu e-mail.",
        variant: "destructive",
      });
    }
  };

  const divider = (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      {dividerText}
      <span className="h-px flex-1 bg-border" />
    </div>
  );

  return (
    <div className="space-y-3">
      {dividerFirst ? null : divider}
      <div className="grid gap-2">
        {providers.map(({ key, label, Icon }) => (
          <Button key={key} type="button" variant="outline" className="w-full gap-2" disabled={busy !== null} onClick={() => start(key)}>
            <Icon />
            {busy === key ? "Abrindo..." : `${action} ${label}`}
          </Button>
        ))}
      </div>
      {dividerFirst ? divider : null}
    </div>
  );
};
