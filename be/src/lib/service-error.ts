/**
 * A failure a service reports to whoever called it — an HTTP route or an MCP
 * tool. Carries the status and the machine-readable code an `ApiError` body
 * needs, so neither caller has to translate it.
 */
export class ServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const notFound = (message: string) => new ServiceError(404, 'not_found', message);

export const invalidInput = (message: string) => new ServiceError(400, 'invalid_input', message);
