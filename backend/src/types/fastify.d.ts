import '@fastify/jwt';
import 'fastify';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; email: string; role: 'ADMIN' | 'EDITOR'; name: string };
    user: { sub: string; email: string; role: 'ADMIN' | 'EDITOR'; name: string };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: import('fastify').preHandlerHookHandler;
    requireAdmin: import('fastify').preHandlerHookHandler;
  }
}
