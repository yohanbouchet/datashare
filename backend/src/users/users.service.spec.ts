// ================================================================================================
// Fichier : users.service.spec.ts
// Rôle : Tests unitaires de UsersService (Vitest : npm test).
//   Le Repository TypeORM est remplacé par une doublure (mock) : aucun accès à la base de données.
// Utilise :
//   - users.service.ts (la pièce testée)
//   - user.entity.ts (User, pour l'étiquette du Repository)
// Utilisé par :
//   - Vitest (vitest.config.ts)
// ================================================================================================
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './user.entity.js';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  let service: UsersService;

  // Doublure du Repository : seules les méthodes utilisées par le service.
  const repository = { findOneBy: vi.fn(), create: vi.fn(), save: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        // getRepositoryToken(User) : l'"étiquette" sous laquelle NestJS range le Repository de User.
        { provide: getRepositoryToken(User), useValue: repository },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
  });

  it('findByEmail cherche le compte par son email', async () => {
    const user = { id: 1, email: 'claire@mail.fr' };
    repository.findOneBy.mockResolvedValue(user);

    expect(await service.findByEmail('claire@mail.fr')).toBe(user);
    expect(repository.findOneBy).toHaveBeenCalledWith({
      email: 'claire@mail.fr',
    });
  });

  it("create prépare puis enregistre le compte avec l'empreinte", async () => {
    const draft = { email: 'claire@mail.fr', passwordHash: '$2b$12$empreinte' };
    repository.create.mockReturnValue(draft);
    repository.save.mockResolvedValue({ id: 1, ...draft });

    const saved = await service.create('claire@mail.fr', '$2b$12$empreinte');

    expect(repository.create).toHaveBeenCalledWith(draft);
    expect(repository.save).toHaveBeenCalledWith(draft);
    expect(saved.id).toBe(1);
  });
});
