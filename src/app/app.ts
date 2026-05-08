import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent, NavItem } from './shared/components/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly navItems: NavItem[] = [
    { label: 'Cargar Plan',          route: '/cargar-plan',        icon: '📂', highlighted: true },
    { label: 'Biblioteca de Planes', route: '/biblioteca',         icon: '📚' },
    { label: 'Búsqueda RAG',         route: '/busqueda-raag',      icon: '🔍' },
    { label: 'Base de Conocimiento', route: '/base-conocimiento',  icon: '⚡' },
  ];
}
