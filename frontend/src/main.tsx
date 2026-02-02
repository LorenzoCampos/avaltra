import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools' // Comentado para producción
import { ErrorBoundary } from '@/components/ErrorBoundary'
import './i18n' // Inicializar i18next
import './index.css'
import App from './App.tsx'

// Configuración de React Query con error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos
      throwOnError: false, // No tirar errores a error boundary (manejamos con state)
    },
    mutations: {
      retry: false,
      throwOnError: false, // Manejamos errores con toast
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
        {/* {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />} */}
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
