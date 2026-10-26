-- Novos perfis de acesso da EBD.
ALTER TYPE "UserRoleName" ADD VALUE IF NOT EXISTS 'SUPERINTENDENTE_EBD';
ALTER TYPE "UserRoleName" ADD VALUE IF NOT EXISTS 'SECRETARIA_EBD';
ALTER TYPE "UserRoleName" ADD VALUE IF NOT EXISTS 'PROFESSOR_EBD';

-- Vinculo entre o professor da EBD e o usuario de acesso ao sistema.
ALTER TABLE "ebd_teachers" ADD COLUMN "userId" TEXT;

CREATE UNIQUE INDEX "ebd_teachers_userId_key" ON "ebd_teachers"("userId");

ALTER TABLE "ebd_teachers"
  ADD CONSTRAINT "ebd_teachers_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
