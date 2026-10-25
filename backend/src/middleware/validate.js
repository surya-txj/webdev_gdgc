import { errors } from '../utils/errors.js';

export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.reduce((acc, issue) => {
        const key = issue.path.join('.') || 'form';
        acc[key] = issue.message;
        return acc;
      }, {});
      return next(errors.validation(details));
    }
    req[source] = result.data;
    return next();
  };
}
