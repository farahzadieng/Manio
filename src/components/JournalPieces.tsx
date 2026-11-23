import type { Transaction } from "../lib/domain";
import { money } from "../lib/domain";
const necessityLabel = (v: string | null) =>
  v === "necessary" ? "ضروری" : v === "nonessential" ? "غیرضروری" : "";
export function Section({
  title,
  action,
}: {
  title: string;
  action?: () => void;
}) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {action && <button onClick={action}>همه ←</button>}
    </div>
  );
}
export function Empty({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      <p>{hint}</p>
    </div>
  );
}
export function TransactionList({
  items,
  onSelect,
}: {
  items: Transaction[];
  onSelect: (t: Transaction) => void;
}) {
  return (
    <div className="list">
      {items.map((t) => (
        <button
          className="transaction-row"
          key={t.id}
          onClick={() => onSelect(t)}
        >
          <span className="emoji">{t.categoryEmoji}</span>
          <span className="row-main">
            <strong>{t.categoryName}</strong>
            <small>
              {new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
                day: "numeric",
                month: "long",
              }).format(new Date(`${t.date}T12:00:00`))}{" "}
              · {t.paymentSourceName || "بدون منبع"}{" "}
              {t.necessity && `· ${necessityLabel(t.necessity)}`}
            </small>
          </span>
          <strong className={t.kind === "income" ? "income" : ""} dir="ltr">
            {t.kind === "income" ? "+" : "−"}
            {money(t.amountTomans)}
          </strong>
        </button>
      ))}
    </div>
  );
}
