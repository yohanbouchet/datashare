// ================================================================================================
// Fichier : upload-file.dto.spec.ts
// Rôle : Tests unitaires des règles de UploadFileDto (Vitest : npm test) : on transforme des champs
//   « tels que reçus en multipart » (tout est texte) puis on les valide, comme le fait le ValidationPipe.
// Utilise :
//   - upload-file.dto.ts (la pièce testée), class-transformer (plainToInstance), class-validator (validate)
// Utilisé par :
//   - Vitest (vitest.config.ts)
// ================================================================================================
// reflect-metadata : nécessaire aux décorateurs (@Type…) hors de NestJS (normalement chargé par Nest)
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UploadFileDto } from './upload-file.dto.js';

// Transforme puis valide ; renvoie le DTO obtenu et la liste des messages d'erreur
async function check(fields: Record<string, unknown>) {
  const dto = plainToInstance(UploadFileDto, fields);
  const errors = await validate(dto);
  const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
  return { dto, messages };
}

describe('UploadFileDto', () => {
  it('applique les valeurs par défaut : 7 jours, pas de mot de passe, aucun tag', async () => {
    const { dto, messages } = await check({});

    expect(messages).toEqual([]);
    expect(dto.expiresInDays).toBe(7);
    expect(dto.password).toBeUndefined();
    expect(dto.tags).toEqual([]);
  });

  it('convertit la durée reçue en texte et accepte 1 à 7 jours', async () => {
    for (const duration of ['1', '7']) {
      const { dto, messages } = await check({ expiresInDays: duration });
      expect(messages).toEqual([]);
      expect(typeof dto.expiresInDays).toBe('number');
    }
  });

  it('refuse une durée de 0, 8 ou non entière', async () => {
    for (const duration of ['0', '8', '2.5', 'abc']) {
      const { messages } = await check({ expiresInDays: duration });
      expect(messages).toContain(
        "La durée d'expiration doit être comprise entre 1 et 7 jours",
      );
    }
  });

  it('refuse un mot de passe de moins de 6 caractères et traite un champ vide comme absent', async () => {
    expect((await check({ password: 'abc' })).messages).toContain(
      'Le mot de passe du fichier doit contenir au moins 6 caractères',
    );
    const empty = await check({ password: '' });
    expect(empty.messages).toEqual([]);
    expect(empty.dto.password).toBeUndefined();
  });

  it('transforme un tag unique en liste et retire les espaces et les tags vides', async () => {
    expect((await check({ tags: ' photos ' })).dto.tags).toEqual(['photos']);
    expect((await check({ tags: ['a', ' ', 'b'] })).dto.tags).toEqual([
      'a',
      'b',
    ]);
  });

  it('refuse un tag de plus de 30 caractères, un doublon et plus de 10 tags', async () => {
    const eleven = Array.from({ length: 11 }, (_, i) => `tag${i}`);

    expect((await check({ tags: ['x'.repeat(31)] })).messages).toContain(
      'Un tag ne doit pas dépasser 30 caractères',
    );
    expect((await check({ tags: ['a', 'a'] })).messages).toContain(
      'Un même tag ne peut pas être ajouté deux fois',
    );
    expect((await check({ tags: eleven })).messages).toContain(
      'Un fichier peut avoir au plus 10 tags',
    );
  });
});
