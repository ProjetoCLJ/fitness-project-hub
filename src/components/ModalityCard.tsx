import { Card } from "@/components/ui/card";

interface ModalityCardProps {
  image: string;
  title: string;
  description: string;
  onClick: () => void;
}

export const ModalityCard = ({ image, title, description, onClick }: ModalityCardProps) => {
  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-medium transition-smooth border-2 hover:border-primary/50 group"
      onClick={onClick}
    >
      <div className="relative h-24 sm:h-48 w-full overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
      </div>
      <div className="p-3 sm:p-6 text-center space-y-1 sm:space-y-2">
        <h3 className="font-semibold text-sm sm:text-lg text-foreground">{title}</h3>
        <p className="hidden sm:block text-sm text-muted-foreground">{description}</p>
      </div>
    </Card>
  );
};
