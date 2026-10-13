import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATES, fetchCities } from "@/lib/eventStore";

interface Props {
  state: string;
  city: string;
  onChange: (value: { state: string; city: string }) => void;
}

/** Escolha de estado e, em seguida, cidade (com busca). "Outra cidade" libera um campo de texto. */
export const CityPicker = ({ state, city, onChange }: Props) => {
  const [cities, setCities] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [otherMode, setOtherMode] = useState(false);

  useEffect(() => {
    setQuery("");
    if (!state) {
      setCities([]);
      return;
    }
    let active = true;
    fetchCities(state).then((list) => active && setCities(list));
    return () => {
      active = false;
    };
  }, [state]);

  // Cidade já preenchida que não está na lista (ex.: edição) abre o modo "Outra".
  useEffect(() => {
    if (city && cities.length > 0 && !cities.includes(city)) setOtherMode(true);
  }, [city, cities]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (q ? cities.filter((c) => c.toLowerCase().includes(q)) : cities).slice(0, 40);
  }, [cities, query]);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Estado *</Label>
        <Select
          value={state}
          onValueChange={(uf) => {
            setOtherMode(false);
            onChange({ state: uf, city: "" });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o estado" />
          </SelectTrigger>
          <SelectContent>
            {STATES.map((s) => (
              <SelectItem key={s.uf} value={s.uf}>
                {s.name} ({s.uf})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {state && (
        <div className="space-y-2">
          <Label>Cidade *</Label>
          {city && !otherMode && <p className="text-sm">Selecionada: <strong>{city}</strong></p>}

          {otherMode ? (
            <div className="space-y-2">
              <Input placeholder="Digite o nome da cidade" value={city} onChange={(e) => onChange({ state, city: e.target.value })} />
              <Button type="button" variant="ghost" size="sm" onClick={() => { setOtherMode(false); onChange({ state, city: "" }); }}>
                Escolher da lista
              </Button>
            </div>
          ) : (
            <>
              <Input placeholder="Buscar cidade" value={query} onChange={(e) => setQuery(e.target.value)} />
              <div className="max-h-40 overflow-y-auto rounded-md border divide-y">
                {filtered.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => onChange({ state, city: name })}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-muted ${name === city ? "bg-primary/10 font-medium" : ""}`}
                  >
                    {name}
                  </button>
                ))}
                {filtered.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">Nenhuma cidade encontrada.</p>}
                <button
                  type="button"
                  onClick={() => { setOtherMode(true); onChange({ state, city: "" }); }}
                  className="w-full px-3 py-2 text-left text-sm font-medium text-primary hover:bg-muted"
                >
                  Outra cidade...
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
