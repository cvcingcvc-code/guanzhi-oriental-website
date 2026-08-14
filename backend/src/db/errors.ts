type ErrorLike = {
  name?: unknown;
  message?: unknown;
  code?: unknown;
  severity?: unknown;
  cause?: unknown;
};

const unavailableCodes = new Set([
  '57P01',
  '57P02',
  '57P03',
  '53300',
  '53400',
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'EPIPE',
  'ETIMEDOUT',
]);

const unavailableMessages = [
  'connection terminated',
  'connection timeout',
  'connection refused',
  'connect econnrefused',
  'getaddrinfo enotfound',
  'server closed the connection unexpectedly',
];

function errorChain(error: unknown) {
  const chain: ErrorLike[] = [];
  const seen = new Set<unknown>();
  let current: unknown = error;

  while (current && typeof current === 'object' && !seen.has(current) && chain.length < 10) {
    seen.add(current);
    const candidate = current as ErrorLike;
    chain.push(candidate);
    current = candidate.cause;
  }

  return chain;
}

export function isDatabaseUnavailableError(error: unknown) {
  return errorChain(error).some((candidate) => {
    const code = typeof candidate.code === 'string' ? candidate.code.toUpperCase() : '';
    if (code.startsWith('08') || unavailableCodes.has(code)) return true;

    const message = typeof candidate.message === 'string' ? candidate.message.toLowerCase() : '';
    return unavailableMessages.some((fragment) => message.includes(fragment));
  });
}

export function databaseErrorMetadata(error: unknown) {
  const chain = errorChain(error);
  const code = chain.map((candidate) => candidate.code).find((value): value is string => typeof value === 'string');
  const severity = chain.map((candidate) => candidate.severity).find((value): value is string => typeof value === 'string');
  const name = chain.map((candidate) => candidate.name).find((value): value is string => typeof value === 'string');

  return {
    ...(name ? { name } : {}),
    ...(code ? { code } : {}),
    ...(severity ? { severity } : {}),
  };
}
