// ================================================================================================
// Fichier : files.controller.spec.ts
// Rôle : Tests unitaires de FilesController (Vitest : npm test).
//   FilesService est remplacé par une doublure : on vérifie que le guichet transmet au service
//   l'identifiant tiré du JETON (request.user.sub) et le filtre demandé.
// Utilise :
//   - files.controller.ts (la pièce testée), files.service.ts (remplacé par la doublure)
//   - @nestjs/jwt (JwtService, doublure vide : nécessaire à la garde déclarée sur le contrôleur)
// Utilisé par :
//   - Vitest (vitest.config.ts)
// ================================================================================================
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import { FilesController } from './files.controller.js';
import { FilesService } from './files.service.js';

describe('FilesController', () => {
  let controller: FilesController;
  const filesService = { findForUser: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [
        { provide: FilesService, useValue: filesService },
        { provide: JwtService, useValue: {} },
      ],
    }).compile();
    controller = module.get<FilesController>(FilesController);
  });

  it("list transmet l'identifiant du jeton et le filtre au service", async () => {
    const reponse = [{ id: 1 }];
    filesService.findForUser.mockResolvedValue(reponse);
    const request = {
      user: { sub: 7, email: 'claire@mail.fr' },
    } as AuthenticatedRequest;

    expect(await controller.list(request, { status: 'expired' })).toBe(reponse);
    expect(filesService.findForUser).toHaveBeenCalledWith(7, 'expired');
  });
});
