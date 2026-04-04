type CreationFormGuideProps = {
  entityName: string;
  exampleActionLabel?: string;
  className?: string;
};

export function CreationFormGuide({ entityName, exampleActionLabel = "Cargar ejemplo", className = "" }: CreationFormGuideProps) {
  return (
    <div className={`rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground space-y-1.5 ${className}`.trim()}>
      <p className="font-semibold text-foreground">Como completar este formulario</p>
      <p>1. Usa "{exampleActionLabel}" para ver un caso real.</p>
      <p>2. Reemplaza los datos de ejemplo por tus datos.</p>
      <p>3. Guarda el {entityName} y editalo si necesitas ajustes.</p>
    </div>
  );
}
