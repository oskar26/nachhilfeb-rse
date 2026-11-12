import { route, type RouteConfig } from '@react-router/dev/routes';

export default [
  route('docs/*', 'routes/docs.tsx'),
  route('api/search', 'routes/search.ts'),
  route('*', 'routes/not-found.tsx'),
] satisfies RouteConfig;
