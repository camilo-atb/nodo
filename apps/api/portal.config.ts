import { allow, block, defineConfig } from '@portalsdk/config';
import type { ApplicationDTO, SuggestionDTO } from '@nodo/contracts';

/**
 * Owner: backend (docs/03). Se despliega con `portal deploy` ([08](../../docs/08-operations.md)).
 *
 * Dos diferencias con el boceto de docs/03, descubiertas al escribir esto
 * contra el paquete real `@portalsdk/config` (0.2.1) en vez de a mano:
 *
 * 1. `access: 'authz'` es **obligatorio y explícito** en ambos canales.
 *    Omitirlo hace que `anonymous: false` caiga al default `'membership'`,
 *    que bloquea a todo el mundo con `not_member` **antes** de que `authz`
 *    llegue a ejecutarse — el callback nunca decidiría nada.
 * 2. El canal no se identifica con `ctx.channelId` sino con `ctx.channel.id`
 *    (`ChannelRef` trae también `key` y `mode`).
 *
 * Los clientes no publican cambios de dominio directamente en Portal.
 */
export default defineConfig({
  webhooks: {
    url: 'https://nodo-ixvi.onrender.com/v1/portal/webhooks',
  },

  // Sin bloque `auth`: los tokens los acuña Portal (ADR-016). Declararlo
  // significaría "verifico los que yo emito", y eso exige que Portal alcance
  // nuestro JWKS por internet — imposible con el backend en localhost.

  channels: {
    'event-*': {
      anonymous: false,
      access: 'authz',

      authz: (ctx) => {
        if (ctx.claims.anon) return block('Crea tu perfil para entrar.');
        const eventId = ctx.channel.id.slice('event-'.length);
        const events = ctx.claims.events as string[] | undefined;
        if (!events?.includes(eventId)) return block('No estás suscrito a este evento.');
        return allow({ publish: false, sendDirect: false });
      },

      notify: (ctx) => {
        if (ctx.message.type !== 'match.suggested') return null;
        const { suggestion } = ctx.message.content as { suggestion: SuggestionDTO };
        return {
          title: `Encaje con ${suggestion.teamName}`,
          data: suggestion,
          to: [suggestion.personId],
        };
      },
    },

    'network-main': {
      anonymous: false,
      access: 'authz',
      // Canal legado: bloquear también impide leer su historial global.
      authz: () => block('Usa el canal privado del evento.'),
    },

    'team-*': {
      anonymous: false,
      access: 'authz',

      // Solo miembros y solicitantes con solicitud activa.
      authz: (ctx) => {
        if (ctx.claims.anon) return block('Crea tu perfil para entrar.');
        const teamId = ctx.channel.id.slice('team-'.length);
        const teamsClaim = ctx.claims.teams as Record<string, string> | undefined;
        const role = teamsClaim?.[teamId];
        if (!role) return block('No perteneces a este equipo.');
        return allow({ publish: false, sendDirect: false, isMember: role === 'member' });
      },

      notify: (ctx) => {
        if (ctx.message.type !== 'application.created' && ctx.message.type !== 'application.resolved') {
          return null;
        }
        const { application } = ctx.message.content as { application: ApplicationDTO };

        if (ctx.message.type === 'application.created') {
          return {
            title: `${application.person.displayName} quiere unirse a ${application.teamName}`,
            data: application,
            to: [application.leadId],
          };
        }

        return {
          title:
            application.status === 'accepted'
              ? `Te uniste a ${application.teamName}`
              : `Solicitud resuelta en ${application.teamName}`,
          data: application,
          to: [application.person.id],
        };
      },
    },
  },
});
