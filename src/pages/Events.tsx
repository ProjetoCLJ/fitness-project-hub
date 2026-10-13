import { useCallback, useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EventCard } from "@/components/events/EventCard";
import { EventFormDialog } from "@/components/events/EventFormDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthUid } from "@/hooks/useAuthUid";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { CalendarHeart, Plus, Search } from "lucide-react";
import {
  EventItem,
  createEvent,
  eventHasEnded,
  eventIsFull,
  fetchCreatedEvents,
  fetchJoinedEvents,
  fetchPublicEvents,
} from "@/lib/eventStore";
import { toLocalISO } from "@/lib/agendaStore";

const ALL = "all";
type SortKey = "date" | "recent";

const EventGrid = ({ events, onOpen, empty }: { events: EventItem[]; onOpen: (e: EventItem) => void; empty: string }) =>
  events.length === 0 ? (
    <Card className="p-6 text-center text-sm text-muted-foreground">{empty}</Card>
  ) : (
    <div className="grid sm:grid-cols-2 gap-3">
      {events.map((e) => (
        <EventCard key={e.id} event={e} onClick={() => onOpen(e)} />
      ))}
    </div>
  );

const Events = () => {
  const { user } = useAuth();
  const uid = useAuthUid();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [publicEvents, setPublicEvents] = useState<EventItem[]>([]);
  const [joined, setJoined] = useState<EventItem[]>([]);
  const [created, setCreated] = useState<EventItem[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  // filtros da aba Descobrir
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState(ALL);
  const [cityFilter, setCityFilter] = useState(ALL);
  const [dateFilter, setDateFilter] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [sort, setSort] = useState<SortKey>("date");

  const isTrainer = user?.userType === "trainer";

  const load = useCallback(async () => {
    if (!uid) return;
    try {
      const [pub, mine] = await Promise.all([fetchPublicEvents(), fetchJoinedEvents(uid)]);
      setPublicEvents(pub);
      setJoined(mine);
      if (isTrainer) setCreated(await fetchCreatedEvents(uid));
    } catch {
      toast({ title: "Não foi possível carregar os eventos", variant: "destructive" });
    }
  }, [uid, isTrainer, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const states = useMemo(() => Array.from(new Set(publicEvents.map((e) => e.state).filter(Boolean))).sort(), [publicEvents]);
  const cities = useMemo(
    () =>
      Array.from(new Set(publicEvents.filter((e) => stateFilter === ALL || e.state === stateFilter).map((e) => e.city).filter(Boolean))).sort(),
    [publicEvents, stateFilter]
  );

  const discover = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = publicEvents.filter((e) => {
      if (q && !`${e.title} ${e.description} ${e.location} ${e.city}`.toLowerCase().includes(q)) return false;
      if (stateFilter !== ALL && e.state !== stateFilter) return false;
      if (cityFilter !== ALL && e.city !== cityFilter) return false;
      if (dateFilter && toLocalISO(new Date(e.startsAt)) !== dateFilter) return false;
      if (onlyOpen && eventIsFull(e)) return false;
      return true;
    });
    return list.sort((a, b) =>
      sort === "recent" ? b.createdAt.localeCompare(a.createdAt) : new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    );
  }, [publicEvents, query, stateFilter, cityFilter, dateFilter, onlyOpen, sort]);

  if (!user) return null;

  const upcoming = joined
    .filter((e) => e.status === "active" && !eventHasEnded(e))
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const past = joined
    .filter((e) => e.status !== "active" || eventHasEnded(e))
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

  const open = (e: EventItem) => navigate(`/eventos/${e.id}`);

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:pb-12 max-w-3xl">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold">Eventos</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Corridas, aulas em grupo e encontros</p>
          </div>
          {isTrainer && (
            <Button variant="hero" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Criar evento
            </Button>
          )}
        </div>

        <Tabs defaultValue="discover">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="discover" className="flex-1">Descobrir</TabsTrigger>
            <TabsTrigger value="mine" className="flex-1">Meus eventos</TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar eventos" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Select value={stateFilter} onValueChange={(v) => { setStateFilter(v); setCityFilter(ALL); }}>
                <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos os estados</SelectItem>
                  {states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger><SelectValue placeholder="Cidade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas as cidades</SelectItem>
                  {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} aria-label="Filtrar por data" />
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Por data do evento</SelectItem>
                  <SelectItem value="recent">Mais recentes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="only-open" checked={onlyOpen} onCheckedChange={(v) => setOnlyOpen(v === true)} />
              <Label htmlFor="only-open" className="font-normal cursor-pointer">Só com vagas</Label>
            </div>

            <EventGrid events={discover} onOpen={open} empty="Nenhum evento encontrado com esses filtros." />
          </TabsContent>

          <TabsContent value="mine" className="space-y-8">
            {isTrainer && (
              <section>
                <h2 className="font-semibold text-base sm:text-lg mb-3">Criados por mim</h2>
                <EventGrid events={created} onOpen={open} empty="Você ainda não criou eventos." />
              </section>
            )}
            <section>
              <h2 className="font-semibold text-base sm:text-lg mb-3">Eventos que vou participar</h2>
              <EventGrid events={upcoming} onOpen={open} empty="Você não está inscrito em nenhum evento futuro." />
            </section>
            <section>
              <h2 className="font-semibold text-base sm:text-lg mb-3">Eventos encerrados</h2>
              <EventGrid events={past} onOpen={open} empty="Nenhum evento encerrado ainda." />
            </section>
          </TabsContent>
        </Tabs>

        {publicEvents.length === 0 && created.length === 0 && joined.length === 0 && (
          <p className="mt-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <CalendarHeart className="h-4 w-4" />
            Os eventos criados pelos professores aparecem aqui.
          </p>
        )}
      </div>

      <EventFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={async (input) => {
          if (!uid) return;
          try {
            const id = await createEvent(uid, input);
            navigate(`/eventos/${id}`);
          } catch (error) {
            toast({ title: "Não foi possível criar o evento", variant: "destructive" });
            throw error;
          }
        }}
      />
    </div>
  );
};

export default Events;
