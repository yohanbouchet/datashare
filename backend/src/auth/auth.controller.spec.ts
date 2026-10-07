// Test unitaire du AuthController (généré par NestJS) : vérifie que le contrôleur est bien créé.
// La validation des données (DTO) sera testée de bout en bout, avec de vraies requêtes HTTP (tests e2e).
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller.js';

describe('AuthController', () => {
  let controller: AuthController;

  // Avant chaque test : mini-module contenant uniquement le contrôleur.
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
