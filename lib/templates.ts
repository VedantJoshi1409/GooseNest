import { prisma } from "./prisma";

export async function getTemplateWithRequirements(id: number) {
  return prisma.template.findUnique({
    where: { id },
    include: {
      requirements: {
        include: {
          courseGroup: {
            include: {
              links: {
                include: { course: true },
              },
            },
          },
        },
      },
    },
  });
}

export async function getAllTemplates() {
  return prisma.template.findMany({ select: { id: true, name: true } });
}
