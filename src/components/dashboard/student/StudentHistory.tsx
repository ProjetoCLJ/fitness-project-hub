import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Clock, MapPin, Star, DollarSign, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ClassHistory {
  id: number;
  trainerName: string;
  trainerPhoto?: string;
  date: string;
  startTime: string;
  endTime: string;
  gym: string;
  price: number;
  rating?: number;
  review?: string;
}

const StudentHistory = () => {
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | "rated" | "unrated">("all");
  const [classes, setClasses] = useState<ClassHistory[]>([]);

  const [reviewDialog, setReviewDialog] = useState<{ open: boolean; classId: number | null }>({
    open: false,
    classId: null
  });
  const [newRating, setNewRating] = useState(0);
  const [newReview, setNewReview] = useState("");

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  };

  const submitReview = () => {
    if (reviewDialog.classId && newRating > 0) {
      setClasses(classes.map(c =>
        c.id === reviewDialog.classId
          ? { ...c, rating: newRating, review: newReview }
          : c
      ));

      toast({
        title: "Avaliação enviada!",
        description: "Obrigado por avaliar sua aula.",
      });

      setReviewDialog({ open: false, classId: null });
      setNewRating(0);
      setNewReview("");
    }
  };

  const filteredClasses = classes.filter(c => {
    if (filter === "rated") return c.rating !== undefined;
    if (filter === "unrated") return c.rating === undefined;
    return true;
  });

  const totalClasses = classes.length;
  const totalSpent = classes.reduce((sum, c) => sum + c.price, 0);
  const ratedClasses = classes.filter(c => c.rating).length;
  const avgRating = ratedClasses > 0
    ? classes.filter(c => c.rating).reduce((sum, c) => sum + (c.rating || 0), 0) / ratedClasses
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="h-5 w-5 text-primary" />
            <div className="text-3xl font-bold">{totalClasses}</div>
          </div>
          <div className="text-sm text-muted-foreground">Aulas Realizadas</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="h-5 w-5 text-accent" />
            <div className="text-3xl font-bold">R$ {totalSpent.toFixed(2)}</div>
          </div>
          <div className="text-sm text-muted-foreground">Total Investido</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Star className="h-5 w-5 text-yellow-500" />
            <div className="text-3xl font-bold">{avgRating.toFixed(1)}</div>
          </div>
          <div className="text-sm text-muted-foreground">Avaliação Média</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <div className="text-3xl font-bold">{ratedClasses}/{totalClasses}</div>
          </div>
          <div className="text-sm text-muted-foreground">Aulas Avaliadas</div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Histórico de Aulas</h2>
          <div className="flex gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              Todas
            </Button>
            <Button
              variant={filter === "rated" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("rated")}
            >
              Avaliadas
            </Button>
            <Button
              variant={filter === "unrated" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("unrated")}
            >
              Pendentes
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {filteredClasses.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma aula realizada ainda.</p>
          )}
          {filteredClasses.map((classItem) => (
            <Card key={classItem.id} className="p-6 hover:shadow-medium transition-smooth">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 border-2 border-primary/20">
                    <AvatarImage src={classItem.trainerPhoto} />
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                      {classItem.trainerName.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">{classItem.trainerName}</h3>
                    {classItem.rating ? (
                      <div className="flex items-center gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < classItem.rating!
                                ? "fill-yellow-500 text-yellow-500"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    ) : (
                      <Badge variant="outline" className="mt-1">Pendente de Avaliação</Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-primary">R$ {classItem.price.toFixed(2)}</div>
                </div>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(classItem.date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{classItem.startTime} - {classItem.endTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{classItem.gym}</span>
                </div>
              </div>

              {classItem.review && (
                <div className="p-4 bg-muted/30 rounded-lg mb-4">
                  <p className="text-sm text-muted-foreground italic">"{classItem.review}"</p>
                </div>
              )}

              {!classItem.rating && (
                <Dialog
                  open={reviewDialog.open && reviewDialog.classId === classItem.id}
                  onOpenChange={(open) => setReviewDialog({ open, classId: open ? classItem.id : null })}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Star className="h-4 w-4 mr-2" />
                      Avaliar Aula
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Avaliar {classItem.trainerName}</DialogTitle>
                      <DialogDescription>
                        Como foi sua experiência com esta aula?
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Nota</label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setNewRating(star)}
                              className="transition-transform hover:scale-110"
                            >
                              <Star
                                className={`h-8 w-8 ${
                                  star <= newRating
                                    ? "fill-yellow-500 text-yellow-500"
                                    : "text-gray-300"
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Comentário (opcional)</label>
                        <Textarea
                          value={newReview}
                          onChange={(e) => setNewReview(e.target.value)}
                          placeholder="Conte como foi sua experiência..."
                          rows={4}
                        />
                      </div>
                      <Button onClick={submitReview} variant="hero" className="w-full" disabled={newRating === 0}>
                        Enviar Avaliação
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default StudentHistory;
