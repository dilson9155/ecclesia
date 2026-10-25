-- AlterEnum
ALTER TYPE "ExpenseStatus" ADD VALUE 'PARCIAL';

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "installmentGroupId" TEXT,
ADD COLUMN     "installmentNumber" INTEGER,
ADD COLUMN     "installmentTotal" INTEGER;

-- CreateTable
CREATE TABLE "expense_payments" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "congregationId" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'DINHEIRO',
    "document" TEXT,
    "notes" TEXT,
    "cashEntryId" TEXT,
    "createdById" TEXT,
    "reversedAt" TIMESTAMP(3),
    "reversedById" TEXT,
    "reversalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expense_payments_expenseId_idx" ON "expense_payments"("expenseId");

-- CreateIndex
CREATE INDEX "expense_payments_churchId_date_idx" ON "expense_payments"("churchId", "date");

-- CreateIndex
CREATE INDEX "expense_payments_congregationId_date_idx" ON "expense_payments"("congregationId", "date");

-- CreateIndex
CREATE INDEX "expenses_installmentGroupId_idx" ON "expenses"("installmentGroupId");

-- AddForeignKey
ALTER TABLE "expense_payments" ADD CONSTRAINT "expense_payments_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_payments" ADD CONSTRAINT "expense_payments_congregationId_fkey" FOREIGN KEY ("congregationId") REFERENCES "congregations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_payments" ADD CONSTRAINT "expense_payments_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_payments" ADD CONSTRAINT "expense_payments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_payments" ADD CONSTRAINT "expense_payments_reversedById_fkey" FOREIGN KEY ("reversedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: contas já pagas passam a ter um pagamento total registrado,
-- preservando o lançamento existente no livro caixa.
INSERT INTO "expense_payments" (
    "id",
    "churchId",
    "congregationId",
    "expenseId",
    "date",
    "value",
    "paymentMethod",
    "document",
    "cashEntryId",
    "createdById",
    "createdAt"
)
SELECT
    md5(random()::text || clock_timestamp()::text || e."id"),
    e."churchId",
    e."congregationId",
    e."id",
    COALESCE(e."paidAt", e."paymentDate", e."date"),
    e."value",
    e."paymentMethod",
    e."document",
    c."id",
    e."paidById",
    COALESCE(e."paidAt", e."paymentDate", e."date")
FROM "expenses" e
LEFT JOIN LATERAL (
    SELECT ce."id"
    FROM "cash_entries" ce
    WHERE ce."sourceType" = 'SAIDA' AND ce."sourceId" = e."id"
    ORDER BY ce."createdAt" ASC
    LIMIT 1
) c ON TRUE
WHERE e."status" = 'PAGO';

