import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, X } from "lucide-react";
import { ChallengePost, PostInput } from "@/lib/challengeStore";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Quando informado, edita esta atividade. */
  post?: ChallengePost;
  onSubmit: (input: PostInput & { removePhoto?: boolean }) => Promise<void>;
}

const pad = (n: number) => String(n).padStart(2, "0");
const toDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export const LogActivityDialog = ({ open, onOpenChange, post, onSubmit }: Props) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const when = post ? new Date(post.activityAt) : new Date();
    setTitle(post?.title ?? "");
    setDescription(post?.description ?? "");
    setDate(toDate(when));
    setTime(toTime(when));
    setPhoto(null);
    setPreview(post?.photoUrl ?? null);
    setRemovePhoto(false);
  }, [open, post]);

  const pickPhoto = (file: File | undefined) => {
    if (!file) return;
    setPhoto(file);
    setRemovePhoto(false);
    setPreview(URL.createObjectURL(file));
  };

  const clearPhoto = () => {
    setPhoto(null);
    setPreview(null);
    setRemovePhoto(true);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        title,
        description,
        activityAt: new Date(`${date}T${time}:00`).toISOString(),
        photo,
        removePhoto,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{post ? "Editar atividade" : "Registrar treino"}</DialogTitle>
          <DialogDescription>Cada treino registrado vale ponto no ranking e aparece nas atividades.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="act-title">Título</Label>
            <Input id="act-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Treino de perna" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="act-desc">Descrição</Label>
            <Textarea id="act-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="act-date">Data</Label>
              <Input id="act-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="act-time">Horário</Label>
              <Input id="act-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Foto (opcional)</Label>
            {preview ? (
              <div className="relative">
                <img src={preview} alt="Foto do treino" className="w-full max-h-64 object-cover rounded-lg" />
                <Button type="button" variant="secondary" size="icon" className="absolute top-2 right-2 h-8 w-8" onClick={clearPhoto} aria-label="Remover foto">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
                <ImagePlus className="h-4 w-4 mr-2" />
                Anexar foto
              </Button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickPhoto(e.target.files?.[0])} />
          </div>

          <Button type="submit" variant="hero" className="w-full" disabled={saving || !title.trim()}>
            {saving ? "Salvando..." : post ? "Salvar alterações" : "Registrar treino"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
