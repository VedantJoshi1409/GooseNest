-- CreateTable
CREATE TABLE "Faculty" (
    "name" TEXT NOT NULL,

    CONSTRAINT "Faculty_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "Course" (
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "facultyName" TEXT NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "CoursePrereq" (
    "courseCode" TEXT NOT NULL,
    "prereqCode" TEXT NOT NULL,

    CONSTRAINT "CoursePrereq_pkey" PRIMARY KEY ("courseCode","prereqCode")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Requirement" (
    "id" SERIAL NOT NULL,
    "templateId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Requirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseGroup" (
    "requirementId" INTEGER NOT NULL,
    "courseCode" TEXT NOT NULL,

    CONSTRAINT "CourseGroup_pkey" PRIMARY KEY ("requirementId","courseCode")
);

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_facultyName_fkey" FOREIGN KEY ("facultyName") REFERENCES "Faculty"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoursePrereq" ADD CONSTRAINT "CoursePrereq_courseCode_fkey" FOREIGN KEY ("courseCode") REFERENCES "Course"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoursePrereq" ADD CONSTRAINT "CoursePrereq_prereqCode_fkey" FOREIGN KEY ("prereqCode") REFERENCES "Course"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseGroup" ADD CONSTRAINT "CourseGroup_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseGroup" ADD CONSTRAINT "CourseGroup_courseCode_fkey" FOREIGN KEY ("courseCode") REFERENCES "Course"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
