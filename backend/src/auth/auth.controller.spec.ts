// ================================================================================================
// Fichier : auth.controller.spec.ts
// Rôle : Tests unitaires de AuthController (Vitest : npm test) : register, login, getMe.
//   AuthService est remplacé par une doublure : on vérifie que le contrôleur transmet la demande
//   au service et renvoie sa réponse, sans logique propre.
// Utilise :
//   - auth.controller.ts (la pièce testée)
//   - auth.service.ts (AuthService, remplacé par la doublure)
// Utilisé par :
//   - Vitest (vitest.config.ts)
// ================================================================================================
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import type { AuthenticatedRequest } from './jwt-auth.guard.js';

describe('AuthController', () => {
  let controller: AuthController;
  const authService = { register: vi.fn(), login: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        // La garde JWT de la route /me a besoin de JwtService : on fournit une doublure vide
        // (la garde elle-même est testée dans jwt-auth.guard.spec.ts).
        { provide: JwtService, useValue: {} },
      ],
    }).compile();
    controller = module.get<AuthController>(AuthController);
  });

  it('register transmet les données au service et renvoie sa réponse', async () => {
    const dto = { email: 'claire@mail.fr', password: 'motdepasse8' };
    const response = { id: 1, email: dto.email, createdAt: new Date() };
    authService.register.mockResolvedValue(response);

    expect(await controller.register(dto)).toBe(response);
    expect(authService.register).toHaveBeenCalledWith(dto);
  });

  it('login transmet les identifiants au service et renvoie sa réponse', async () => {
    const dto = { email: 'claire@mail.fr', password: 'motdepasse8' };
    const response = {
      accessToken: 'jeton',
      user: { id: 1, email: dto.email },
    };
    authService.login.mockResolvedValue(response);

    expect(await controller.login(dto)).toBe(response);
    expect(authService.login).toHaveBeenCalledWith(dto);
  });

  it("getMe renvoie l'utilisateur rangé dans la requête par la garde", () => {
    const request = {
      user: { sub: 1, email: 'claire@mail.fr' },
    } as AuthenticatedRequest;

    expect(controller.getMe(request)).toEqual({
      id: 1,
      email: 'claire@mail.fr',
    });
  });
});
