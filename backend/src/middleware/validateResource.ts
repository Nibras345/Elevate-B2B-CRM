import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, ZodError } from 'zod';

/**
 * Generic Request Validation Middleware using Zod
 * Validates request body, query parameters, and route parameters against a Zod schema.
 * Returns 400 Bad Request with formatted validation error messages if validation fails.
 */
export const validateResource = (schema: ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const isWrappedSchema =
        typeof (schema as any)?.shape === 'object' &&
        ('body' in (schema as any).shape ||
          'query' in (schema as any).shape ||
          'params' in (schema as any).shape);

      if (isWrappedSchema) {
        const parsed: any = await schema.parseAsync({
          body: req.body,
          query: req.query,
          params: req.params,
        });

        if (parsed.body !== undefined) req.body = parsed.body;
        if (parsed.query !== undefined) {
          try {
            req.query = parsed.query;
          } catch {
            // Ignore if req.query is getter-only in certain Express setups
          }
        }
        if (parsed.params !== undefined) {
          try {
            req.params = parsed.params;
          } catch {
            // Ignore if req.params is getter-only in certain Express setups
          }
        }
      } else {
        const parsed: any = await schema.parseAsync(req.body);
        req.body = parsed;
      }

      next();
    } catch (error: any) {
      if (error instanceof ZodError || error?.name === 'ZodError') {
        const issues = (error as any).issues || (error as any).errors || [];
        const formattedErrors = issues.map((err: any) => {
          const fieldPath = Array.isArray(err.path)
            ? err.path.join('.').replace(/^(body|query|params)\.?/, '')
            : String(err.path || '');

          return {
            field: fieldPath || 'input',
            message: err.message,
            code: err.code,
          };
        });

        res.status(400).json({
          success: false,
          message: formattedErrors[0]?.message || 'Input validation failed. Please check provided data.',
          errors: formattedErrors,
        });
        return;
      }

      next(error);
    }
  };
};

export default validateResource;
