import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { takePendingInvitePath } from "@/lib/challengeStore";
import { supabase } from "@/integrations/supabase/client";

interface User {
  /** id do registro em trainer_profiles/student_profiles — é esse id que o resto do app deve usar como trainerId/clientId. */
  id: string;
  email: string;
  userType: "trainer" | "student";
  profile: {
    id: string;
    fullName: string;
    phone: string;
    profileImageUrl?: string;
  };
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  userType: "trainer" | "student";
  birthDate?: string;
  gender?: string;
  description?: string;
  // aluno
  fitnessGoals?: string;
  // profissional
  cref?: string;
  startDate?: string;
  basePrice?: number;
  objectives?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  /** Autentica contra o Supabase Auth — o papel (aluno/profissional) vem do perfil, nunca é escolhido no login. */
  login: (email: string, password: string) => Promise<void>;
  /** Devolve "confirm" quando o projeto exige confirmar o e-mail (a pessoa ainda não está logada). */
  register: (input: RegisterInput) => Promise<"done" | "confirm">;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

type ExtraProfile = Omit<RegisterInput, "email" | "password" | "fullName" | "phone">;

/**
 * Dados extras do cadastro (data de nascimento, CREF, preços etc.) viajam nos metadados do signUp,
 * porque com confirmação de e-mail a pessoa só tem sessão depois de clicar no link. Aplicamos no primeiro login.
 */
const applyExtraProfile = async (authUserId: string) => {
  const { data: sessionData } = await supabase.auth.getSession();
  const extra = sessionData.session?.user.user_metadata?.extra as ExtraProfile | undefined;
  if (!extra || sessionData.session?.user.id !== authUserId) return;

  const { data: profileRow } = await supabase.from("profiles").select("id").eq("user_id", authUserId).maybeSingle();
  if (!profileRow) return;

  await supabase
    .from("profiles")
    .update({ birth_date: extra.birthDate || null, gender: extra.gender || null })
    .eq("id", profileRow.id);

  if (extra.userType === "trainer") {
    await supabase
      .from("trainer_profiles")
      .update({
        cref: extra.cref || null,
        start_date: extra.startDate || null,
        base_price: extra.basePrice ?? null,
        description: extra.description || null,
        objectives: extra.objectives || null,
        instagram: extra.instagram || null,
        facebook: extra.facebook || null,
        linkedin: extra.linkedin || null,
      })
      .eq("profile_id", profileRow.id);
  } else {
    await supabase
      .from("student_profiles")
      .update({ description: extra.description || null, fitness_goals: extra.fitnessGoals || null })
      .eq("profile_id", profileRow.id);
  }

  await supabase.auth.updateUser({ data: { extra: null } });
};

/** Monta o User da app a partir da sessão: busca profiles e, em seguida, o registro específico do papel. */
const loadUser = async (authUserId: string): Promise<User | null> => {
  await applyExtraProfile(authUserId);
  const { data: profileRow } = await supabase.from("profiles").select("*").eq("user_id", authUserId).maybeSingle();
  if (!profileRow) return null;

  let roleProfileId = profileRow.id;
  if (profileRow.role === "trainer") {
    const { data: trainerRow } = await supabase
      .from("trainer_profiles")
      .select("id")
      .eq("profile_id", profileRow.id)
      .maybeSingle();
    if (trainerRow) roleProfileId = trainerRow.id;
  } else {
    const { data: studentRow } = await supabase
      .from("student_profiles")
      .select("id")
      .eq("profile_id", profileRow.id)
      .maybeSingle();
    if (studentRow) roleProfileId = studentRow.id;
  }

  return {
    id: roleProfileId,
    email: profileRow.email,
    userType: profileRow.role,
    profile: {
      id: roleProfileId,
      fullName: profileRow.full_name,
      phone: profileRow.phone ?? "",
      profileImageUrl: profileRow.profile_image_url ?? undefined,
    },
  };
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const loadedUser = await loadUser(session.user.id);
        if (active) setUser(loadedUser);
      }
      if (active) setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) setUser(null);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error?.message?.toLowerCase().includes("not confirmed")) throw new Error("EMAIL_NOT_CONFIRMED");
      if (error || !data.session) throw new Error("E-mail ou senha inválidos");

      const loggedUser = await loadUser(data.session.user.id);
      if (!loggedUser) throw new Error("Não foi possível carregar seu perfil.");

      setUser(loggedUser);
      navigate(takePendingInvitePath() ?? (loggedUser.userType === "trainer" ? "/dashboard/trainer" : "/dashboard/student"));
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (input: RegisterInput) => {
    setIsLoading(true);
    try {
      const { email, password, fullName, phone, ...extra } = input;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirmado`,
          data: { full_name: fullName, role: input.userType, phone, extra },
        },
      });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error("Não foi possível criar sua conta.");

      // Com confirmação de e-mail ativa não há sessão até a pessoa clicar no link enviado.
      if (!data.session) return "confirm";

      const registeredUser = await loadUser(data.session.user.id);
      if (!registeredUser) throw new Error("Conta criada, mas não foi possível carregar seu perfil.");

      setUser(registeredUser);
      navigate(takePendingInvitePath() ?? (registeredUser.userType === "trainer" ? "/dashboard/trainer" : "/dashboard/student"));
      return "done";
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    supabase.auth.signOut();
    setUser(null);
    navigate("/");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
