import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Impresion3d } from './pages/impresion3d/impresion3d';
import { PapeleriaCreativa } from './pages/papeleria-creativa/papeleria-creativa';
import { Sublimacion } from './pages/sublimacion/sublimacion';
import { Catalogo } from './pages/catalogo/catalogo';
import { AdminLogin } from './admin/admin-login';
import { AdminDashboard } from './admin/admin-dashboard';
import { adminGuard } from './core/admin.guard';

export const routes: Routes = [
  {
    path: '',
    component: Home,
  },
  {
    path: 'impresion-3d',
    component: Impresion3d,
  },
  {
    path: 'papeleria-creativa',
    component: PapeleriaCreativa,
  },
  {
    path: 'sublimacion',
    component: Sublimacion,
  },
  {
    path: 'catalogo',
    component: Catalogo,
  },
  {
    path: 'admin/login',
    component: AdminLogin,
  },
  {
    path: 'admin',
    component: AdminDashboard,
    canActivate: [adminGuard],
  },
];
