// ================================================================================================
// Fichier : auth.service.spec.ts
// Rôle : Tests unitaires de AuthService – inscription (US03) (Vitest : npm test).
//   UsersService est remplacé par une doublure (mock) : pas de base de données.
//   Cas testés : voir le plan de tests docs/qualite/TESTING.md.
// Utilise :
//   - auth.service.ts (la pièce testée)
//   - users/users.service.ts (UsersService, remplacé par la doublure)
//   - bcrypt (pour vérifier que l'empreinte correspond au mot de passe)
// Utilisé par :
//   - Vitest (vitest.config.ts)
// ================================================================================================
import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  let service: AuthService;

  // Doublure de UsersService : vi.fn() crée une fausse fonction dont on choisit la réponse
  // dans chaque test, et qui enregistre comment elle a été appelée.
  const usersService = { findByEmail: vi.fn(), create: vi.fn() };
  const dto = { email: 'claire@mail.fr', password: 'motdepasse8' };
  const createdAt = new Date('2026-10-08T08:00:00Z');

  beforeEach(async () => {
    // Remet les doublures à zéro : un test ne doit jamais dépendre du précédent.
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        // "Quand AuthService demande UsersService, donne-lui la doublure."
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('crée le compte et renvoie id, email et createdAt, sans empreinte', async () => {
      usersService.findByEmail.mockResolvedValue(null); // email libre
      // La doublure renvoie un utilisateur qui CONTIENT passwordHash, comme le vrai save()
      usersService.create.mockImplementation(
        (email: string, passwordHash: string) =>
          Promise.resolve({ id: 1, email, passwordHash, createdAt }),
      );

      const result = await service.register(dto);

      expect(result).toEqual({ id: 1, email: 'claire@mail.fr', createdAt });
      // 🔒 L'empreinte ne doit jamais sortir du service
      expect(result).not.toHaveProperty('passwordHash');
    });

    it("hache le mot de passe avant de l'enregistrer", async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue({
        id: 1,
        email: dto.email,
        createdAt,
      });

      await service.register(dto);

      // On récupère ce qui a été transmis à create() : [email, empreinte]
      const [, passwordHash] = usersService.create.mock.calls[0] as [
        string,
        string,
      ];
      // 🔒 Ce n'est pas le mot de passe en clair…
      expect(passwordHash).not.toBe(dto.password);
      // …mais bien une empreinte bcrypt qui correspond à ce mot de passe
      expect(await bcrypt.compare(dto.password, passwordHash)).toBe(true);
    });

    it('refuse un email déjà utilisé (409) sans créer de compte', async () => {
      usersService.findByEmail.mockResolvedValue({ id: 1, email: dto.email });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('renvoie aussi 409 si la base refuse un doublon simultané (erreur 23505)', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockRejectedValue({ code: '23505' });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('laisse remonter les autres erreurs de la base', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockRejectedValue(new Error('Base indisponible'));

      await expect(service.register(dto)).rejects.toThrow('Base indisponible');
    });
  });
});
