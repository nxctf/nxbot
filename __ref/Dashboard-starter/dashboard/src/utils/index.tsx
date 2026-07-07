import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { User } from '../interfaces/models/user';

export const API_URL = `https://reqres.in/api`;
export const REQRES_API_KEY = import.meta.env.VITE_REQRES_API_KEY ?? '';

export const getMissingReqresApiKeyMessage = () => {
  if (import.meta.env.PROD) {
    return 'Missing ReqRes API key. Add VITE_REQRES_API_KEY in your hosting provider environment variables, then redeploy the app.';
  }

  return 'Missing ReqRes API key. Add VITE_REQRES_API_KEY to dashboard/.env and restart the dev server.';
};

export const getUserAvatarUrl = (
  user: Pick<User, 'id' | 'first_name' | 'last_name' | 'email'>,
) => {
  const name =
    `${user.first_name} ${user.last_name}`.trim() || user.email || 'User';
  const background = CONFIG.theme.accentColor.replace('#', '');

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${background}&color=fff&size=128&bold=true`;
};

export const normalizeUser = (user: User): User => ({
  ...user,
  avatar: getUserAvatarUrl(user),
});

export enum NotificationType {
  ERROR = 'error',
  SUCCESS = 'success',
}

export const setPageTitle = (title: string) => {
  window.document.title = title;
};

export const showNotification = (
  message = 'Something went wrong',
  type: NotificationType = NotificationType.ERROR,
  description?: string,
) => {
  toast[type](message, {
    description: description,
  });
};

export const handleErrorResponse = (
  error: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  callback?: () => void,
  errorMessage?: string,
) => {
  console.error(error);

  if (!errorMessage) {
    errorMessage = 'Something went wrong';

    if (typeof error === 'string') {
      try {
        error = JSON.parse(error);
      } catch {
        // do nothing
      }
    }

    if (error instanceof AxiosError && error?.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error instanceof AxiosError && error?.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error?.message) {
      errorMessage = error.message;
    }
  }

  showNotification(
    errorMessage &&
      errorMessage.charAt(0).toUpperCase() + errorMessage.slice(1),
    NotificationType.ERROR,
  );

  if (callback) {
    return callback();
  }
};
