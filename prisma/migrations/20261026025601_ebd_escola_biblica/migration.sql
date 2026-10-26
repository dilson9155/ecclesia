-- CreateEnum
CREATE TYPE "EbdQuarterStatus" AS ENUM ('ABERTO', 'FECHADO');

-- CreateTable
CREATE TABLE "ebd_classes" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "congregationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ageRange" TEXT,
    "maxStudents" INTEGER NOT NULL DEFAULT 30,
    "status" "GenericStatus" NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ebd_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ebd_students" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ebd_students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ebd_teachers" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ebd_teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ebd_teacher_classes" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,

    CONSTRAINT "ebd_teacher_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ebd_quarters" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "EbdQuarterStatus" NOT NULL DEFAULT 'ABERTO',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ebd_quarters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ebd_lessons" (
    "id" TEXT NOT NULL,
    "quarterId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "date" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ebd_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ebd_attendances" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "quarterId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ebd_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ebd_attendance_entries" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT false,
    "lessonScore" INTEGER NOT NULL DEFAULT 0,
    "participationScore" INTEGER NOT NULL DEFAULT 0,
    "bibleScore" INTEGER NOT NULL DEFAULT 0,
    "offeringScore" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "ebd_attendance_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ebd_classes_churchId_status_idx" ON "ebd_classes"("churchId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ebd_classes_congregationId_name_key" ON "ebd_classes"("congregationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ebd_students_memberId_key" ON "ebd_students"("memberId");

-- CreateIndex
CREATE INDEX "ebd_students_classId_active_idx" ON "ebd_students"("classId", "active");

-- CreateIndex
CREATE INDEX "ebd_students_churchId_active_idx" ON "ebd_students"("churchId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "ebd_teachers_memberId_key" ON "ebd_teachers"("memberId");

-- CreateIndex
CREATE INDEX "ebd_teachers_churchId_active_idx" ON "ebd_teachers"("churchId", "active");

-- CreateIndex
CREATE INDEX "ebd_teacher_classes_classId_idx" ON "ebd_teacher_classes"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "ebd_teacher_classes_teacherId_classId_key" ON "ebd_teacher_classes"("teacherId", "classId");

-- CreateIndex
CREATE INDEX "ebd_quarters_churchId_startDate_idx" ON "ebd_quarters"("churchId", "startDate");

-- CreateIndex
CREATE INDEX "ebd_lessons_classId_idx" ON "ebd_lessons"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "ebd_lessons_quarterId_classId_number_key" ON "ebd_lessons"("quarterId", "classId", "number");

-- CreateIndex
CREATE INDEX "ebd_attendances_classId_date_idx" ON "ebd_attendances"("classId", "date");

-- CreateIndex
CREATE INDEX "ebd_attendances_quarterId_date_idx" ON "ebd_attendances"("quarterId", "date");

-- CreateIndex
CREATE INDEX "ebd_attendances_churchId_date_idx" ON "ebd_attendances"("churchId", "date");

-- CreateIndex
CREATE INDEX "ebd_attendance_entries_studentId_idx" ON "ebd_attendance_entries"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ebd_attendance_entries_attendanceId_studentId_key" ON "ebd_attendance_entries"("attendanceId", "studentId");

-- AddForeignKey
ALTER TABLE "ebd_classes" ADD CONSTRAINT "ebd_classes_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ebd_classes" ADD CONSTRAINT "ebd_classes_congregationId_fkey" FOREIGN KEY ("congregationId") REFERENCES "congregations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ebd_students" ADD CONSTRAINT "ebd_students_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ebd_students" ADD CONSTRAINT "ebd_students_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ebd_students" ADD CONSTRAINT "ebd_students_classId_fkey" FOREIGN KEY ("classId") REFERENCES "ebd_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ebd_teachers" ADD CONSTRAINT "ebd_teachers_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ebd_teachers" ADD CONSTRAINT "ebd_teachers_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ebd_teacher_classes" ADD CONSTRAINT "ebd_teacher_classes_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "ebd_teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ebd_teacher_classes" ADD CONSTRAINT "ebd_teacher_classes_classId_fkey" FOREIGN KEY ("classId") REFERENCES "ebd_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ebd_quarters" ADD CONSTRAINT "ebd_quarters_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ebd_lessons" ADD CONSTRAINT "ebd_lessons_quarterId_fkey" FOREIGN KEY ("quarterId") REFERENCES "ebd_quarters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ebd_lessons" ADD CONSTRAINT "ebd_lessons_classId_fkey" FOREIGN KEY ("classId") REFERENCES "ebd_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ebd_attendances" ADD CONSTRAINT "ebd_attendances_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ebd_attendances" ADD CONSTRAINT "ebd_attendances_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "ebd_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ebd_attendances" ADD CONSTRAINT "ebd_attendances_quarterId_fkey" FOREIGN KEY ("quarterId") REFERENCES "ebd_quarters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ebd_attendances" ADD CONSTRAINT "ebd_attendances_classId_fkey" FOREIGN KEY ("classId") REFERENCES "ebd_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ebd_attendances" ADD CONSTRAINT "ebd_attendances_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ebd_attendance_entries" ADD CONSTRAINT "ebd_attendance_entries_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "ebd_attendances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ebd_attendance_entries" ADD CONSTRAINT "ebd_attendance_entries_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "ebd_students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
