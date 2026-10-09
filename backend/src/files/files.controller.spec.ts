// ================================================================================================
// Fichier : files.controller.spec.ts
// Rôle : Tests unitaires de FilesController (Vitest : npm test).
//   FilesService est remplacé par une doublure : on vérifie que le guichet transmet au service
//   l'identifiant tiré du JETON (request.user.sub) et les données reçues (fichier, filtre, id).
// Utilise :
//   - files.controller.ts (la pièce testée), files.service.ts (remplacé par la doublure)
//   - storage.service.ts (doublure vide : nécessaire au filtre du téléversement déclaré sur la route)
//   - @nestjs/jwt (JwtService, doublure vide : nécessaire à la garde déclarée sur le contrôleur)
// Utilisé par :
//   - Vitest (vitest.config.ts)
// ================================================================================================
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import { FilesController } from './files.controller.js';
import type { UploadFileDto } from './dto/upload-file.dto.js';
import { FilesService } from './files.service.js';
import { StorageService } from './storage.service.js';

describe('FilesController', () => {
  let controller: FilesController;
  const filesService = {
    create: vi.fn(),
    findForUser: vi.fn(),
    remove: vi.fn(),
  };
  // Requête telle que la garde JWT la laisse passer : l'utilisateur n° 7 est connecté
  const request = {
    user: { sub: 7, email: 'claire@mail.fr' },
  } as AuthenticatedRequest;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [
        { provide: FilesService, useValue: filesService },
        { provide: JwtService, useValue: {} },
        { provide: StorageService, useValue: {} },
      ],
    }).compile();
    controller = module.get<FilesController>(FilesController);
  });

  it("list transmet l'identifiant du jeton et le filtre au service", async () => {
    const reponse = [{ id: 1 }];
    filesService.findForUser.mockResolvedValue(reponse);

    expect(await controller.list(request, { status: 'expired' })).toBe(reponse);
    expect(filesService.findForUser).toHaveBeenCalledWith(7, 'expired');
  });

  it("upload transmet l'identifiant du jeton, le fichier et les champs au service", async () => {
    const fichier = { originalname: 'photo.jpg' } as Express.Multer.File;
    const dto: UploadFileDto = { expiresInDays: 3, tags: ['photos'] };
    const reponse = { id: 12, token: 'jeton' };
    filesService.create.mockResolvedValue(reponse);

    expect(await controller.upload(request, fichier, dto)).toBe(reponse);
    expect(filesService.create).toHaveBeenCalledWith(7, fichier, dto);
  });

  it("remove transmet l'identifiant du jeton et le numéro du fichier au service", async () => {
    filesService.remove.mockResolvedValue(undefined);

    await controller.remove(request, 12);

    expect(filesService.remove).toHaveBeenCalledWith(7, 12);
  });
});
