// Test unitaire d'exemple du contrôleur (généré par NestJS, exécuté par Vitest avec "npm test").
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;

  // Avant chaque test : on crée un mini-module avec seulement le contrôleur et son service,
  // sans base de données ni serveur HTTP (c'est ce qui en fait un test "unitaire").
  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    // On appelle directement la méthode et on vérifie le résultat attendu avec expect(...).toBe(...).
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
