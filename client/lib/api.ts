import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';
import { File, TypeFolder, ApiErrorResponse } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
});

export const register = async (username: string, email: string, password: string) => {
  try {
    const response = await api.post('/auth/register', { username, email, password });
    toast.success('Registration successful!');
    return response.data;
  } catch (error) {
    const err = error as AxiosError<ApiErrorResponse>;
    toast.error(err.response?.data?.message || 'Registration failed');
    throw err;
  }
};

export const login = async (identifier: string, password: string) => {
  try {
    const response = await api.post('/auth/login', { identifier, password });
    toast.success('Logged in successfully!');
    return response.data;
  } catch (error) {
    const err = error as AxiosError<ApiErrorResponse>;
    toast.error(err.response?.data?.message || 'Login failed');
    throw err;
  }
};

export const googleLogin = async (token: string) => {
  try {
    const response = await api.post('/auth/google', { token });
    toast.success('Google login successful!');
    return response.data;
  } catch (error) {
    const err = error as AxiosError<ApiErrorResponse>;
    toast.error(err.response?.data?.message || 'Google login failed');
    throw err;
  }
};

export const refreshAccessToken = async (refreshToken: string): Promise<string> => {
  try {
    const response = await api.post<{ accessToken: string }>('/auth/refresh-token', { refreshToken });
    return response.data.accessToken;
  } catch (error) {
    const err = error as AxiosError<ApiErrorResponse>;
    toast.error(err.response?.data?.message || 'Failed to refresh token');
    throw err;
  }
};

export const logout = async (refreshToken: string) => {
  try {
    const response = await api.post('/auth/logout', { refreshToken });
    toast.success('Logged out successfully!');
    return response.data;
  } catch (error) {
    const err = error as AxiosError<ApiErrorResponse>;
    toast.error(err.response?.data?.message || 'Logout failed');
    throw err;
  }
};

export const uploadFile = async (
  formData: FormData,
  accessToken: string,
  config?: AxiosRequestConfig
): Promise<void> => {
  try {
    await api.post('/files/upload', formData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'multipart/form-data',
      },
      ...config,
    });
    toast.success('File uploaded successfully!');
  } catch (error) {
    const err = error as AxiosError<ApiErrorResponse>;
    toast.error(err.response?.data?.message || 'File upload failed');
    throw err;
  }
};

export const fetchFiles = async (
  accessToken: string,
  folderId: string | null,
  page: number = 1,
  limit: number = 20,
  fileTypeFilter: string = 'all'
): Promise<(File | TypeFolder)[]> => {
  try {
    const response = await api.get<{ files: File[]; folders: TypeFolder[] }>('/files', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: { folderId, page, limit, fileTypeFilter },
    });
    return [...response.data.folders, ...response.data.files];
  } catch (error) {
    const err = error as AxiosError<ApiErrorResponse>;
    toast.error(err.response?.data?.message || 'Failed to fetch files');
    throw err;
  }
};

export const fetchRecentFiles = async (
  accessToken: string,
  limit: number = 10,
  fileTypeFilter: string = 'all'
): Promise<(File | TypeFolder)[]> => {
  try {
    console.log('Fetching recent files with URL:', `${API_URL}/files/recent?limit=${limit}&fileTypeFilter=${fileTypeFilter}`);
    console.log('Access Token:', accessToken ? 'Present' : 'Missing');
    const response = await api.get<(File | TypeFolder)[]>('/files/recent', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { limit, fileTypeFilter },
    });
    console.log('Recent files response:', response.data);
    return response.data;
  } catch (error) {
    const err = error as AxiosError<ApiErrorResponse>;
    console.error('Error fetching recent files:', {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
    });
    toast.error(err.response?.data?.message || 'Failed to fetch recent files');
    throw err;
  }
};

export const fetchFile = async (id: string, accessToken: string) => {
  try {
    const response = await api.get(`/files/${id}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  } catch (error) {
    const err = error as AxiosError<ApiErrorResponse>;
    toast.error(err.response?.data?.message || 'Failed to fetch file');
    throw err;
  }
};

export const downloadFile = async (id: string, accessToken: string): Promise<{ url: string; filename: string }> => {
  try {
    const response = await api.get<{ url: string; filename: string; originalFilename: string }>(`/files/export/${id}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    toast.success('File ready for download!');
    return {
      url: response.data.url,
      filename: response.data.originalFilename || response.data.filename,
    };
  } catch (error) {
    const err = error as AxiosError<ApiErrorResponse>;
    toast.error(err.response?.data?.message || 'File download failed');
    throw err;
  }
};

export const deleteFile = async (id: string, accessToken: string): Promise<void> => {
  try {
    await api.delete(`/files/${id}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    toast.success('File deleted successfully!');
  } catch (error) {
    const err = error as AxiosError<ApiErrorResponse>;
    toast.error(err.response?.data?.message || 'File deletion failed');
    throw err;
  }
};

export const createFolder = async (name: string, parentId: string | null, accessToken: string): Promise<TypeFolder> => {
  try {
    const response = await api.post<TypeFolder>('files/folders', { name, parentId }, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    toast.success('Folder created successfully!');
    return response.data;
  } catch (error) {
    const err = error as AxiosError<ApiErrorResponse>;
    toast.error(err.response?.data?.message || 'Folder creation failed');
    throw err;
  }
};

export const deleteFolder = async (id: string, accessToken: string): Promise<void> => {
  try {
    await api.delete(`files/folders/${id}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    toast.success('Folder deleted successfully!');
  } catch (error) {
    const err = error as AxiosError<ApiErrorResponse>;
    toast.error(err.response?.data?.message || 'Folder deletion failed');
    throw err;
  }
};