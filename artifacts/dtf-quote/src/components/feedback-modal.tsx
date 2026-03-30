import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type FeedbackModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FeedbackModal({ isOpen, onOpenChange }: FeedbackModalProps) {
  const [type, setType] = useState<string>("bug");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!message || message.trim().length < 5) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "El mensaje debe tener al menos 5 caracteres.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type, message }),
      });

      if (!res.ok) {
        throw new Error("Error en la subida");
      }

      toast({
        title: "¡Gracias por tu feedback!",
        description: "Hemos recibido tus comentarios correctamente.",
      });

      setMessage("");
      setType("bug");
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al enviar",
        description: "Hubo un problema procesando tu mensaje. Intenta de nuevo.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Enviar Feedback</DialogTitle>
          <DialogDescription>
            Tus comentarios nos ayudan a mejorar la plataforma cada día. ¿Qué tienes en mente?
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="type">Tipo de mensaje</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Selecciona..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bug">Reportar un error (Bug)</SelectItem>
                <SelectItem value="sugerencia">Sugerencia de mejora</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="message">Tu mensaje</Label>
            <Textarea
              id="message"
              placeholder="Escribe aquí los detalles..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="resize-none h-32"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Enviando..." : "Enviar Feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
