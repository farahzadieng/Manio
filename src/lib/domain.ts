import { z } from 'zod'
import { toJalaali, toGregorian, jalaaliMonthLength, isValidJalaaliDate } from 'jalaali-js'
export const amount = z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
export const optionalAmount = amount.nullable()
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => { const d = new Date(`${v}T12:00:00`); return !Number.isNaN(d.getTime()) && localISO(d) === v }, 'تاریخ نامعتبر است')
export const note = z.string().refine(v => [...v].length <= 250, 'یادداشت بیش از ۲۵۰ نویسه است')
const timestamp=z.iso.datetime()
const base = { id:z.string().uuid(), createdAt:timestamp, updatedAt:timestamp }
export const sourceSchema = z.object({...base,name:z.string().min(1),kind:z.enum(['card','cash','other']),color:z.string(),active:z.boolean()})
export const categorySchema = z.object({...base,name:z.string().min(1),emoji:z.string(),transactionKind:z.enum(['expense','income']),defaultNecessity:z.enum(['necessary','nonessential']).nullable(),active:z.boolean()})
export const transactionSchema = z.object({...base,kind:z.enum(['expense','income']),amountTomans:amount,date:isoDate,categoryId:z.string().uuid(),categoryName:z.string(),categoryEmoji:z.string(),paymentSourceId:z.string().uuid().nullable(),paymentSourceName:z.string().nullable(),necessity:z.enum(['necessary','nonessential']).nullable(),note})
export const obligationSchema = z.object({...base,type:z.enum(['debt','receivable','plannedPayment','reminder']),title:z.string().min(1),counterparty:z.string(),amountTomans:optionalAmount,dueDate:isoDate,note,status:z.enum(['pending','completed']),completedAt:timestamp.nullable(),recurrenceRuleId:z.string().uuid().nullable(),linkedTransactionId:z.string().uuid().nullable(),calendarExportStatus:z.enum(['none','copied']).default('none')})
export const recurrenceSchema = z.object({...base,frequency:z.enum(['daily','weekly','monthly','yearly']),startDate:isoDate,endDate:isoDate.nullable(),lastGeneratedDate:isoDate,templateId:z.string().uuid(),jalaliDay:z.number().int().min(1).max(31).nullable()})
export const settingsSchema = z.object({id:z.literal('main'),theme:z.enum(['light','dark','system']),onboarded:z.boolean(),demo:z.boolean(),lastBackupAt:timestamp.nullable(),currency:z.literal('toman')})
export const metadataSchema = z.object({id:z.literal('main'),schemaVersion:z.number().int(),seedProvenance:z.string().nullable(),migratedAt:timestamp.nullable()})
export type PaymentSource = z.infer<typeof sourceSchema>
export type Category = z.infer<typeof categorySchema>
export type Transaction = z.infer<typeof transactionSchema>
export type Obligation = z.infer<typeof obligationSchema>
export type RecurrenceRule = z.infer<typeof recurrenceSchema>
export type Settings = z.infer<typeof settingsSchema>
export type Metadata = z.infer<typeof metadataSchema>
export type Tables = {paymentSources:PaymentSource;categories:Category;transactions:Transaction;obligations:Obligation;recurrenceRules:RecurrenceRule;settings:Settings;metadata:Metadata}
export type TableName = keyof Tables
export const schemas = {paymentSources:sourceSchema,categories:categorySchema,transactions:transactionSchema,obligations:obligationSchema,recurrenceRules:recurrenceSchema,settings:settingsSchema,metadata:metadataSchema}
export function localISO(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
export function yesterday() { const d = new Date(); d.setDate(d.getDate()-1); return localISO(d) }
export function jalali(date:string) { const [y,m,d]=date.split('-').map(Number); return toJalaali(y,m,d) }
export function fromJalali(y:number,m:number,d:number) { if(!isValidJalaaliDate(y,m,d)) throw new Error('تاریخ شمسی نامعتبر است'); const g=toGregorian(y,m,d); return `${g.gy}-${String(g.gm).padStart(2,'0')}-${String(g.gd).padStart(2,'0')}` }
export function jalaliMonthRange(y:number,m:number):[string,string] { return [fromJalali(y,m,1),fromJalali(y,m,jalaaliMonthLength(y,m))] }
export const persianNumber=(n:number)=>new Intl.NumberFormat('fa-IR').format(n)
export const money=(n:number)=>`${persianNumber(n)} تومان`
export function parseAmount(input:string) { const digits=input.replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[\s,٬،]/g,''); if(!/^\d+$/.test(digits)) throw new Error('مبلغ را با رقم‌های معتبر وارد کنید'); return amount.parse(Number(digits)) }
export function safeSum(values:number[]) { return values.reduce((a,b)=>{ const n=a+b; if(!Number.isSafeInteger(n)) throw new Error('جمع مبالغ از حد امن فراتر رفت'); return n },0) }
export function normalize(input:string) { return input.toLocaleLowerCase().replace(/[يى]/g,'ی').replace(/ك/g,'ک').normalize('NFD').replace(/[\u064b-\u065f\u0670\u06d6-\u06ed]/g,'').replace(/[\u200c\s]+/g,' ').trim() }
export type Filters={q?:string;from?:string;to?:string;kind?:'expense'|'income';categoryId?:string;paymentSourceId?:string;necessity?:'necessary'|'nonessential'}
export function filterTransactions(rows:Transaction[], f:Filters) { const q=normalize(f.q||''); return rows.filter(t=>(!q||normalize([t.note,t.categoryName,t.paymentSourceName||''].join(' ')).includes(q))&&(!f.from||t.date>=f.from)&&(!f.to||t.date<=f.to)&&(!f.kind||t.kind===f.kind)&&(!f.categoryId||t.categoryId===f.categoryId)&&(!f.paymentSourceId||t.paymentSourceId===f.paymentSourceId)&&(!f.necessity||t.necessity===f.necessity)).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt)) }
export function report(rows:Transaction[]) { const expenses=rows.filter(t=>t.kind==='expense'); const income=rows.filter(t=>t.kind==='income'); const categories=new Map<string,{name:string;amount:number;count:number}>(); for(const t of expenses){const key=t.categoryId; const prev=categories.get(key)||{name:t.categoryName,amount:0,count:0}; prev.amount=safeSum([prev.amount,t.amountTomans]); prev.count++; categories.set(key,prev)} return {expense:safeSum(expenses.map(t=>t.amountTomans)),income:safeSum(income.map(t=>t.amountTomans)),count:expenses.length,categories:[...categories.values()].sort((a,b)=>b.amount-a.amount),necessary:safeSum(expenses.filter(t=>t.necessity==='necessary').map(t=>t.amountTomans)),nonessential:safeSum(expenses.filter(t=>t.necessity==='nonessential').map(t=>t.amountTomans))} }
export function nextOccurrence(date:string,frequency:RecurrenceRule['frequency'],jalaliDay:number|null) { if(frequency==='monthly'||frequency==='yearly'){const j=jalali(date); const year=frequency==='yearly'?j.jy+1:j.jy+(j.jm===12?1:0); const month=frequency==='yearly'?j.jm:(j.jm%12)+1; return fromJalali(year,month,Math.min(jalaliDay||j.jd,jalaaliMonthLength(year,month)))} const d=new Date(`${date}T12:00:00`);d.setDate(d.getDate()+(frequency==='weekly'?7:1));return localISO(d) }
export function monthlyTrend(rows:Transaction[],year:number,month:number,filters:Filters={}){return Array.from({length:6},(_,i)=>{let m=month-(5-i),y=year;while(m<1){m+=12;y--}const [from,to]=jalaliMonthRange(y,m);return {year:y,month:m,total:report(filterTransactions(rows,{...filters,from,to})).expense}})}
