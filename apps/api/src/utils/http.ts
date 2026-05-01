import type { FastifyRequest } from "fastify";

export function requireUser(request: FastifyRequest) {
  if (!request.currentUser) {
    throw new Error("Authenticated user missing");
  }
  return request.currentUser;
}
