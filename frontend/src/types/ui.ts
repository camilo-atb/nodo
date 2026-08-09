/**
 * Tipos de UI propios — NO duplican @nodo/contracts.
 * Aquí van estados de formulario, opciones de filtro, etc.
 */

export type GraphFilter = {
  showPersons: boolean;
  showTeams: boolean;
  showSkills: boolean;
};

export type MarketplaceTab = 'people' | 'teams' | 'ideas' | 'feed';
