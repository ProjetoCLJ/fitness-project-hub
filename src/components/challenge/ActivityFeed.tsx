import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { BadgeCheck, MessageCircle, Pencil, Send, Trash2 } from "lucide-react";
import {
  ChallengeComment,
  ChallengePost,
  REACTION_EMOJIS,
  addComment,
  deleteComment,
  deletePost,
  fetchComments,
  toggleReaction,
} from "@/lib/challengeStore";

interface Props {
  posts: ChallengePost[];
  userId: string;
  isCreator: boolean;
  onChanged: () => void;
  onEdit: (post: ChallengePost) => void;
}

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

const PostCard = ({ post, userId, isCreator, onChanged, onEdit }: Omit<Props, "posts"> & { post: ChallengePost }) => {
  const { toast } = useToast();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<ChallengeComment[]>([]);
  const [text, setText] = useState("");

  const fail = () => toast({ title: "Não foi possível concluir a ação", variant: "destructive" });
  const isMine = post.userId === userId;

  const loadComments = async () => {
    try {
      setComments(await fetchComments(post.id));
    } catch {
      fail();
    }
  };

  const react = async (emoji: string) => {
    try {
      await toggleReaction(post.id, userId, emoji, !!post.reactions[emoji]?.mine);
      onChanged();
    } catch {
      fail();
    }
  };

  const toggleComments = async () => {
    const next = !showComments;
    setShowComments(next);
    if (next) await loadComments();
  };

  const sendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await addComment(post.id, userId, text);
      setText("");
      await loadComments();
      onChanged();
    } catch {
      fail();
    }
  };

  const removeComment = async (id: string) => {
    try {
      await deleteComment(id);
      await loadComments();
      onChanged();
    } catch {
      fail();
    }
  };

  const removePost = async () => {
    if (!window.confirm("Apagar esta atividade? Ela deixa de contar pontos.")) return;
    try {
      await deletePost(post.id);
      onChanged();
    } catch {
      fail();
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-4 flex items-start gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-gradient-primary text-primary-foreground text-sm">{initials(post.authorName)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium">{post.authorName}</p>
            {post.source === "platform" && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <BadgeCheck className="h-3 w-3" />
                Validado pela plataforma
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{formatWhen(post.activityAt)}</p>
        </div>
        <div className="flex gap-1 shrink-0">
          {isMine && post.source === "manual" && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(post)} aria-label="Editar atividade">
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {(isMine || isCreator) && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={removePost} aria-label="Apagar atividade">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </div>

      <div className="px-4 pb-3">
        <p className="font-semibold">{post.title}</p>
        {post.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{post.description}</p>}
      </div>

      {post.photoUrl && <img src={post.photoUrl} alt={post.title} className="w-full max-h-96 object-cover" loading="lazy" />}

      <div className="p-3 flex flex-wrap items-center gap-1.5">
        {REACTION_EMOJIS.map((emoji) => {
          const r = post.reactions[emoji];
          return (
            <button
              key={emoji}
              type="button"
              onClick={() => react(emoji)}
              className={`px-2 py-1 rounded-full border text-sm transition-smooth ${
                r?.mine ? "bg-primary/15 border-primary" : "border-border hover:bg-muted"
              }`}
            >
              {emoji}
              {r ? <span className="ml-1 text-xs">{r.count}</span> : null}
            </button>
          );
        })}
        <Button variant="ghost" size="sm" className="ml-auto h-8" onClick={toggleComments}>
          <MessageCircle className="h-4 w-4 mr-1" />
          {post.commentCount}
        </Button>
      </div>

      {showComments && (
        <div className="border-t p-3 space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2 text-sm">
              <div className="flex-1 min-w-0">
                <span className="font-medium">{c.authorName}</span>{" "}
                <span className="text-muted-foreground whitespace-pre-wrap break-words">{c.content}</span>
              </div>
              {(c.userId === userId || isCreator) && (
                <button type="button" onClick={() => removeComment(c.id)} aria-label="Apagar comentário">
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              )}
            </div>
          ))}
          <form onSubmit={sendComment} className="flex gap-2">
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva um comentário" />
            <Button type="submit" size="icon" variant="hero" disabled={!text.trim()} aria-label="Enviar comentário">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </Card>
  );
};

export const ActivityFeed = ({ posts, ...rest }: Props) => {
  if (posts.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Nenhuma atividade ainda. Seja o primeiro a registrar um treino!
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} {...rest} />
      ))}
    </div>
  );
};
