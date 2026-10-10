// =============================================================================
// Fichier : app.controller.spec.ts
// Rôle : Test unitaire d'exemple PROVISOIRE (généré par NestJS) du contrôleur
//   AppController. Vérifie que GET /api renvoie « Hello World! ». Exécuté par
//   Vitest (npm test).
// Utilise :
//   - app.controller.ts, app.service.ts : les pièces testées
// Utilisé par :
//   - Vitest (vitest.config.ts)
// =============================================================================
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;

  // Avant chaque test : on crée un mini-module avec seulement le contrôleur et
  // son service, sans base de données ni serveur HTTP (c'est ce qui en fait un
  // test "unitaire").
  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    // On appelle directement la méthode et on vérifie le résultat attendu avec
    // expect(...).toBe(...).
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
