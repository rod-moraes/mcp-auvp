export class AuvpConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuvpConfigError";
  }
}

export class AuvpApiError extends Error {
  readonly status?: number;
  readonly url?: string;
  readonly responseBody?: string;

  constructor(
    message: string,
    options: {
      status?: number;
      url?: string;
      responseBody?: string;
      cause?: unknown;
    } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "AuvpApiError";
    this.status = options.status;
    this.url = options.url;
    this.responseBody = options.responseBody;
  }
}
