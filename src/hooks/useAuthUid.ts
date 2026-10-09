import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Id do usuário no Supabase Auth (usado pelos desafios, que servem a qualquer tipo de conta). */
export const useAuthUid = () => {
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUid(data.session?.user.id ?? null));
  }, []);
  return uid;
};
