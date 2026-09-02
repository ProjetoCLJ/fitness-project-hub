import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { findAccount } from "@/lib/accountStore";

interface User {
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

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  /** Autentica contra as contas cadastradas — o papel (aluno/profissional) vem da conta, nunca é escolhido no login. */
  login: (email: string, password: string) => Promise<void>;
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

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem("fitconnect_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const account = findAccount(email, password);
      if (!account) {
        throw new Error("E-mail ou senha inválidos");
      }

      const loggedUser: User = {
        id: `user-${account.email}`,
        email: account.email,
        userType: account.userType,
        profile: {
          id: `profile-${account.email}`,
          fullName: account.fullName,
          phone: account.phone,
        },
      };

      setUser(loggedUser);
      localStorage.setItem("fitconnect_user", JSON.stringify(loggedUser));

      navigate(account.userType === "trainer" ? "/dashboard/trainer" : "/dashboard/student");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("fitconnect_user");
    navigate("/");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
