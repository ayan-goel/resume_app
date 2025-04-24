import axios from 'axios';

// Create an axios instance with default config
const api = axios.create({
  baseURL: 'https://gtakpsi-resume-app-backend.org',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to attach the auth token to requests
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage if we're in a browser context
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized errors (token expired, etc.)
    if (error.response && error.response.status === 401) {
      // Check if the failed request was NOT the login request
      if (error.config.url !== '/auth/login') {
        // Clear token and redirect to login if we're in a browser context
        if (typeof window !== 'undefined') {
          console.log('Interceptor: Unauthorized, redirecting to login');
          localStorage.removeItem('token');
          removeCookie('token'); // Assuming removeCookie is defined from previous step
          window.location.href = '/auth/login'; // Redirect to the correct login page
        }
      }
    }
    // For login errors, just reject the promise so the calling function can handle it
    return Promise.reject(error);
  }
);

// Auth-related API calls
export const authAPI = {
  login: (email, password) => 
    api.post('/auth/login', { email, password }),
  
  register: (userData) => 
    api.post('/auth/register', userData),
  
  getCurrentUser: () => 
    api.get('/auth/me'),
};

// Resume-related API calls
export const resumeAPI = {
  upload: (formData) => api.post('/resumes', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  getAll: (params) => api.get('/resumes/search', { params }),
  getFilters: () => api.get('/resumes/filters'),
  getById: (id) => api.get(`/resumes/${id}`),
  create: (resumeData, file) => {
    const formData = new FormData();
    
    // Add resume metadata if provided
    if (resumeData) {
      Object.keys(resumeData).forEach(key => {
        if (resumeData[key]) {
          formData.append(key, resumeData[key]);
        }
      });
    }
    
    // Add the PDF file
    formData.append('file', file);
    
    return api.post('/resumes', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  update: (id, resumeData) => 
    api.put(`/resumes/${id}`, resumeData),
  delete: (id) => 
    api.delete(`/resumes/${id}`),
  deleteAll: () =>
    api.delete('/resumes/all/delete'),
};

// Companies-related API calls
export const companyAPI = {
  getAll: () => 
    api.get('/companies'),
  
  create: (name) => 
    api.post('/companies', { name }),
};

// Keywords-related API calls
export const keywordAPI = {
  getAll: () => 
    api.get('/keywords'),
  
  create: (name) => 
    api.post('/keywords', { name }),
};

export default api; 