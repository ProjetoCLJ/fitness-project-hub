import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ImagePlus, X } from "lucide-react";
import { CityPicker } from "@/components/events/CityPicker";
import { EventInput, EventItem } from "@/lib/eventStore";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Quando informado, edita este evento. */
  event?: EventItem;
  onSubmit: (input: EventInput) => Promise<void>;
}

const pad = (n: number) => String(n).padStart(2, "0");
const toDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export const EventFormDialog = ({ open, onOpenChange, event, onSubmit }: Props) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [unlimited, setUnlimited] = useState(true);
  const [maxParticipants, setMaxParticipants] = useState("");
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const start = event ? new Date(event.startsAt) : null;
    const end = event?.endsAt ? new Date(event.endsAt) : null;
    setTitle(event?.title ?? "");
    setDescription(event?.description ?? "");
    setLocation(event?.location ?? "");
    setState(event?.state ?? "");
    setCity(event?.city ?? "");
    setVisibility(event?.visibility ?? "public");
    setDate(start ? toDate(start) : "");
    setStartTime(start ? toTime(start) : "");
    setEndTime(end ? toTime(end) : "");
    setUnlimited(event ? event.maxParticipants === null : true);
    setMaxParticipants(event?.maxParticipants ? String(event.maxParticipants) : "");
    setCover(null);
    setCoverPreview(event?.coverUrl ?? null);
    setRemoveCover(false);
  }, [open, event]);

  const invalidEnd = !!endTime && !!startTime && endTime < startTime;
  const invalidMax = !unlimited && (!maxParticipants || Number(maxParticipants) < 1);
  const canSubmit = !!title.trim() && !!location.trim() && !!state && !!city.trim() && !!date && !!startTime && !invalidEnd && !invalidMax;

  const pickCover = (file: File | undefined) => {
    if (!file) return;
    setCover(file);
    setRemoveCover(false);
    setCoverPreview(URL.createObjectURL(file));
  };

  const clearCover = () => {
    setCover(null);
    setCoverPreview(null);
    setRemoveCover(true);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      await onSubmit({
        title,
        description,
        location,
        state,
        city,
        visibility,
        startsAt: new Date(`${date}T${startTime}:00`).toISOString(),
        endsAt: endTime ? new Date(`${date}T${endTime}:00`).toISOString() : null,
        maxParticipants: unlimited ? null : Number(maxParticipants),
        cover,
        removeCover,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{event ? "Editar evento" : "Criar evento"}</DialogTitle>
          <DialogDescription>Corrida em grupo, aula em conjunto, treino ao ar livre...</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ev-title">Título *</Label>
            <Input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev-desc">Descrição</Label>
            <Textarea id="ev-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          <div className="space-y-2">
            <Label>Capa (opcional)</Label>
            {coverPreview ? (
              <div className="relative">
                <img src={coverPreview} alt="Capa do evento" className="w-full max-h-44 object-cover rounded-lg" />
                <Button type="button" variant="secondary" size="icon" className="absolute top-2 right-2 h-8 w-8" onClick={clearCover} aria-label="Remover capa">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
                <ImagePlus className="h-4 w-4 mr-2" />
                Adicionar capa
              </Button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickCover(e.target.files?.[0])} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev-location">Local *</Label>
            <Input id="ev-location" placeholder="Ex.: Parque Ibirapuera — portão 3" value={location} onChange={(e) => setLocation(e.target.value)} required />
          </div>

          <CityPicker state={state} city={city} onChange={(v) => { setState(v.state); setCity(v.city); }} />

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2 col-span-3 sm:col-span-1">
              <Label htmlFor="ev-date">Data *</Label>
              <Input id="ev-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-start">Início *</Label>
              <Input id="ev-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-end">Fim (opcional)</Label>
              <Input id="ev-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          {invalidEnd && <p className="text-xs text-destructive">O horário de fim não pode ser antes do início.</p>}

          <div className="space-y-2">
            <Label>Participantes</Label>
            <div className="flex items-center gap-2">
              <Checkbox id="ev-unlimited" checked={unlimited} onCheckedChange={(v) => setUnlimited(v === true)} />
              <Label htmlFor="ev-unlimited" className="font-normal cursor-pointer">Sem limite de participantes</Label>
            </div>
            {!unlimited && (
              <Input type="number" min={1} placeholder="Número máximo de participantes" value={maxParticipants} onChange={(e) => setMaxParticipants(e.target.value)} />
            )}
          </div>

          <div className="space-y-2">
            <Label>Visibilidade</Label>
            <RadioGroup value={visibility} onValueChange={(v) => setVisibility(v as "public" | "private")}>
              <div className="flex items-start gap-2">
                <RadioGroupItem value="public" id="vis-public" className="mt-1" />
                <Label htmlFor="vis-public" className="font-normal cursor-pointer">
                  <span className="font-medium">Público</span> — aparece em "Descobrir" para todos.
                </Label>
              </div>
              <div className="flex items-start gap-2">
                <RadioGroupItem value="private" id="vis-private" className="mt-1" />
                <Label htmlFor="vis-private" className="font-normal cursor-pointer">
                  <span className="font-medium">Privado</span> — só quem for convidado (link ou seleção de alunos).
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Button type="submit" variant="hero" className="w-full" disabled={saving || !canSubmit}>
            {saving ? "Salvando..." : event ? "Salvar alterações" : "Criar evento"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
