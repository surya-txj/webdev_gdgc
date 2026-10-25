export class AppError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const errors = {
  unauthenticated: () => new AppError(401, 'UNAUTHENTICATED', 'Please log in to continue.'),
  forbidden: () => new AppError(403, 'FORBIDDEN', "You don't have access to do that."),
  notFound: () => new AppError(404, 'NOT_FOUND', "We couldn't find that."),
  validation: (details) => new AppError(400, 'VALIDATION_ERROR', 'Please check the highlighted fields.', details),
  server: () => new AppError(500, 'SERVER_ERROR', 'Something went wrong. Please try again.')
};

export function mapDatabaseError(error) {
  const message = error?.message || '';
  const code = error?.code;
  if (message.includes('PAINTING_SOLD')) return new AppError(409, 'PAINTING_SOLD', 'Sorry — this painting was just bought by someone else.');
  if (message.includes('PAINTING_NOT_FOUND')) return errors.notFound();
  if (message.includes('ORDER_NOT_FOUND')) return errors.notFound();
  if (message.includes('ORDER_ALREADY_CANCELLED')) return new AppError(409, 'INVALID_STATUS', "This can't be changed anymore — its status has already been updated.");
  if (code === '23505') return new AppError(409, 'DATE_TAKEN', 'That date was just booked by someone else. Please pick another date.');
  return error;
}

export function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}
