import { all, put } from "./db";
import { nextOccurrence, type Obligation, type RecurrenceRule } from "./domain";
export async function generateDueInstances(today: string) {
  const rules = await all("recurrenceRules");
  const obligations = await all("obligations");
  for (const rule of rules) {
    const template = obligations.find((o) => o.id === rule.templateId);
    if (!template) continue;
    let next = nextOccurrence(
      rule.lastGeneratedDate,
      rule.frequency,
      rule.jalaliDay,
    );
    let count = 0;
    while (
      next <= today &&
      (!rule.endDate || next <= rule.endDate) &&
      count < 366
    ) {
      if (
        !obligations.some(
          (o) => o.recurrenceRuleId === rule.id && o.dueDate === next,
        )
      ) {
        const now = new Date().toISOString();
        const instance: Obligation = {
          ...template,
          id: crypto.randomUUID(),
          dueDate: next,
          status: "pending",
          completedAt: null,
          linkedTransactionId: null,
          createdAt: now,
          updatedAt: now,
        };
        await put("obligations", instance);
        obligations.push(instance);
      }
      rule.lastGeneratedDate = next;
      next = nextOccurrence(next, rule.frequency, rule.jalaliDay);
      count++;
    }
    if (count) {
      await put("recurrenceRules", {
        ...rule,
        updatedAt: new Date().toISOString(),
      } as RecurrenceRule);
    }
  }
}
