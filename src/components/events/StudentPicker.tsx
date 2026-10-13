import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { LinkedStudent, fetchLinkedStudents } from "@/lib/agendaStore";

interface Props {
  trainerId: string;
  selected: string[];
  onChange: (ids: string[]) => void;
}

/** Lista os alunos da carteira do professor para marcar quem será convidado. */
export const StudentPicker = ({ trainerId, selected, onChange }: Props) => {
  const [students, setStudents] = useState<LinkedStudent[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchLinkedStudents(trainerId)
      .then(setStudents)
      .catch(() => setStudents([]));
  }, [trainerId]);

  if (students === null) return null;
  if (students.length === 0) {
    return <p className="text-sm text-muted-foreground">Você ainda não tem alunos na carteira para convidar.</p>;
  }

  const q = query.trim().toLowerCase();
  const visible = q ? students.filter((s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)) : students;
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);

  return (
    <div className="space-y-2">
      <Input placeholder="Buscar aluno" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="max-h-44 overflow-y-auto rounded-md border divide-y">
        {visible.map((s) => (
          <label key={s.studentId} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/60">
            <Checkbox checked={selected.includes(s.studentId)} onCheckedChange={() => toggle(s.studentId)} />
            <span className="min-w-0">
              <span className="block text-sm font-medium truncate">{s.name}</span>
              <span className="block text-xs text-muted-foreground truncate">{s.email}</span>
            </span>
          </label>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{selected.length} selecionado(s)</p>
    </div>
  );
};
