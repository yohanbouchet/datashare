// =============================================================================
// Fichier : download.controller.spec.ts
// Rôle : Tests unitaires de DownloadController (Vitest : npm test).
//   DownloadService et la réponse HTTP sont remplacés par des doublures : on
//   vérifie la délégation et les en-têtes du téléchargement (type, nom en
//   UTF-8, « attachment »).
// Utilise :
//   - download.controller.ts (la pièce testée), download.service.ts (doublure)
// Utilisé par :
//   - Vitest (vitest.config.ts)
// =============================================================================
import { StreamableFile } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { Readable } from 'node:stream';
import { DownloadController } from './download.controller.js';
import { DownloadService } from './download.service.js';

describe('DownloadController', () => {
  let controller: DownloadController;
  const downloadService = {
    getInfo: vi.fn(),
    verify: vi.fn(),
    open: vi.fn(),
  };
  // Fausse réponse Express : on note les en-têtes posés par le contrôleur
  const response = { type: vi.fn(), setHeader: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DownloadController],
      providers: [{ provide: DownloadService, useValue: downloadService }],
    }).compile();
    controller = module.get<DownloadController>(DownloadController);
  });

  it('getInfo transmet le jeton au service', async () => {
    const info = { originalName: 'photo.jpg' };
    downloadService.getInfo.mockResolvedValue(info);

    expect(await controller.getInfo('jeton')).toBe(info);
    expect(downloadService.getInfo).toHaveBeenCalledWith('jeton');
  });

  it('verify transmet le jeton et le mot de passe au service', async () => {
    await controller.verify('jeton', { password: 'secret1' });

    expect(downloadService.verify).toHaveBeenCalledWith('jeton', 'secret1');
  });

  it('download envoie le fichier en flux, à enregistrer sous son nom exact (UTF-8)', async () => {
    downloadService.open.mockResolvedValue({
      file: { originalName: 'compte-rendu été.txt', size: 18 },
      stream: Readable.from(['contenu']),
    });

    const result = await controller.download(
      'jeton',
      { password: 'secret1' },
      response as unknown as Response,
    );

    expect(downloadService.open).toHaveBeenCalledWith('jeton', 'secret1');
    expect(response.type).toHaveBeenCalledWith('.txt');
    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="compte-rendu ete.txt"; ' +
        "filename*=UTF-8''compte-rendu%20%C3%A9t%C3%A9.txt",
    );
    expect(result).toBeInstanceOf(StreamableFile);
  });
});
