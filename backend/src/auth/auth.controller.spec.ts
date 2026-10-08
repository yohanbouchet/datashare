// ================================================================================================
// Fichier : auth.controller.spec.ts
// Rôle : Tests unitaires de AuthController (Vitest : npm test).
//   AuthService est remplacé par une doublure : on vérifie que le contrôleur transmet la demande
//   au service et renvoie sa réponse, sans logique propre.
// Utilise :
//   - auth.controller.ts (la pièce testée)
//   - auth.service.ts (AuthService, remplacé par la doublure)
// Utilisé par :
//   - Vitest (vitest.config.ts)
// ================================================================================================
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

describe('AuthController', () => {
  let controller: AuthController;
  const authService = { register: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
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
});
