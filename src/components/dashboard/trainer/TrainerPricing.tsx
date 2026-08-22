import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Package, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getBasePrice, setBasePrice as persistBasePrice } from "@/lib/financeStore";

interface PricingPackage {
  id: number;
  name: string;
  classesCount: number;
  price: number;
  discountPercentage: number;
  isActive: boolean;
}

const TrainerPricing = () => {
  const { toast } = useToast();
  const [basePrice, setBasePrice] = useState(() => getBasePrice().toFixed(2));
  const [packages, setPackages] = useState<PricingPackage[]>([
    { id: 1, name: "Pacote 4 aulas", classesCount: 4, price: 570, discountPercentage: 5, isActive: true },
    { id: 2, name: "Pacote 8 aulas", classesCount: 8, price: 1080, discountPercentage: 10, isActive: true },
    { id: 3, name: "Pacote 12 aulas", classesCount: 12, price: 1530, discountPercentage: 15, isActive: true },
  ]);

  const [newPackage, setNewPackage] = useState({
    name: "",
    classesCount: "",
    discountPercentage: ""
  });

  const calculatePackagePrice = (classesCount: number, discount: number) => {
    const base = parseFloat(basePrice);
    const total = base * classesCount;
    return total * (1 - discount / 100);
  };

  const addPackage = () => {
    if (!newPackage.name || !newPackage.classesCount || !newPackage.discountPercentage) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos do novo pacote",
        variant: "destructive"
      });
      return;
    }

    const classes = parseInt(newPackage.classesCount);
    const discount = parseFloat(newPackage.discountPercentage);
    const price = calculatePackagePrice(classes, discount);

    const pkg: PricingPackage = {
      id: Math.max(...packages.map(p => p.id)) + 1,
      name: newPackage.name,
      classesCount: classes,
      price: price,
      discountPercentage: discount,
      isActive: true
    };

    setPackages([...packages, pkg]);
    setNewPackage({ name: "", classesCount: "", discountPercentage: "" });

    toast({
      title: "Pacote adicionado!",
      description: "Novo pacote criado com sucesso.",
    });
  };

  const togglePackage = (id: number) => {
    setPackages(packages.map(p =>
      p.id === id ? { ...p, isActive: !p.isActive } : p
    ));

    const pkg = packages.find(p => p.id === id);
    toast({
      title: pkg?.isActive ? "Pacote desativado" : "Pacote ativado",
      description: pkg?.isActive ? "Pacote não estará visível para alunos" : "Pacote agora está disponível",
    });
  };

  const removePackage = (id: number) => {
    setPackages(packages.filter(p => p.id !== id));
    toast({
      title: "Pacote removido",
      description: "Pacote excluído com sucesso.",
    });
  };

  const handleSave = () => {
    const parsed = parseFloat(basePrice);
    if (Number.isFinite(parsed)) persistBasePrice(parsed);
    toast({
      title: "Preços atualizados!",
      description: "Suas alterações foram salvas com sucesso.",
    });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-primary" />
          Preço Base da Aula
        </h2>
        <div className="max-w-xs">
          <Label htmlFor="base-price">Valor por Aula (R$)</Label>
          <Input
            id="base-price"
            type="number"
            step="0.01"
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
            className="text-lg"
          />
          <p className="text-sm text-muted-foreground mt-2">
            Este é o preço que será cobrado por aula avulsa
          </p>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Package className="h-6 w-6 text-primary" />
          Pacotes de Aulas
        </h2>

        <div className="space-y-4 mb-6">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:shadow-soft transition-smooth"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-lg">{pkg.name}</h3>
                  {pkg.isActive ? (
                    <Badge className="bg-primary/10 text-primary">Ativo</Badge>
                  ) : (
                    <Badge variant="outline">Inativo</Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>{pkg.classesCount} aulas</p>
                  <p>Desconto: {pkg.discountPercentage}%</p>
                  <p className="text-xl font-bold text-primary mt-2">
                    R$ {pkg.price.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={pkg.isActive}
                  onCheckedChange={() => togglePackage(pkg.id)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removePackage(pkg.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold mb-4">Criar Novo Pacote</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="package-name">Nome do Pacote</Label>
              <Input
                id="package-name"
                placeholder="Ex: Pacote 6 aulas"
                value={newPackage.name}
                onChange={(e) => setNewPackage({ ...newPackage, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="classes-count">Número de Aulas</Label>
              <Input
                id="classes-count"
                type="number"
                value={newPackage.classesCount}
                onChange={(e) => setNewPackage({ ...newPackage, classesCount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount">Desconto (%)</Label>
              <Input
                id="discount"
                type="number"
                step="0.1"
                value={newPackage.discountPercentage}
                onChange={(e) => setNewPackage({ ...newPackage, discountPercentage: e.target.value })}
              />
            </div>
          </div>
          {newPackage.classesCount && newPackage.discountPercentage && (
            <p className="text-sm text-muted-foreground mb-4">
              Preço calculado: R$ {calculatePackagePrice(
                parseInt(newPackage.classesCount),
                parseFloat(newPackage.discountPercentage)
              ).toFixed(2)}
            </p>
          )}
          <Button onClick={addPackage} variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Pacote
          </Button>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} variant="hero" size="lg">
          Salvar Alterações
        </Button>
      </div>
    </div>
  );
};

export default TrainerPricing;
