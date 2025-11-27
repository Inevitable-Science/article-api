import z from "zod";


export const JwtBody = z.object({
  userId: z.string(),
});

export type JwtBodyType = z.infer<typeof JwtBody>