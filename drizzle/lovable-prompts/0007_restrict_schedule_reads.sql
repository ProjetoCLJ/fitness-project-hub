-- 0007: Restringe a leitura da agenda (schedule_events) e dos horários ocultos (hidden_slots).
-- Antes, qualquer pessoa logada lia TODAS as aulas/bloqueios de todos os professores.
-- Agora: o professor lê a própria agenda; o aluno lê só as aulas em que está; e quem quer pedir uma aula
-- usa a função get_trainer_availability, que devolve só os horários (sem título, aluno ou agendamento).

CREATE OR REPLACE FUNCTION public.is_event_student(_event_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.schedule_event_students
    WHERE event_id = _event_id AND student_id = public.current_student_id()
  );
$$;

DROP POLICY IF EXISTS "Authenticated read events" ON public.schedule_events;
CREATE POLICY "Trainer or involved student reads events" ON public.schedule_events FOR SELECT TO authenticated
  USING (trainer_id = public.current_trainer_id() OR public.is_event_student(id));

-- hidden_slots: sem leitura aberta (a política "Trainer manages hidden slots" continua dando acesso ao próprio professor).
DROP POLICY IF EXISTS "Authenticated read hidden slots" ON public.hidden_slots;

-- Disponibilidade para quem vai pedir uma aula: horários mascarados, sem dados pessoais.
CREATE OR REPLACE FUNCTION public.get_trainer_availability(p_trainer_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'events', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', e.id, 'trainer_id', e.trainer_id, 'type', e.type, 'title', NULL, 'recurrence', e.recurrence,
        'date', e.date, 'weekdays', e.weekdays, 'start_date', e.start_date, 'end_date', e.end_date,
        'excluded_dates', e.excluded_dates, 'start_time', e.start_time, 'end_time', e.end_time,
        'booking_id', NULL, 'public_visible', e.public_visible))
      FROM public.schedule_events e WHERE e.trainer_id = p_trainer_id), '[]'::jsonb),
    'hidden', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('slot_date', h.slot_date, 'start_time', h.start_time))
      FROM public.hidden_slots h WHERE h.trainer_id = p_trainer_id), '[]'::jsonb)
  );
$$;
GRANT EXECUTE ON FUNCTION public.get_trainer_availability(uuid) TO authenticated;
