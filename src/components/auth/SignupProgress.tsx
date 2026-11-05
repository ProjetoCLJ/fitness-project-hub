const STEPS = ["Tipo de conta", "Seus dados"];

/** Barra de progresso do cadastro: etapa 1 (professor ou aluno) e etapa 2 (dados e envio). */
export const SignupProgress = ({ step }: { step: 1 | 2 }) => (
  <div className="w-full" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step} aria-label={`Etapa ${step} de ${STEPS.length}`}>
    <div className="flex gap-2">
      {STEPS.map((label, i) => (
        <div key={label} className={`h-1.5 flex-1 rounded-full transition-colors ${i < step ? "bg-primary" : "bg-muted"}`} />
      ))}
    </div>
    <div className="mt-2 flex justify-between text-xs text-muted-foreground">
      {STEPS.map((label, i) => (
        <span key={label} className={i + 1 === step ? "font-semibold text-foreground" : ""}>
          {i + 1}. {label}
        </span>
      ))}
    </div>
  </div>
);
