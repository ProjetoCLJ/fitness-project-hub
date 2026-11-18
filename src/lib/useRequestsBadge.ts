import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { fetchRequestsForStudent, fetchRequestsForTrainer } from "@/lib/requestsStore";
import { fetchWorkoutRequests } from "@/lib/workoutRequests";

/** Quantas solicitações estão aguardando a resposta da pessoa (como aluno e/ou como profissional). */
export const useRequestsBadge = (): number => {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["requests-badge", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      if (!user) return 0;
      const [workout, asTrainer, asStudent] = await Promise.all([
        fetchWorkoutRequests().catch(() => []),
        user.trainerId ? fetchRequestsForTrainer(user.trainerId).catch(() => []) : Promise.resolve([]),
        fetchRequestsForStudent(user.studentId).catch(() => []),
      ]);
      const received = workout.filter((r) => r.status === "pending" && r.requestedBy !== (user.trainerId && r.trainerId === user.trainerId ? "trainer" : "student"));
      return received.length + asTrainer.length + asStudent.length;
    },
  });
  return data ?? 0;
};
