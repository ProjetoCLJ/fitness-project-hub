import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { fetchGmOverview, fetchLeagueOverview } from "@/lib/gamification";

/** XP, Foco e semana do atleta. Se as tabelas ainda não existirem no banco, a consulta falha em silêncio (isError). */
export const useGmOverview = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["gm-overview", user?.studentId],
    queryFn: fetchGmOverview,
    enabled: !!user,
    staleTime: 20_000,
    retry: false,
  });
};

export const useLeagueOverview = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["league-overview", user?.studentId],
    queryFn: fetchLeagueOverview,
    enabled: !!user,
    staleTime: 20_000,
    retry: false,
  });
};

/** Depois de concluir treino, escolher meta etc.: recarrega XP, Foco, liga e medalhas. */
export const useRefreshGamification = () => {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["gm-overview"] });
    qc.invalidateQueries({ queryKey: ["league-overview"] });
    qc.invalidateQueries({ queryKey: ["medals"] });
  };
};
