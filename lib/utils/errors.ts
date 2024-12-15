import { toast } from 'sonner';
import { AUTH_ERRORS } from './constants';

export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export function handleError(error: unknown) {
  console.error('Error:', error);

  if (error instanceof APIError) {
    switch (error.code) {
      case AUTH_ERRORS.TOKEN_EXPIRED:
        toast.error('Your session has expired. Please sign in again.');
        // Redirect to sign in
        break;
      case AUTH_ERRORS.UNAUTHORIZED:
        toast.error('You are not authorized to perform this action.');
        break;
      default:
        toast.error(error.message);
    }
  } else {
    toast.error('An unexpected error occurred. Please try again.');
  }
}