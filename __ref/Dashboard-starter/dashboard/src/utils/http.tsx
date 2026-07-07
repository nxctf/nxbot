import { Store } from '@reduxjs/toolkit';
import axios, { InternalAxiosRequestConfig } from 'axios';
import { RootState } from '../store';
import { logout } from '../store/slices/adminSlice';
import { REQRES_API_KEY } from './index';

let store: Store;

export const injectStore = (_store: Store) => {
  store = _store;
};

const attachReqresHeaders = (config: InternalAxiosRequestConfig) => {
  if (REQRES_API_KEY) {
    config.headers['x-api-key'] = REQRES_API_KEY;
  }

  return config;
};

export const defaultHttp = axios.create();
defaultHttp.interceptors.request.use(attachReqresHeaders);

const http = axios.create();

http.interceptors.request.use(
  (config) => {
    attachReqresHeaders(config);

    const state: RootState = store.getState();
    const apiToken = state.admin?.token;

    if (apiToken) {
      config.headers.Authorization = `Bearer ${apiToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

http.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error?.response?.status === 401) {
      store.dispatch(logout());
    }
    return Promise.reject(error);
  },
);

export default http;
