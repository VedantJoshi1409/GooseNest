import { prisma } from "../prisma";

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
