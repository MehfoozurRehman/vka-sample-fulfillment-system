import { toast } from 'sonner';

export default function toastError(error: unknown) {
  if (error instanceof Error) {
    const errorMessage = error.message.split(' at ')[0].split('Error: ')[1] || error.message;
    toast.error(errorMessage);
  } else if (typeof error === 'string') {
    toast.error(error);
  } else {
    toast.error('An unexpected error occurred');
  }
}
