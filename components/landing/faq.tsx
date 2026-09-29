type FaqItem = { q: string; a: string };

/** <details> nativo: as respostas existem sem JavaScript. */
export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <div className="oz-faq">
      {items.map((faq) => (
        <details key={faq.q}>
          <summary>{faq.q}</summary>
          <p>{faq.a}</p>
        </details>
      ))}
    </div>
  );
}
