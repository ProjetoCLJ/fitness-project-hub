import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATES, fetchCities } from "@/lib/eventStore";

interface Props {
  state: string;
  city: string;
  onChange: (value: { state: string; city: string }) => void;
}

/** Estado (lista) + cidade no mesmo campo: digitar filtra a lista e escolher preenche o próprio campo. */
export const CityPicker = ({ state, city, onChange }: Props) => {
  const [cities, setCities] = useState<string[]>([]);
  const [query, setQuery] = useState(city);
  const [showList, setShowList] = useState(false);
  const [otherMode, setOtherMode] = useState(false);

  useEffect(() => {
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

  // Valor vindo de fora (ex.: abrir a edição de um evento) aparece no campo.
  useEffect(() => {
    if (city && city !== query) setQuery(city);
    if (!city && !showList && !otherMode) setQuery("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city]);

  // Cidade que não está na lista (ex.: evento salvo com "Outra cidade") abre o campo livre.
  useEffect(() => {
    if (city && cities.length > 0 && !cities.includes(city)) setOtherMode(true);
  }, [city, cities]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (q ? cities.filter((c) => c.toLowerCase().includes(q)) : cities).slice(0, 30);
  }, [cities, query]);

  const choose = (name: string) => {
    setQuery(name);
    setShowList(false);
    onChange({ state, city: name });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Estado *</Label>
        <Select
          value={state}
          onValueChange={(uf) => {
            setOtherMode(false);
            setQuery("");
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
          <Label htmlFor="city-input">Cidade *</Label>
          <div className="relative">
            <Input
              id="city-input"
              autoComplete="off"
              placeholder={otherMode ? "Digite o nome da cidade" : "Digite para buscar a cidade"}
              value={query}
              onFocus={() => !otherMode && setShowList(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                if (otherMode) {
                  onChange({ state, city: e.target.value });
                } else {
                  setShowList(true);
                  // só vale quando escolhida na lista
                  if (city) onChange({ state, city: "" });
                }
              }}
            />
            {showList && !otherMode && (
              <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md divide-y">
                {filtered.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => choose(name)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    {name}
                  </button>
                ))}
                {filtered.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">Nenhuma cidade encontrada.</p>}
                <button
                  type="button"
                  onClick={() => {
                    setOtherMode(true);
                    setShowList(false);
                    onChange({ state, city: query });
                  }}
                  className="w-full px-3 py-2 text-left text-sm font-medium text-primary hover:bg-muted"
                >
                  Outra cidade (digitar o nome)
                </button>
              </div>
            )}
          </div>
          {otherMode && (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => {
                setOtherMode(false);
                setQuery("");
                onChange({ state, city: "" });
              }}
            >
              Escolher da lista
            </button>
          )}
        </div>
      )}
    </div>
  );
};
