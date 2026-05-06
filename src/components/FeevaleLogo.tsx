// Logo da Universidade Feevale.
// Quando o arquivo da imagem for enviado, salve em `public/feevale.png`
// e troque o conteúdo deste componente por <img src="/feevale.png" ... />.

export function FeevaleLogo({ className = "" }: { className?: string }) {
  return (
    <div
      className={
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground font-bold text-xs tracking-widest shadow-soft " +
        className
      }
      aria-label="Universidade Feevale"
    >
      <span>FEEVALE</span>
    </div>
  );
}
